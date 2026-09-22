const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/database');
const { verifyCertificateTamper } = require('../services/cryptoService');
const { dispatchWebhook } = require('../services/webhookService');

let stampedCertMap = null;
let stampedPreviewMap = null;
function getStampedPdfUrl(certNumber) {
  try {
    if (!stampedCertMap) {
      const resultsPath = path.join(__dirname, '../../data/stamping_results.json');
      if (fs.existsSync(resultsPath)) {
        const list = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        stampedCertMap = {};
        stampedPreviewMap = {};
        list.forEach(item => {
          if (item.public_pdf && item.public_pdf.includes('public')) {
            const rel = item.public_pdf.split('public')[1].replace(/\\/g, '/');
            stampedCertMap[item.cert_number] = rel;
            stampedPreviewMap[item.cert_number] = rel.replace('.pdf', '.png');
          }
        });
      }
    }
    return (stampedCertMap && stampedCertMap[certNumber]) || null;
  } catch (e) {
    return null;
  }
}

function getStampedPreviewUrl(certNumber) {
  getStampedPdfUrl(certNumber);
  return (stampedPreviewMap && stampedPreviewMap[certNumber]) || null;
}

exports.verifyCertificate = (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Certificate identifier is required' });
    }

    const cleanId = identifier.trim();
    const normalizedHyphenId = cleanId.replace(/\s+/g, '-');
    const upperId = normalizedHyphenId.toUpperCase();

    // Query certificate by public_id, cert_number, or internal id with flexible matching
    const cert = db.prepare(`
      SELECT c.*, COALESCE(c.type_name, ct.name) as type_name, ct.slug as type_slug
      FROM certificates c
      LEFT JOIN certificate_types ct ON c.type_id = ct.id
      WHERE c.public_id = ? OR c.cert_number = ? OR c.id = ?
         OR UPPER(c.cert_number) = ? OR UPPER(c.cert_number) = ?
    `).get(cleanId, cleanId, cleanId, upperId, cleanId.toUpperCase());

    // Get club settings for official verification branding
    const clubRows = db.prepare(`
      SELECT key, value FROM club_settings 
      WHERE key IN (
        'club_name', 'club_abbr', 'club_logo', 'official_website_url', 
        'homepage_url', 'contact_email', 'contact_phone', 'club_address',
        'reg_number', 'president_name', 'secretary_name', 'official_seal'
      )
    `).all();

    const club = {};
    clubRows.forEach(r => {
      try {
        club[r.key] = JSON.parse(r.value);
      } catch (e) {
        club[r.key] = r.value;
      }
    });

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!cert) {
      // Log failed search
      db.prepare(`
        INSERT INTO verification_logs (id, certificate_id, query_term, ip_address, user_agent, status_returned, tamper_detected)
        VALUES (?, NULL, ?, ?, ?, 'not_found', 0)
      `).run('vlog_' + crypto.randomBytes(6).toString('hex'), cleanId, ipAddress, userAgent);

      return res.status(404).json({
        success: false,
        status: 'not_found',
        status_text: 'Certificate Not Found',
        message: 'No official club certificate exists matching this identifier.',
        club
      });
    }

    // Tamper detection check
    const tamperCheck = verifyCertificateTamper(cert);
    const tamperDetected = !tamperCheck.isValid;

    // Determine status text
    let statusText = 'VERIFIED AND VALID';
    let isValid = true;

    if (tamperDetected) {
      statusText = 'TAMPER DETECTED / INVALID';
      isValid = false;
    } else if (cert.status === 'revoked') {
      statusText = 'CERTIFICATE REVOKED';
      isValid = false;
    } else if (cert.status === 'superseded') {
      statusText = 'CERTIFICATE SUPERSEDED';
      isValid = false;
    } else if (cert.status === 'pending_approval') {
      statusText = 'PENDING OFFICIAL APPROVAL';
      isValid = false;
    } else if (cert.status === 'suspended') {
      statusText = 'CERTIFICATE SUSPENDED';
      isValid = false;
    } else if (cert.status === 'expired') {
      statusText = 'CERTIFICATE EXPIRED';
      isValid = false;
    }

    // Log verification
    db.prepare(`
      INSERT INTO verification_logs (id, certificate_id, query_term, ip_address, user_agent, status_returned, tamper_detected)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'vlog_' + crypto.randomBytes(6).toString('hex'),
      cert.id,
      cleanId,
      ipAddress,
      userAgent,
      cert.status,
      tamperDetected ? 1 : 0
    );

    // Parse privacy settings
    let privacy = { show_member_id: true, show_position: true, show_score: false };
    try {
      if (cert.privacy_settings) {
        privacy = JSON.parse(cert.privacy_settings);
      }
    } catch (e) {}

    // Dispatch webhook
    dispatchWebhook('certificate.verified', {
      certNumber: cert.cert_number,
      status: cert.status,
      tamperDetected,
      verifiedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      status: cert.status,
      status_badge: statusText,
      is_valid: isValid && !tamperDetected && cert.status === 'issued',
      tamper_check: {
        matches_record: !tamperDetected,
        message: tamperCheck.message
      },
      verification_timestamp: new Date().toISOString(),
      club: {
        name: club.club_name || 'AI Student Chapters',
        abbr: club.club_abbr || 'AISC',
        logo: club.club_logo || '/assets/club-logo.webp',
        official_website_url: club.official_website_url || process.env.OFFICIAL_CLUB_WEBSITE_URL || 'https://imrdaisc.vercel.app/',
        homepage_url: club.homepage_url || club.official_website_url,
        reg_number: club.reg_number || '',
        president_name: club.president_name || '',
        seal: club.official_seal || ''
      },
      certificate: {
        id: cert.id,
        public_id: cert.public_id,
        cert_number: cert.cert_number,
        type_name: cert.type_name,
        recipient_name: cert.recipient_name,
        recipient_display_name: cert.recipient_display_name || cert.recipient_name,
        recipient_photo: cert.recipient_photo || null,
        member_id: privacy.show_member_id ? cert.member_id : null,
        membership_status: cert.membership_status,
        position_held: privacy.show_position ? cert.position_held : null,
        department: cert.department,
        award_title: cert.award_title,
        achievement_text: cert.achievement_text,
        event_name: cert.event_name,
        event_year: cert.event_year,
        event_date: cert.event_date,
        location: cert.location,
        membership_start: cert.membership_start,
        membership_end: cert.membership_end,
        issue_date: cert.issue_date,
        issued_by: cert.issued_by,
        approver_name: cert.approver_name,
        approver_title: cert.approver_title,
        approver_signature: cert.approver_signature,
        secondary_approver_name: cert.secondary_approver_name,
        secondary_approver_title: cert.secondary_approver_title,
        theme: cert.theme || 'classic_gold',
        superseded_by: cert.superseded_by,
        supersede_reason: cert.supersede_reason,
        revoke_reason: cert.revoke_reason,
        revoked_at: cert.revoked_at,
        created_at: cert.created_at,
        approved_at: cert.approved_at,
        qr_data: cert.qr_data,
        barcode_data: cert.barcode_data,
        verification_url: cert.verification_url,
        pdf_url: cert.pdf_url || getStampedPdfUrl(cert.cert_number),
        preview_url: cert.preview_url || getStampedPreviewUrl(cert.cert_number) || (cert.pdf_url ? cert.pdf_url.replace('.pdf', '.png') : null)
      }
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
