const crypto = require('crypto');
const db = require('../config/database');
const { generateCertificateNumber } = require('../services/numberingService');
const { generateTamperHash } = require('../services/cryptoService');
const { generateQRCode, generateBarcodeSVG } = require('../services/qrBarcodeService');
const { dispatchWebhook } = require('../services/webhookService');
const { logAudit } = require('../middleware/auth');
const { generateOfficialCertificateDocument } = require('../services/officialTemplateService');

function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return 'https://certificate-generator-production-dfb2.up.railway.app';
}

// Create a new certificate
exports.createCertificate = async (req, res) => {
  try {
    const data = req.body;
    if (!data.recipient_name || !data.achievement_text || !data.issue_date) {
      return res.status(400).json({ success: false, error: 'Recipient name, achievement statement, and issue date are required' });
    }

    const id = 'cert_' + crypto.randomBytes(6).toString('hex');
    const publicId = crypto.randomBytes(8).toString('hex');
    
    // Get type slug
    let typeSlug = 'general';
    let typeName = data.type_name || 'Certificate';
    if (data.type_id) {
      const typeRow = db.prepare('SELECT slug, name FROM certificate_types WHERE id = ?').get(data.type_id);
      if (typeRow) {
        typeSlug = typeRow.slug;
        typeName = typeRow.name;
      }
    }

    // Get club prefix from settings
    const prefixSetting = db.prepare("SELECT value FROM club_settings WHERE key = 'club_abbr'").get();
    const clubPrefix = prefixSetting ? prefixSetting.value : 'CLUB';

    const certNumber = data.cert_number || generateCertificateNumber({
      prefix: clubPrefix,
      year: data.event_year || new Date().getFullYear(),
      typeSlug: typeSlug,
      deptCode: data.department ? data.department.substring(0, 3) : ''
    });

    const baseUrl = getBaseUrl(req);
    const verificationUrl = `${baseUrl}/verify/${publicId}`;

    // Generate QR and Barcode
    const qrData = await generateQRCode(verificationUrl);
    const barcodeObj = generateBarcodeSVG(certNumber);

    // Compute cryptographic tamper hash
    const certRecord = {
      cert_number: certNumber,
      recipient_name: data.recipient_name,
      type_name: typeName,
      award_title: data.award_title || '',
      achievement_text: data.achievement_text,
      event_name: data.event_name || '',
      event_year: data.event_year || new Date().getFullYear(),
      issue_date: data.issue_date,
      approver_name: data.approver_name || '',
      member_id: data.member_id || ''
    };
    const tamperHash = generateTamperHash(certRecord);

    const initialStatus = data.status || (req.user && ['superadmin', 'approver'].includes(req.user.role) ? 'issued' : 'pending_approval');

    // Generate authentic official stamped PDF and preview PNG
    let pdfUrl = null;
    let previewUrl = null;
    try {
      const isGrad = (data.template_type || typeSlug || '').toLowerCase().includes('grad') ||
                     (data.type_name || typeName || '').toLowerCase().includes('appreciation');
      const genResult = await generateOfficialCertificateDocument({
        template_type: isGrad ? 'graduating' : 'hiring',
        recipient_name: data.recipient_name,
        position: data.position_held || 'Member',
        class_info: data.department || data.class_info || 'MCA (Int.) - III',
        tenure: data.notes?.includes('Tenure') ? data.notes.split('|')[0].replace('Tenure:', '').trim() : 'AY 2026-27',
        date: data.issue_date || '19 September 2026',
        cert_number: certNumber,
        verification_url: verificationUrl
      });
      if (genResult && genResult.success) {
        pdfUrl = genResult.pdf_url;
        previewUrl = genResult.preview_url;
      }
    } catch (genErr) {
      console.warn('Official document generation warning:', genErr.message);
    }

    db.prepare(`
      INSERT INTO certificates (
        id, public_id, cert_number, recipient_id, recipient_name, recipient_display_name,
        recipient_email, recipient_photo, member_id, membership_status, position_held, department,
        type_id, type_name, award_title, achievement_text, event_name, event_year, event_date,
        location, membership_start, membership_end, position_start, position_end, result_rank,
        score, category, issue_date, issued_by, approver_name, approver_title, approver_signature,
        secondary_approver_name, secondary_approver_title, secondary_approver_signature,
        template_id, theme, notes, status, privacy_settings, qr_data, barcode_data,
        verification_url, tamper_hash, pdf_url, preview_url, created_by, approved_by, approved_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      id, publicId, certNumber, data.recipient_id || null, data.recipient_name, data.recipient_display_name || null,
      data.recipient_email || null, data.recipient_photo || null, data.member_id || null, data.membership_status || null, data.position_held || null, data.department || null,
      data.type_id || 'typ_general', typeName, data.award_title || null, data.achievement_text, data.event_name || null, data.event_year || new Date().getFullYear(), data.event_date || null,
      data.location || null, data.membership_start || null, data.membership_end || null, data.position_start || null, data.position_end || null, data.result_rank || null,
      data.score || null, data.category || null, data.issue_date, data.issued_by || (req.user ? req.user.full_name : null), data.approver_name || null, data.approver_title || null, data.approver_signature || null,
      data.secondary_approver_name || null, data.secondary_approver_title || null, data.secondary_approver_signature || null,
      data.template_id || null, data.theme || 'classic_gold', data.notes || null, initialStatus,
      JSON.stringify(data.privacy_settings || { show_member_id: true, show_position: true, show_score: false }),
      qrData, barcodeObj.svg, verificationUrl, tamperHash, pdfUrl, previewUrl, req.user ? req.user.id : 'system',
      initialStatus === 'issued' ? (req.user ? req.user.id : 'system') : null,
      initialStatus === 'issued' ? new Date().toISOString() : null
    );

    // If pending approval, create approval ticket
    if (initialStatus === 'pending_approval') {
      db.prepare(`
        INSERT INTO approvals (id, certificate_id, requested_by, status)
        VALUES (?, ?, ?, 'pending')
      `).run('appr_' + crypto.randomBytes(6).toString('hex'), id, req.user ? req.user.id : 'system');
    }

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'CREATE_CERTIFICATE', 'certificate', id, { certNumber, status: initialStatus }, req.ip);

    if (initialStatus === 'issued') {
      dispatchWebhook('certificate.issued', { id, certNumber, recipient: data.recipient_name, verificationUrl });
    }

    res.status(201).json({
      success: true,
      id,
      public_id: publicId,
      cert_number: certNumber,
      status: initialStatus,
      verification_url: verificationUrl,
      pdf_url: pdfUrl,
      preview_url: previewUrl,
      tamper_hash: tamperHash,
      qr_data: qrData,
      barcode_data: barcodeObj.svg
    });
  } catch (err) {
    console.error('Create cert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// List certificates with rich filtering, search, and sorting
exports.listCertificates = (req, res) => {
  try {
    const { search, status, type_id, year, sort_by, sort_order, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM certificates WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (recipient_name LIKE ? OR cert_number LIKE ? OR event_name LIKE ? OR member_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type_id) {
      query += ' AND type_id = ?';
      params.push(type_id);
    }

    if (year) {
      query += ' AND event_year = ?';
      params.push(parseInt(year, 10));
    }

    // Determine sorting field and order
    const validSortFields = {
      'cert_number': 'cert_number',
      'recipient_name': 'recipient_name',
      'issue_date': 'issue_date',
      'created_at': 'created_at',
      'status': 'status',
      'event_year': 'event_year',
      'type_name': 'type_name'
    };
    const sortField = validSortFields[sort_by] || 'cert_number';
    const sortDir = (sort_order && sort_order.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    if (sortField === 'cert_number') {
      query += ` ORDER BY cert_number ${sortDir} LIMIT ? OFFSET ?`;
    } else {
      query += ` ORDER BY ${sortField} ${sortDir}, cert_number ASC LIMIT ? OFFSET ?`;
    }
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const certificates = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM certificates WHERE 1=1';
    const countParams = params.slice(0, params.length - 2);
    if (search) countQuery += ' AND (recipient_name LIKE ? OR cert_number LIKE ? OR event_name LIKE ? OR member_id LIKE ?)';
    if (status) countQuery += ' AND status = ?';
    if (type_id) countQuery += ' AND type_id = ?';
    if (year) countQuery += ' AND event_year = ?';

    const countResult = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      certificates,
      total: countResult.total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single certificate
exports.getCertificate = (req, res) => {
  try {
    const { id } = req.params;
    let altId = id;
    if (id === 'AISC-2024-LEAD-00001') altId = 'CLUB-2024-LEAD-00001';
    else if (id === 'CLUB-2024-LEAD-00001') altId = 'AISC-2024-LEAD-00001';

    const cert = db.prepare(`
      SELECT c.*, t.name as template_name, ct.wording_template 
      FROM certificates c
      LEFT JOIN certificate_templates t ON c.template_id = t.id
      LEFT JOIN certificate_types ct ON c.type_id = ct.id
      WHERE c.id = ? OR c.public_id = ? OR c.cert_number = ? OR c.cert_number = ?
    `).get(id, id, id, altId);

    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    // Get versions
    const versions = db.prepare('SELECT * FROM certificate_versions WHERE certificate_id = ? ORDER BY version_number DESC').all(cert.id);

    res.json({ success: true, certificate: cert, versions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Revoke an issued certificate
exports.revokeCertificate = (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'A revocation reason is required' });
    }

    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    if (cert.status === 'revoked') {
      return res.status(400).json({ success: false, error: 'Certificate is already revoked' });
    }

    db.prepare(`
      UPDATE certificates SET
        status = 'revoked',
        revoked_by = ?,
        revoked_at = CURRENT_TIMESTAMP,
        revoke_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user ? req.user.id : 'system', reason, id);

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'REVOKE_CERTIFICATE', 'certificate', id, { reason }, req.ip);
    dispatchWebhook('certificate.revoked', { id, certNumber: cert.cert_number, reason });

    res.json({ success: true, message: 'Certificate revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Supersede an issued certificate with a corrected version
exports.supersedeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const reason = updates.reason || 'Information correction';

    const oldCert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!oldCert) {
      return res.status(404).json({ success: false, error: 'Original certificate not found' });
    }

    // Save snapshot in certificate_versions
    db.prepare(`
      INSERT INTO certificate_versions (id, certificate_id, version_number, cert_number, snapshot_json, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ver_' + crypto.randomBytes(6).toString('hex'),
      oldCert.id,
      oldCert.version || 1,
      oldCert.cert_number,
      JSON.stringify(oldCert),
      reason,
      req.user ? req.user.id : 'system'
    );

    // Generate new certificate number for the correction
    const prefixSetting = db.prepare("SELECT value FROM club_settings WHERE key = 'club_abbr'").get();
    const clubPrefix = prefixSetting ? prefixSetting.value : 'CLUB';
    
    const newCertNumber = generateCertificateNumber({
      prefix: clubPrefix,
      year: updates.event_year || oldCert.event_year,
      typeSlug: updates.type_id || oldCert.type_id
    });

    const newPublicId = crypto.randomBytes(8).toString('hex');
    const baseUrl = getBaseUrl(req);
    const newVerificationUrl = `${baseUrl}/verify/${newPublicId}`;
    const newQr = await generateQRCode(newVerificationUrl);
    const newBarcode = generateBarcodeSVG(newCertNumber);

    const merged = { ...oldCert, ...updates, cert_number: newCertNumber };
    const newTamperHash = generateTamperHash(merged);

    // Mark old as superseded
    db.prepare(`
      UPDATE certificates SET
        status = 'superseded',
        superseded_by = ?,
        supersede_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newCertNumber, reason, oldCert.id);

    // Create the new superseded certificate
    const newId = 'cert_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO certificates (
        id, public_id, cert_number, recipient_id, recipient_name, recipient_display_name,
        recipient_email, recipient_photo, member_id, membership_status, position_held, department,
        type_id, type_name, award_title, achievement_text, event_name, event_year, event_date,
        location, issue_date, issued_by, approver_name, approver_title, approver_signature,
        template_id, theme, notes, status, privacy_settings, qr_data, barcode_data,
        verification_url, tamper_hash, version, created_by, approved_by, approved_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'issued', ?, ?, ?,
        ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `).run(
      newId, newPublicId, newCertNumber, merged.recipient_id, merged.recipient_name, merged.recipient_display_name,
      merged.recipient_email, merged.recipient_photo, merged.member_id, merged.membership_status, merged.position_held, merged.department,
      merged.type_id, merged.type_name, merged.award_title, merged.achievement_text, merged.event_name, merged.event_year, merged.event_date,
      merged.location, merged.issue_date, merged.issued_by, merged.approver_name, merged.approver_title, merged.approver_signature,
      merged.template_id, merged.theme, merged.notes,
      merged.privacy_settings || '{}',
      newQr, newBarcode.svg, newVerificationUrl, newTamperHash,
      (oldCert.version || 1) + 1, req.user ? req.user.id : 'system', req.user ? req.user.id : 'system'
    );

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'SUPERSEDE_CERTIFICATE', 'certificate', oldCert.id, { newCertNumber, reason }, req.ip);

    res.json({
      success: true,
      message: 'Certificate superseded successfully',
      original_cert_number: oldCert.cert_number,
      new_certificate: {
        id: newId,
        public_id: newPublicId,
        cert_number: newCertNumber,
        verification_url: newVerificationUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Bulk certificate import
exports.bulkImport = async (req, res) => {
  try {
    const { items, default_event, default_year, default_type_id, auto_issue } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid items array is required' });
    }

    const baseUrl = getBaseUrl(req);
    const prefixSetting = db.prepare("SELECT value FROM club_settings WHERE key = 'club_abbr'").get();
    const clubPrefix = prefixSetting ? prefixSetting.value : 'CLUB';

    const results = [];
    const errors = [];

    const insertStmt = db.prepare(`
      INSERT INTO certificates (
        id, public_id, cert_number, recipient_name, recipient_email, member_id,
        position_held, type_id, type_name, award_title, achievement_text, event_name,
        event_year, issue_date, approver_name, approver_title, status, qr_data, barcode_data,
        verification_url, tamper_hash, created_by, approved_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.recipient_name && !item.full_name) {
        errors.push({ index: i, error: 'Recipient name missing' });
        continue;
      }

      const recName = item.recipient_name || item.full_name;
      const typeId = item.type_id || default_type_id || 'typ_participation';
      const typeRow = db.prepare('SELECT slug, name, wording_template FROM certificate_types WHERE id = ?').get(typeId);
      const typeSlug = typeRow ? typeRow.slug : 'general';
      const typeName = typeRow ? typeRow.name : 'Certificate of Participation';

      const eventName = item.event_name || default_event || 'Club Event';
      const eventYear = parseInt(item.event_year || default_year || new Date().getFullYear(), 10);
      const issueDate = item.issue_date || new Date().toISOString().split('T')[0];
      const awardTitle = item.award_title || item.result || '';

      // Auto wording
      let achievementText = item.achievement_text;
      if (!achievementText) {
        achievementText = `This certificate is proudly awarded to ${recName} in recognition of participation and excellence in ${eventName} organized in ${eventYear}.`;
      }

      const certNumber = generateCertificateNumber({
        prefix: clubPrefix,
        year: eventYear,
        typeSlug: typeSlug
      });

      const publicId = crypto.randomBytes(8).toString('hex');
      const verificationUrl = `${baseUrl}/verify/${publicId}`;
      const qrData = await generateQRCode(verificationUrl);
      const barcodeObj = generateBarcodeSVG(certNumber);

      const certRecord = {
        cert_number: certNumber,
        recipient_name: recName,
        type_name: typeName,
        award_title: awardTitle,
        achievement_text: achievementText,
        event_name: eventName,
        event_year: eventYear,
        issue_date: issueDate,
        approver_name: item.approver_name || 'Authorized Officer',
        member_id: item.member_id || ''
      };
      const tamperHash = generateTamperHash(certRecord);
      const status = auto_issue ? 'issued' : 'pending_approval';
      const id = 'cert_' + crypto.randomBytes(6).toString('hex');

      insertStmt.run(
        id, publicId, certNumber, recName, item.email || null, item.member_id || null,
        item.position || null, typeId, typeName, awardTitle, achievementText, eventName,
        eventYear, issueDate, item.approver_name || 'Authorized Officer', item.approver_title || 'Club Officer',
        status, qrData, barcodeObj.svg, verificationUrl, tamperHash, req.user ? req.user.id : 'system',
        status === 'issued' ? new Date().toISOString() : null
      );

      results.push({
        id,
        cert_number: certNumber,
        recipient_name: recName,
        status,
        verification_url: verificationUrl
      });
    }

    logAudit(req.user ? req.user.id : 'system', req.user ? req.user.email : 'system', 'BULK_IMPORT', 'certificates', `${results.length} records`, { errorsCount: errors.length }, req.ip);

    res.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      certificates: results,
      errors
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
