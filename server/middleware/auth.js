const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'club-cert-secret-key-2026';

/**
 * Middleware to authenticate requests via JWT Bearer token or API Key.
 */
function authenticate(req, res, next) {
  // Check for API Key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyParts = apiKey.split('.');
    const prefix = keyParts[0];
    const record = db.prepare('SELECT * FROM api_keys WHERE key_prefix = ? AND is_active = 1').get(prefix);
    
    if (record) {
      // Update last used
      db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
      req.user = {
        id: `api_${record.id}`,
        full_name: `API Client: ${record.name}`,
        role: 'cert_admin', // API keys have cert_admin permissions
        isApiKey: true,
        permissions: (record.permissions || '').split(',')
      };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Invalid or inactive API Key' });
  }

  // Check Bearer Token
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'User account not found or disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}

/**
 * Middleware to enforce role-based access control.
 * @param  {...string} allowedRoles 
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Superadmin has access to everything
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}` 
    });
  };
}

/**
 * Helper to log audit actions.
 */
function logAudit(userId, userEmail, action, entityType, entityId, details, ipAddress) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'aud_' + Math.random().toString(36).substring(2, 10),
      userId || 'system',
      userEmail || 'system',
      action,
      entityType,
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress || 'unknown'
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(decoded.id);
      if (user && user.is_active) {
        req.user = user;
      }
    } catch (err) {}
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  logAudit,
  JWT_SECRET
};
