const crypto = require('crypto');
const db = require('../config/database');
const { logAudit } = require('../middleware/auth');
const { dispatchWebhook } = require('../services/webhookService');

// List API keys
exports.listApiKeys = (req, res) => {
  try {
    const keys = db.prepare(`
      SELECT id, key_prefix, name, permissions, created_by, is_active, last_used_at, created_at
      FROM api_keys ORDER BY created_at DESC
    `).all();
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a new API key
exports.createApiKey = (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Key name is required' });
    }

    const prefix = 'clb_' + crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');
    const fullApiKey = `${prefix}.${secret}`;
    const hash = crypto.createHash('sha256').update(fullApiKey).digest('hex');
    const id = 'key_' + crypto.randomBytes(6).toString('hex');

    db.prepare(`
      INSERT INTO api_keys (id, key_prefix, key_hash, name, permissions, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, prefix, hash, name, permissions || 'read,verify,create', req.user ? req.user.id : 'system');

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'CREATE_API_KEY', 'api_key', id, { name }, req.ip);

    // Return the full key only once
    res.status(201).json({
      success: true,
      api_key: fullApiKey,
      id,
      name,
      message: 'Store this key safely now; you will not be able to view it again.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Revoke an API key
exports.revokeApiKey = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').run(id);
    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'REVOKE_API_KEY', 'api_key', id, {}, req.ip);
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Webhooks
exports.listWebhooks = (req, res) => {
  try {
    const hooks = db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
    res.json({ success: true, webhooks: hooks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createWebhook = (req, res) => {
  try {
    const { url, event_types, secret } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'A valid HTTP/HTTPS URL is required' });
    }

    const id = 'wh_' + crypto.randomBytes(6).toString('hex');
    const hookSecret = secret || crypto.randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO webhooks (id, url, event_types, secret, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, url, event_types || 'certificate.issued,certificate.approved,certificate.revoked,certificate.verified', hookSecret);

    res.status(201).json({ success: true, id, secret: hookSecret });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteWebhook = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.testWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const hook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
    if (!hook) return res.status(404).json({ success: false, error: 'Webhook not found' });

    await dispatchWebhook('ping', { message: 'Club Certificate Webhook Test Ping', test_id: id });
    res.json({ success: true, message: 'Test ping dispatched' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
