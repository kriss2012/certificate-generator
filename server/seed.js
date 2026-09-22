const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./config/database');
const { generateTamperHash } = require('./services/cryptoService');
const { generateQRCode, generateBarcodeSVG } = require('./services/qrBarcodeService');

async function seed() {
  console.log('Seeding database with production initial data...');

  // 1. Seed Users
  const users = [
    { id: 'usr_admin', email: 'admin@club.org', name: 'Dr. System Administrator', role: 'superadmin', pass: 'admin123' },
    { id: 'usr_manager', email: 'manager@club.org', name: 'Elena Rostova (Cert Admin)', role: 'cert_admin', pass: 'manager123' },
    { id: 'usr_approver', email: 'approver@club.org', name: 'Dr. Vaishali Patil (Approver)', role: 'approver', pass: 'approver123' },
    { id: 'usr_verifier', email: 'verifier@club.org', name: 'Officer Verifier', role: 'verifier', pass: 'verifier123' },
    { id: 'usr_viewer', email: 'viewer@club.org', name: 'Observer (Read-Only)', role: 'readonly', pass: 'viewer123' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.pass, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role
    `).run(u.id, u.email, hash, u.name, u.role);
  }
  console.log('Users seeded.');

  // 2. Official Club Settings (Section 2)
  const officialSettings = [
    ['club_name', 'AI Student Chapters'],
    ['club_abbr', 'AISC'],
    ['club_logo', '/assets/club-logo.webp'],
    ['official_website_url', process.env.OFFICIAL_CLUB_WEBSITE_URL || 'https://imrdaisc.vercel.app/'],
    ['homepage_url', 'https://imrdaisc.vercel.app/'],
    ['contact_email', 'aisc@rcpimrd.ac.in'],
    ['contact_phone', '+91 2563 272602'],
    ['club_address', "RCPET's Institute of Management Research & Development, Shirpur, Maharashtra 425405"],
    ['reg_number', 'AISC-ORG-2024-9982'],
    ['social_links', JSON.stringify({
      website: 'https://rcpimrd.ac.in',
      linkedin: 'https://linkedin.com/company/aisc-rcpimrd',
      instagram: 'https://instagram.com/aisc_rcpimrd',
      github: 'https://github.com/chiragbehere'
    })],
    ['president_name', 'Dr. Vaishali Patil'],
    ['secretary_name', 'Prof. Manoj Behere'],
    ['authorizing_officer_name', 'Director of Academic Affairs'],
    ['current_office_bearers', JSON.stringify([
      { name: 'Dr. Vaishali Patil', role: 'President' },
      { name: 'Prof. Manoj Behere', role: 'General Secretary' },
      { name: 'Chirag Behere', role: 'Technical Head & Coordinator' }
    ])],
    ['club_colors', JSON.stringify({
      primary: '#1e3a8a',
      gold: '#d97706',
      accent: '#2563eb',
      dark: '#0f172a'
    })],
    ['official_seal', '/assets/official_seal.svg'],
    ['default_event_name', 'National AI & Student Innovation Summit'],
    ['default_event_year', '2024'],
    ['default_event_location', 'AISC Central Auditorium, RCPIMRD Campus']
  ];

  const upsertSetting = db.prepare(`
    INSERT INTO club_settings (key, value, updated_by)
    VALUES (?, ?, 'system_seed')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [k, v] of officialSettings) {
    upsertSetting.run(k, v);
  }
  console.log('Club settings seeded.');

  // 3. Certificate Types (Section 3)
  const types = [
    {
      id: 'typ_winner',
      slug: 'winner',
      name: "Winner's Certificate",
      desc: 'For first-place, second-place, third-place, champion, runner-up, or special award winners.',
      wording: 'This certificate is proudly presented to [RECIPIENT_NAME] in recognition of achieving [AWARD_POSITION] in [EVENT_NAME], organized by [CLUB_NAME] in [EVENT_YEAR].'
    },
    {
      id: 'typ_appreciation',
      slug: 'appreciation',
      name: 'Certificate of Appreciation',
      desc: 'For appreciating club leaders, members, volunteers, contributors, or organizers.',
      wording: 'This Certificate of Appreciation is proudly presented to [RECIPIENT_NAME] in recognition of valuable service, dedication, and contribution to [CLUB_NAME].'
    },
    {
      id: 'typ_leadership',
      slug: 'leadership',
      name: 'Leadership Certificate',
      desc: 'For presidents, vice presidents, secretaries, treasurers, coordinators, committee members, and other postholders.',
      wording: 'This certificate confirms that [RECIPIENT_NAME] served as [POSITION_NAME] of [CLUB_NAME] during the period [START_DATE] to [END_DATE].'
    },
    {
      id: 'typ_membership',
      slug: 'membership',
      name: 'Membership Certificate',
      desc: 'To confirm that a person was an official club member during a specific period.',
      wording: 'This certificate confirms that [RECIPIENT_NAME], Member ID [MEMBER_ID], was a recognized member of [CLUB_NAME] during [MEMBERSHIP_PERIOD].'
    },
    {
      id: 'typ_participation',
      slug: 'participation',
      name: 'Certificate of Participation',
      desc: 'For people who participated in an event, program, competition, campaign, or activity.',
      wording: 'This certificate is awarded to [RECIPIENT_NAME] for successfully participating in [EVENT_NAME] organized by [CLUB_NAME] in [EVENT_YEAR].'
    },
    {
      id: 'typ_service',
      slug: 'service',
      name: 'Certificate of Service',
      desc: 'For recognizing service, dedication, commitment, or contribution to the club.',
      wording: 'This certificate honors [RECIPIENT_NAME] for commendable service and dedication to [CLUB_NAME] initiatives.'
    },
    {
      id: 'typ_special_rec',
      slug: 'special_recognition',
      name: 'Special Recognition Certificate',
      desc: 'For special achievements, outstanding contribution, long-term service, or honorary recognition.',
      wording: 'This certificate confers special recognition upon [RECIPIENT_NAME] in honor of distinguished excellence and outstanding contributions to [CLUB_NAME].'
    }
  ];

  for (const t of types) {
    db.prepare(`
      INSERT INTO certificate_types (id, slug, name, description, wording_template, is_system)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(slug) DO UPDATE SET name = excluded.name, wording_template = excluded.wording_template
    `).run(t.id, t.slug, t.name, t.desc, t.wording);
  }
  console.log('Certificate types seeded.');

  // 4. Certificate Templates (Section 6)
  const templates = [
    { id: 'tmpl_classic_gold', name: 'Classic Gold', theme: 'classic_gold', is_default: 1, primary_color: '#b45309', border: 'double_gold' },
    { id: 'tmpl_royal_blue', name: 'Royal Blue', theme: 'royal_blue', is_default: 0, primary_color: '#1e40af', border: 'geometric_blue' },
    { id: 'tmpl_elegant_green', name: 'Elegant Green', theme: 'elegant_green', is_default: 0, primary_color: '#065f46', border: 'emerald_crest' },
    { id: 'tmpl_modern_minimal', name: 'Modern Minimal', theme: 'modern_minimal', is_default: 0, primary_color: '#0f172a', border: 'minimal_line' },
    { id: 'tmpl_academic', name: 'Academic', theme: 'academic', is_default: 0, primary_color: '#431407', border: 'engraved_academic' },
    { id: 'tmpl_sports_award', name: 'Sports Award', theme: 'sports_award', is_default: 0, primary_color: '#b91c1c', border: 'sports_bold' },
    { id: 'tmpl_corporate', name: 'Corporate', theme: 'corporate', is_default: 0, primary_color: '#1e293b', border: 'corporate_clean' },
    { id: 'tmpl_traditional_ceremonial', name: 'Traditional Ceremonial', theme: 'traditional_ceremonial', is_default: 0, primary_color: '#701a75', border: 'filigree_ceremonial' }
  ];

  for (const tmpl of templates) {
    db.prepare(`
      INSERT INTO certificate_templates (id, name, theme, is_default, primary_color, border_style)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, theme = excluded.theme
    `).run(tmpl.id, tmpl.name, tmpl.theme, tmpl.is_default, tmpl.primary_color, tmpl.border);
  }
  console.log('Certificate templates seeded.');

  // 5. Sample Certificate Record from Section 24
  // Recipient: Alex Morgan
  // Club: RCPIMRD AI Student Chapters
  // Role: President
  // Membership status: Official member
  // Event: Annual Tech & AI Symposium
  // Participation year: 2024
  // Certificate type: Leadership and Participation Certificate
  // Recognition: Served as President, remained an official member, and participated in the club’s 2024 activities.
  // Certificate number: CLUB-2024-LEAD-00001
  // Verification URL: /verify/CLUB-2024-LEAD-00001

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const sampleCertNumber = 'CLUB-2024-LEAD-00001';
  const samplePublicId = 'sec24_alex_morgan';
  const sampleVerificationUrl = `${baseUrl}/verify/${sampleCertNumber}`;

  const qrData = await generateQRCode(sampleVerificationUrl);
  const barcodeData = generateBarcodeSVG(sampleCertNumber);

  const sampleCertData = {
    cert_number: sampleCertNumber,
    recipient_name: 'Alex Morgan',
    type_name: 'Leadership and Participation Certificate',
    award_title: 'Club President Honor',
    achievement_text: 'Served as President, remained an official member, and participated in the club’s 2024 activities.',
    event_name: 'Annual Tech & AI Symposium',
    event_year: 2024,
    issue_date: '2024-12-15',
    approver_name: 'Dr. Vaishali Patil',
    member_id: 'MEM-2024-001'
  };

  const tamperHash = generateTamperHash(sampleCertData);

  db.prepare(`
    INSERT INTO certificates (
      id, public_id, cert_number, recipient_name, recipient_display_name,
      member_id, membership_status, position_held, department,
      type_id, type_name, award_title, achievement_text, event_name, event_year,
      event_date, location, issue_date, issued_by,
      approver_name, approver_title, approver_signature,
      secondary_approver_name, secondary_approver_title, secondary_approver_signature,
      template_id, theme, notes, status, privacy_settings,
      qr_data, barcode_data, verification_url, tamper_hash,
      version, created_by, approved_by, approved_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, 'issued', ?,
      ?, ?, ?, ?,
      1, 'usr_admin', 'usr_approver', '2024-12-15 10:00:00'
    )
    ON CONFLICT(cert_number) DO UPDATE SET
      tamper_hash = excluded.tamper_hash,
      qr_data = excluded.qr_data,
      barcode_data = excluded.barcode_data,
      verification_url = excluded.verification_url
  `).run(
    'cert_sec24_sample', samplePublicId, sampleCertNumber, 'Alex Morgan', 'Alex Morgan',
    'MEM-2024-001', 'Official member', 'President', 'Executive Committee',
    'typ_leadership', 'Leadership and Participation Certificate', 'Club President Honor',
    sampleCertData.achievement_text, 'Annual Tech & AI Symposium', 2024,
    '2024-12-10', 'Main Campus Auditorium', '2024-12-15', 'RCPIMRD AISC Office',
    'Dr. Vaishali Patil', 'President & Approving Authority', 'Dr. V. Patil [Digital Signed]',
    'Prof. Manoj Behere', 'General Secretary', 'Prof. M. Behere [Digital Signed]',
    'tmpl_classic_gold', 'classic_gold', 'Sample certificate record per Section 24 specifications',
    JSON.stringify({ show_member_id: true, show_position: true, show_score: true }),
    qrData, barcodeData.svg, sampleVerificationUrl, tamperHash
  );

  console.log('Section 24 sample certificate created: ' + sampleCertNumber);
  console.log('Seed completed successfully.');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seed;
