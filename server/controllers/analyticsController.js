const db = require('../config/database');

exports.getDashboardStats = (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Total Issued
    const totalIssued = db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'issued'").get().c;
    
    // Total this year
    const issuedThisYear = db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'issued' AND (event_year = ? OR issue_date LIKE ?)").get(currentYear, `${currentYear}%`).c;

    // Awaiting approval
    const pendingApproval = db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'pending_approval'").get().c;

    // Revoked
    const totalRevoked = db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'revoked'").get().c;

    // Total verifications
    const totalVerifications = db.prepare("SELECT COUNT(*) as c FROM verification_logs").get().c;

    // Tamper alerts
    const tamperAlerts = db.prepare("SELECT COUNT(*) as c FROM verification_logs WHERE tamper_detected = 1").get().c;

    // Top certificate types
    const topTypes = db.prepare(`
      SELECT ct.name, COUNT(c.id) as count
      FROM certificates c
      JOIN certificate_types ct ON c.type_id = ct.id
      GROUP BY ct.id
      ORDER BY count DESC
      LIMIT 5
    `).all();

    // Recent activity (Audit logs)
    const recentActivity = db.prepare(`
      SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10
    `).all();

    // Recent verification requests
    const recentVerifications = db.prepare(`
      SELECT vl.*, c.cert_number, c.recipient_name
      FROM verification_logs vl
      LEFT JOIN certificates c ON vl.certificate_id = c.id
      ORDER BY vl.verified_at DESC LIMIT 10
    `).all();

    // Monthly issuance trend (last 6 months)
    const monthlyTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM certificates
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all().reverse();

    res.json({
      success: true,
      stats: {
        total_issued: totalIssued,
        issued_this_year: issuedThisYear,
        pending_approval: pendingApproval,
        total_revoked: totalRevoked,
        total_verifications: totalVerifications,
        tamper_alerts: tamperAlerts,
        top_types: topTypes,
        recent_activity: recentActivity,
        recent_verifications: recentVerifications,
        monthly_trend: monthlyTrend
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAuditLogs = (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(parseInt(limit, 10), parseInt(offset, 10));

    const count = db.prepare('SELECT COUNT(*) as total FROM audit_logs').get().total;

    res.json({ success: true, logs, total: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getVerificationLogs = (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = db.prepare(`
      SELECT vl.*, c.cert_number, c.recipient_name
      FROM verification_logs vl
      LEFT JOIN certificates c ON vl.certificate_id = c.id
      ORDER BY vl.verified_at DESC 
      LIMIT ? OFFSET ?
    `).all(parseInt(limit, 10), parseInt(offset, 10));

    const count = db.prepare('SELECT COUNT(*) as total FROM verification_logs').get().total;

    res.json({ success: true, logs, total: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
