const db = require('../config/database');

// Default category codes
const CATEGORY_CODES = {
  'winner': 'WIN',
  'appreciation': 'APP',
  'leadership': 'LEAD',
  'membership': 'MEM',
  'participation': 'PAR',
  'service': 'SRV',
  'special_recognition': 'REC',
  'default': 'CERT'
};

function getCategoryCode(typeSlug) {
  if (!typeSlug) return CATEGORY_CODES.default;
  const clean = typeSlug.toLowerCase().replace(/[^a-z0-9]/g, '_');
  for (const [key, code] of Object.entries(CATEGORY_CODES)) {
    if (clean.includes(key)) return code;
  }
  return clean.substring(0, 4).toUpperCase();
}

/**
 * Generates the next sequential unique certificate number with collision protection.
 */
function generateCertificateNumber(options = {}) {
  const prefix = (options.prefix || 'CLUB').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const year = options.year || new Date().getFullYear();
  const catCode = options.categoryCode || getCategoryCode(options.typeSlug);
  const deptCode = options.deptCode ? `-${options.deptCode.toUpperCase().replace(/[^A-Z0-9]/g, '')}` : '';

  // Get current highest sequence for this prefix-year-cat pattern
  const pattern = `${prefix}-${year}-${catCode}%`;
  const existing = db.prepare(`
    SELECT cert_number FROM certificates 
    WHERE cert_number LIKE ? 
    ORDER BY cert_number DESC LIMIT 1
  `).get(pattern);

  let nextSeq = 1;
  if (existing && existing.cert_number) {
    const parts = existing.cert_number.split('-');
    const lastPart = parts[parts.length - 1];
    const parsed = parseInt(lastPart, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  // Ensure uniqueness by looping with check
  let attempts = 0;
  let certNumber = '';
  while (attempts < 100) {
    const seqPadded = String(nextSeq).padStart(5, '0');
    certNumber = `${prefix}-${year}-${catCode}${deptCode}-${seqPadded}`;
    
    const count = db.prepare('SELECT COUNT(*) as c FROM certificates WHERE cert_number = ?').get(certNumber);
    if (count.c === 0) {
      return certNumber;
    }
    nextSeq++;
    attempts++;
  }

  // Fallback with random security token if needed
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${catCode}-${String(nextSeq).padStart(5, '0')}-${randomSuffix}`;
}

module.exports = {
  getCategoryCode,
  generateCertificateNumber,
  CATEGORY_CODES
};
