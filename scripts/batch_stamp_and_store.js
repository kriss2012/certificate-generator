const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../server/config/database');
const { generateDualVerificationBadgeSVG } = require('../server/services/qrBarcodeService');
const { generateTamperHash } = require('../server/services/cryptoService');

const BASE_URL = process.env.BASE_URL || 'https://certificate-generator-production-dfb2.up.railway.app';

// Ensure required directories exist
const outputDirs = [
  path.join(__dirname, '../stamped_certificates/Graduating Members 2026'),
  path.join(__dirname, '../stamped_certificates/Hiring AY 2026-27'),
  path.join(__dirname, '../public/stamped_certificates/Graduating Members 2026'),
  path.join(__dirname, '../public/stamped_certificates/Hiring AY 2026-27'),
  path.join(__dirname, '../data/preview')
];

outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Load extracted certificate metadata
const extractedDataPath = path.join(__dirname, '../data/extracted_certificates.json');
const extractedData = JSON.parse(fs.readFileSync(extractedDataPath, 'utf8'));

async function main() {
  const stampingJobs = [];

  console.log('================================================================');
  console.log('PREPARING CERTIFICATE RECORDS & DUAL VERIFICATION BADGES');
  console.log(`Base Verification URL: ${BASE_URL}`);
  console.log('================================================================');

  // 1. Process Graduating Members (16 certificates)
  for (let index = 0; index < extractedData.graduating.length; index++) {
    const item = extractedData.graduating[index];
    const seq = String(index + 1).padStart(5, '0');
    const certNumber = `AISC-2026-GRAD-${seq}`;
    const publicId = `pub_grad_${seq}_${crypto.randomBytes(4).toString('hex')}`;
    const certId = `cert_grad_${seq}`;
    const recipientId = `rec_grad_${seq}`;
    const verificationUrl = `${BASE_URL}/verify/${certNumber}`;

    // Generate dual verification badge (QR code with direct URL + Code 128 barcode)
    const badgeResult = await generateDualVerificationBadgeSVG(certNumber, verificationUrl, {
      width: 420,
      height: 95
    });

    const certDataForHash = {
      cert_number: certNumber,
      recipient_name: item.recipient_name,
      type_name: 'Certificate of Appreciation',
      award_title: 'Letter of Appreciation',
      achievement_text: 'in recognition of their valuable contribution, dedicated service, and active participation in the activities and initiatives of the AI Student Chapter during their tenure.',
      event_name: 'AI Student Chapter - Annual Convocation & Tenure',
      event_year: 2026,
      issue_date: '2026-09-19',
      approver_name: 'Dr. Manoj N. Behere',
      member_id: `AISC-GRAD-${seq}`
    };

    const tamperHash = generateTamperHash(certDataForHash);
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`;

    // Upsert Recipient
    db.prepare(`
      INSERT INTO recipients (
        id, full_name, display_name, email, member_id, membership_status, position_held, department, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        position_held = excluded.position_held,
        department = excluded.department
    `).run(
      recipientId,
      item.recipient_name,
      item.recipient_name,
      'imrdaistudentclub@gmail.com',
      certDataForHash.member_id,
      'Graduating Member',
      item.position,
      item.class_info
    );

    const relPdf = `/stamped_certificates/Graduating Members 2026/${item.filename}`;
    const relPng = `/stamped_certificates/Graduating Members 2026/${item.filename.replace('.pdf', '.png')}`;

    // Upsert Certificate
    db.prepare(`
      INSERT INTO certificates (
        id, public_id, cert_number, recipient_id, recipient_name, recipient_display_name,
        recipient_email, member_id, membership_status, position_held, department,
        type_id, type_name, award_title, achievement_text, event_name, event_year,
        event_date, location, issue_date, issued_by,
        approver_name, approver_title, approver_signature,
        secondary_approver_name, secondary_approver_title, secondary_approver_signature,
        template_id, theme, notes, status, privacy_settings,
        qr_data, barcode_data, verification_url, tamper_hash,
        pdf_url, preview_url,
        version, created_by, approved_by, approved_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, 'issued', ?,
        ?, ?, ?, ?,
        ?, ?,
        1, 'admin', 'Dr. Manoj N. Behere', '2026-09-19 10:00:00', datetime('now'), datetime('now')
      )
      ON CONFLICT(cert_number) DO UPDATE SET
        recipient_name = excluded.recipient_name,
        position_held = excluded.position_held,
        department = excluded.department,
        type_id = excluded.type_id,
        type_name = excluded.type_name,
        award_title = excluded.award_title,
        achievement_text = excluded.achievement_text,
        event_name = excluded.event_name,
        event_year = excluded.event_year,
        issue_date = excluded.issue_date,
        approver_name = excluded.approver_name,
        notes = excluded.notes,
        qr_data = excluded.qr_data,
        barcode_data = excluded.barcode_data,
        verification_url = excluded.verification_url,
        tamper_hash = excluded.tamper_hash,
        pdf_url = excluded.pdf_url,
        preview_url = excluded.preview_url,
        status = 'issued',
        updated_at = datetime('now')
    `).run(
      certId, publicId, certNumber, recipientId, item.recipient_name, item.recipient_name,
      'imrdaistudentclub@gmail.com', certDataForHash.member_id, 'Graduating Member', item.position, item.class_info,
      'typ_appreciation', certDataForHash.type_name, certDataForHash.award_title, certDataForHash.achievement_text,
      certDataForHash.event_name, certDataForHash.event_year,
      '2026-09-19', 'R. C. Patel IMRD, Shirpur', '2026-09-19', 'AI Student Chapters (AISC)',
      'Dr. Manoj N. Behere', 'Assistant Director, Head of MCA and MCA(Int.)', 'Dr. Manoj N. Behere [Official Signature]',
      'Dr. Vaishali B. Patil', 'Director, R. C. Patel IMRD, Shirpur', 'Dr. Vaishali B. Patil [Official Signature]',
      'tmpl_classic_gold', 'classic_gold', `Tenure: ${item.tenure} | Class: ${item.class_info}`,
      JSON.stringify({ show_member_id: true, show_position: true, show_score: false }),
      qrDataUrl, badgeResult.svg, verificationUrl, tamperHash,
      relPdf, relPng
    );

    stampingJobs.push({
      id: certId,
      cert_number: certNumber,
      recipient_name: item.recipient_name,
      category: 'Graduating Members 2026',
      input_pdf: path.resolve(__dirname, '..', item.filepath),
      output_pdf: path.resolve(__dirname, '../stamped_certificates/Graduating Members 2026', item.filename),
      public_pdf: path.resolve(__dirname, '../public/stamped_certificates/Graduating Members 2026', item.filename),
      barcode_svg: badgeResult.svg,
      barcode_rect: [1254, 670, 1674, 765] // [x0, y0, x1, y1] for Graduating
    });

    console.log(`[Graduating ${index + 1}/16] ${certNumber} -> ${item.recipient_name} (${item.position})`);
  }

  // 2. Process Hiring AY 2026-27 (12 certificates)
  for (let index = 0; index < extractedData.hiring.length; index++) {
    const item = extractedData.hiring[index];
    const seq = String(index + 1).padStart(5, '0');
    const certNumber = `AISC-2026-HIRE-${seq}`;
    const publicId = `pub_hire_${seq}_${crypto.randomBytes(4).toString('hex')}`;
    const certId = `cert_hire_${seq}`;
    const recipientId = `rec_hire_${seq}`;
    const verificationUrl = `${BASE_URL}/verify/${certNumber}`;

    // Generate dual verification badge (QR code with direct URL + Code 128 barcode)
    const badgeResult = await generateDualVerificationBadgeSVG(certNumber, verificationUrl, {
      width: 420,
      height: 95
    });

    const certDataForHash = {
      cert_number: certNumber,
      recipient_name: item.recipient_name,
      type_name: 'Membership Certificate',
      award_title: 'Offer Letter & Membership Certificate',
      achievement_text: 'We are pleased to offer you the position in the AI Student Chapter, commencing 19 September 2026, with full membership benefits and leadership opportunities.',
      event_name: 'AI Student Chapter - AY 2026-27 Induction',
      event_year: 2026,
      issue_date: '2026-09-19',
      approver_name: 'Dr. Manoj N. Behere',
      member_id: `AISC-HIRE-${seq}`
    };

    const tamperHash = generateTamperHash(certDataForHash);
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`;

    // Upsert Recipient
    db.prepare(`
      INSERT INTO recipients (
        id, full_name, display_name, email, member_id, membership_status, position_held, department, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        position_held = excluded.position_held,
        department = excluded.department
    `).run(
      recipientId,
      item.recipient_name,
      item.recipient_name,
      'imrdaistudentclub@gmail.com',
      certDataForHash.member_id,
      'Active Member',
      item.position,
      item.class_info
    );

    // Upsert Certificate
    db.prepare(`
      INSERT INTO certificates (
        id, public_id, cert_number, recipient_id, recipient_name, recipient_display_name,
        recipient_email, member_id, membership_status, position_held, department,
        type_id, type_name, award_title, achievement_text, event_name, event_year,
        event_date, location, issue_date, issued_by,
        approver_name, approver_title, approver_signature,
        secondary_approver_name, secondary_approver_title, secondary_approver_signature,
        template_id, theme, notes, status, privacy_settings,
        qr_data, barcode_data, verification_url, tamper_hash,
        version, created_by, approved_by, approved_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, 'issued', ?,
        ?, ?, ?, ?,
        1, 'admin', 'Dr. Manoj N. Behere', '2026-09-19 10:00:00', datetime('now'), datetime('now')
      )
      ON CONFLICT(cert_number) DO UPDATE SET
        recipient_name = excluded.recipient_name,
        position_held = excluded.position_held,
        department = excluded.department,
        type_id = excluded.type_id,
        type_name = excluded.type_name,
        award_title = excluded.award_title,
        achievement_text = excluded.achievement_text,
        event_name = excluded.event_name,
        event_year = excluded.event_year,
        issue_date = excluded.issue_date,
        approver_name = excluded.approver_name,
        notes = excluded.notes,
        qr_data = excluded.qr_data,
        barcode_data = excluded.barcode_data,
        verification_url = excluded.verification_url,
        tamper_hash = excluded.tamper_hash,
        status = 'issued',
        updated_at = datetime('now')
    `).run(
      certId, publicId, certNumber, recipientId, item.recipient_name, item.recipient_name,
      'imrdaistudentclub@gmail.com', certDataForHash.member_id, 'Active Member', item.position, item.class_info,
      'typ_membership', certDataForHash.type_name, certDataForHash.award_title, certDataForHash.achievement_text,
      certDataForHash.event_name, certDataForHash.event_year,
      '2026-09-19', 'R. C. Patel IMRD, Shirpur', '2026-09-19', 'AI Student Chapters (AISC)',
      'Dr. Manoj N. Behere', 'Assistant Director, Head of MCA and MCA(Int.)', 'Dr. Manoj N. Behere [Official Signature]',
      'Mr. Vishal A. Pawar', 'Assistant Professor, AI Student Chapter Coordinator', 'Mr. Vishal A. Pawar [Official Signature]',
      'tmpl_classic_gold', 'classic_gold', `Tenure: ${item.tenure} | Subject: ${item.subject || ''} | Class: ${item.class_info}`,
      JSON.stringify({ show_member_id: true, show_position: true, show_score: false }),
      qrDataUrl, badgeResult.svg, verificationUrl, tamperHash
    );

    stampingJobs.push({
      id: certId,
      cert_number: certNumber,
      recipient_name: item.recipient_name,
      category: 'Hiring AY 2026-27',
      input_pdf: path.resolve(__dirname, '..', item.filepath),
      output_pdf: path.resolve(__dirname, '../stamped_certificates/Hiring AY 2026-27', item.filename),
      public_pdf: path.resolve(__dirname, '../public/stamped_certificates/Hiring AY 2026-27', item.filename),
      barcode_svg: badgeResult.svg,
      barcode_rect: [1254, 480, 1674, 575] // [x0, y0, x1, y1] for Hiring
    });

    console.log(`[Hiring ${index + 1}/12] ${certNumber} -> ${item.recipient_name} (${item.position})`);
  }

  const jobsPath = path.join(__dirname, '../data/stamping_jobs.json');
  fs.writeFileSync(jobsPath, JSON.stringify(stampingJobs, null, 2), 'utf8');

  console.log('================================================================');
  console.log(`SUCCESS: Created ${stampingJobs.length} certificate DB records and saved jobs to ${jobsPath}`);
  console.log('================================================================');
}

main().catch(console.error);
