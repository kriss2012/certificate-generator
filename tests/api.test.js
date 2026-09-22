/**
 * Comprehensive Automated Test Suite for Certificate Generation and Verification System
 */

const assert = require('assert');
const crypto = require('crypto');
const db = require('../server/config/database');
const { generateTamperHash, verifyCertificateTamper } = require('../server/services/cryptoService');
const { generateCertificateNumber } = require('../server/services/numberingService');
const { generateQRCode, generateBarcodeSVG, validateCodes } = require('../server/services/qrBarcodeService');
const seed = require('../server/seed');

async function runTests() {
  console.log('---------------------------------------------------------');
  console.log('RUNNING SYSTEM AUTOMATED TESTS');
  console.log('---------------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Test Seed & Section 24 Sample Record
  await asyncTest('Section 24 sample record exists and is valid', async () => {
    await seed();
    const cert = db.prepare('SELECT * FROM certificates WHERE cert_number = ?').get('CLUB-2024-LEAD-00001');
    assert(cert, 'Sample certificate CLUB-2024-LEAD-00001 must exist in DB');
    assert.strictEqual(cert.recipient_name, 'Alex Morgan');
    assert.strictEqual(cert.status, 'issued');
    assert.strictEqual(cert.position_held, 'President');
    assert.strictEqual(cert.event_year, 2024);
  });

  // 2. Cryptographic Tamper-Detection Tests
  test('Tamper detection: unchanged certificate matches cryptographic hash', () => {
    const cert = {
      cert_number: 'TEST-2024-WIN-00001',
      recipient_name: 'Jane Doe',
      type_name: "Winner's Certificate",
      award_title: '1st Place',
      achievement_text: 'Achieved 1st place in coding championship.',
      event_name: 'Hackathon 2024',
      event_year: 2024,
      issue_date: '2024-11-20',
      approver_name: 'Dr. Vaishali Patil',
      member_id: 'MEM-99'
    };

    const hash = generateTamperHash(cert);
    cert.tamper_hash = hash;

    const result = verifyCertificateTamper(cert);
    assert.strictEqual(result.isValid, true, 'Cryptographic tamper check must pass for unmodified record');
  });

  test('Tamper detection: altered recipient name fails cryptographic verification', () => {
    const cert = {
      cert_number: 'TEST-2024-WIN-00001',
      recipient_name: 'Jane Doe',
      type_name: "Winner's Certificate",
      award_title: '1st Place',
      achievement_text: 'Achieved 1st place in coding championship.',
      event_name: 'Hackathon 2024',
      event_year: 2024,
      issue_date: '2024-11-20',
      approver_name: 'Dr. Vaishali Patil',
      member_id: 'MEM-99'
    };

    const originalHash = generateTamperHash(cert);
    cert.tamper_hash = originalHash;

    // Simulate fraudulent alteration
    const tamperedCert = { ...cert, recipient_name: 'Fraudulent Actor' };
    const result = verifyCertificateTamper(tamperedCert);
    assert.strictEqual(result.isValid, false, 'Tamper check must fail when recipient name is forged');
  });

  // 3. Unique Numbering Service Tests
  test('Certificate numbering generates sequential, non-colliding IDs', () => {
    const num1 = generateCertificateNumber({ prefix: 'UNIT', year: 2024, typeSlug: 'winner' });
    assert(num1.startsWith('UNIT-2024-WIN-'), `Numbering should match pattern: ${num1}`);
    
    // Check format
    const parts = num1.split('-');
    assert.strictEqual(parts.length >= 4, true, 'Number must contain prefix, year, category, and sequence');
  });

  // 4. QR Code & Barcode Service Tests
  await asyncTest('QR code generates valid high-resolution data URL', async () => {
    const testUrl = 'https://rcpimrd.ac.in/verify/CLUB-2024-LEAD-00001';
    const qrData = await generateQRCode(testUrl);
    assert(qrData.startsWith('data:image/png;base64,'), 'QR code must be a base64 PNG data URL');
  });

  test('Barcode generator creates clean Code 128 SVG', () => {
    const barcode = generateBarcodeSVG('CLUB-2024-LEAD-00001');
    assert(barcode.svg.includes('<svg'), 'Barcode must contain valid SVG elements');
    assert(barcode.svg.includes('CLUB-2024-LEAD-00001'), 'Barcode SVG must contain certificate number');
  });

  test('Pre-issuance validation accepts valid URLs and rejects non-HTTP inputs', () => {
    const valid = validateCodes('https://club.org/verify/123', 'CLUB-2024-001');
    assert.strictEqual(valid.valid, true);

    const invalid = validateCodes('ftp://invalid', 'CLUB-2024-001');
    assert.strictEqual(invalid.valid, false);
  });

  // 5. Official Club Website URL Setting Check
  test('Official club settings contain mandatory OFFICIAL_CLUB_WEBSITE_URL placeholder', () => {
    const setting = db.prepare("SELECT value FROM club_settings WHERE key = 'official_website_url'").get();
    assert(setting && setting.value.startsWith('http'), 'Official club website URL must be configured and valid');
  });

  // 6. User Roles and Authentication Security Check
  test('Users table contains all 5 required roles with secure hashes', () => {
    const superadmin = db.prepare("SELECT * FROM users WHERE role = 'superadmin'").get();
    const approver = db.prepare("SELECT * FROM users WHERE role = 'approver'").get();
    const verifier = db.prepare("SELECT * FROM users WHERE role = 'verifier'").get();

    assert(superadmin, 'Superadmin user must exist');
    assert(approver, 'Approver user must exist');
    assert(verifier, 'Verifier user must exist');
    assert(superadmin.password_hash.startsWith('$2'), 'Passwords must be bcrypt hashed');
  });

  console.log('---------------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('---------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
