const crypto = require('crypto');

/**
 * Normalizes and builds a canonical representation of certificate data for tamper-evident hashing.
 */
function buildCanonicalString(cert) {
  const fields = [
    cert.cert_number || '',
    (cert.recipient_name || '').trim().toLowerCase(),
    (cert.type_name || '').trim().toLowerCase(),
    (cert.award_title || '').trim().toLowerCase(),
    (cert.achievement_text || '').replace(/\s+/g, ' ').trim(),
    (cert.event_name || '').trim().toLowerCase(),
    String(cert.event_year || ''),
    (cert.issue_date || '').trim(),
    (cert.approver_name || '').trim().toLowerCase(),
    (cert.member_id || '').trim().toLowerCase()
  ];
  return fields.join('|#|');
}

/**
 * Generates a SHA-256 cryptographic hash of the certificate canonical fields.
 */
function generateTamperHash(cert) {
  const canonical = buildCanonicalString(cert);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Validates a certificate against its stored cryptographic tamper hash.
 */
function verifyCertificateTamper(cert) {
  if (!cert || !cert.tamper_hash) {
    return {
      isValid: false,
      reason: 'No tamper hash found on record'
    };
  }

  const computedHash = generateTamperHash(cert);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHash, 'utf8'),
    Buffer.from(cert.tamper_hash, 'utf8')
  );

  return {
    isValid,
    computedHash,
    storedHash: cert.tamper_hash,
    message: isValid
      ? 'Certificate data matches the official cryptographic record.'
      : 'Tamper warning: Certificate data does not match the stored cryptographic signature!'
  };
}

/**
 * Hashes a PDF buffer or file for document integrity verification.
 */
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  buildCanonicalString,
  generateTamperHash,
  verifyCertificateTamper,
  hashBuffer
};
