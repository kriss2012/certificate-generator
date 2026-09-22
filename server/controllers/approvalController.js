const db = require('../config/database');
const { logAudit } = require('../middleware/auth');
const { dispatchWebhook } = require('../services/webhookService');

// List certificates pending approval
exports.listPendingApprovals = (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT c.*, a.id as approval_id, a.requested_by, a.created_at as request_date
      FROM certificates c
      JOIN approvals a ON c.id = a.certificate_id
      WHERE a.status = 'pending' AND c.status = 'pending_approval'
      ORDER BY a.created_at ASC
    `).all();

    res.json({ success: true, pending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Approve a certificate
exports.approveCertificate = (req, res) => {
  try {
    const { id } = req.params;
    const { comments, signature_data, approver_name, approver_title } = req.body;

    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    if (cert.status !== 'pending_approval') {
      return res.status(400).json({ success: false, error: `Certificate is not pending approval (Current status: ${cert.status})` });
    }

    const approverName = approver_name || (req.user ? req.user.full_name : 'Authorized Approver');
    const approverTitle = approver_title || 'Certificate Approver';

    // Update approval ticket
    db.prepare(`
      UPDATE approvals SET
        status = 'approved',
        approver_id = ?,
        approver_name = ?,
        comments = ?,
        signature_data = ?,
        decision_at = CURRENT_TIMESTAMP
      WHERE certificate_id = ? AND status = 'pending'
    `).run(
      req.user ? req.user.id : 'system',
      approverName,
      comments || 'Approved official certificate',
      signature_data || null,
      id
    );

    // Update certificate status to issued
    db.prepare(`
      UPDATE certificates SET
        status = 'issued',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP,
        approver_name = COALESCE(?, approver_name),
        approver_title = COALESCE(?, approver_title),
        approver_signature = COALESCE(?, approver_signature),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      req.user ? req.user.id : 'system',
      approverName,
      approverTitle,
      signature_data || null,
      id
    );

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'APPROVE_CERTIFICATE', 'certificate', id, { certNumber: cert.cert_number }, req.ip);
    dispatchWebhook('certificate.approved', { id, certNumber: cert.cert_number, approvedBy: approverName });

    res.json({
      success: true,
      message: 'Certificate approved and issued successfully',
      certificate_id: id,
      cert_number: cert.cert_number,
      status: 'issued'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Reject a certificate
exports.rejectCertificate = (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ success: false, error: 'Rejection reason/comments are required' });
    }

    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    db.prepare(`
      UPDATE approvals SET
        status = 'rejected',
        approver_id = ?,
        approver_name = ?,
        comments = ?,
        decision_at = CURRENT_TIMESTAMP
      WHERE certificate_id = ? AND status = 'pending'
    `).run(
      req.user ? req.user.id : 'system',
      req.user ? req.user.full_name : 'Approver',
      comments,
      id
    );

    db.prepare(`
      UPDATE certificates SET
        status = 'draft',
        notes = COALESCE(notes || ' | ', '') || 'Rejection feedback: ' || ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(comments, id);

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'REJECT_CERTIFICATE', 'certificate', id, { comments }, req.ip);

    res.json({
      success: true,
      message: 'Certificate rejected and returned to draft with comments',
      certificate_id: id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
