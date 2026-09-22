const QRCode = require('qrcode');
const { CODE128 } = require('jsbarcode/bin/barcodes/CODE128');

/**
 * Generates an authentic, scanner-readable Code 128 linear barcode SVG and Data URL.
 * Complies with ISO/IEC 15417 with quiet zones and standard start/check/stop patterns.
 */
function generateBarcodeSVG(certNumber, options = {}) {
  const cleanNumber = (certNumber || 'AISC-2024-00001').replace(/[^A-Za-z0-9\-]/g, '');
  const moduleWidth = options.moduleWidth || 2;
  const barHeight = options.height || 50;
  const quietZone = options.quietZone !== undefined ? options.quietZone : 20; // 10 modules minimum
  const showText = options.showText !== false;
  const lineColor = options.lineColor || '#000000';
  const bgColor = options.bgColor || '#ffffff';

  let binary = '';
  try {
    const encoder = new CODE128(cleanNumber, {});
    if (encoder.valid()) {
      binary = encoder.encode().data;
    }
  } catch (err) {
    console.warn('CODE128 encoding warning, using standard subset B:', err);
  }

  // If encoding failed for any reason, create fallback
  if (!binary) {
    const { CODE128B } = require('jsbarcode/bin/barcodes/CODE128');
    const encoderB = new CODE128B(cleanNumber, {});
    binary = encoderB.encode().data;
  }

  const svgWidth = binary.length * moduleWidth + quietZone * 2;
  const svgHeight = barHeight + (showText ? 24 : 10);

  // Group consecutive 1s into crisp individual bar rects
  let rects = '';
  let currentX = quietZone;
  let i = 0;
  while (i < binary.length) {
    if (binary[i] === '1') {
      let runLength = 1;
      while (i + 1 < binary.length && binary[i + 1] === '1') {
        runLength++;
        i++;
      }
      const barW = runLength * moduleWidth;
      rects += `<rect x="${currentX}" y="6" width="${barW}" height="${barHeight}" fill="${lineColor}" />`;
      currentX += barW;
    } else {
      currentX += moduleWidth;
    }
    i++;
  }

  const textElement = showText
    ? `<text x="${svgWidth / 2}" y="${barHeight + 20}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" text-anchor="middle" fill="${lineColor}" letter-spacing="2">${cleanNumber}</text>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
    <rect width="100%" height="100%" fill="${bgColor}" rx="2" />
    ${rects}
    ${textElement}
  </svg>`;

  return {
    svg,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    width: svgWidth,
    height: svgHeight,
    code: cleanNumber
  };
}

/**
 * Generates high-resolution Data URL for the QR code.
 */
async function generateQRCode(verificationUrl) {
  try {
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    throw new Error('Failed to generate verification QR code: ' + err.message);
  }
}

async function generateQRCodeSVG(verificationUrl) {
  try {
    const svg = await QRCode.toString(verificationUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2
    });
    return svg;
  } catch (err) {
    console.error('QR SVG generation error:', err);
    throw new Error('Failed to generate QR code SVG: ' + err.message);
  }
}

function validateCodes(verificationUrl, certNumber) {
  if (!verificationUrl || !verificationUrl.startsWith('http')) {
    return { valid: false, error: 'Verification URL must be an absolute HTTP/HTTPS URL' };
  }
  if (!certNumber || certNumber.length < 5) {
    return { valid: false, error: 'Certificate number is missing or invalid' };
  }
  return { valid: true };
}

/**
 * Generates an executive Dual Verification Badge SVG containing both
 * a direct phone-scannable QR code (with URL) and a Code 128 linear barcode.
 */
async function generateDualVerificationBadgeSVG(certNumber, verificationUrl, options = {}) {
  const width = options.width || 420;
  const height = options.height || 95;
  const cleanNumber = (certNumber || 'AISC-2026-00001').replace(/[^A-Za-z0-9\-]/g, '');

  // 1. Generate QR code SVG content encoding the full verification URL
  const qrSvgRaw = await QRCode.toString(verificationUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M'
  });

  const qrInnerMatch = qrSvgRaw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const qrInner = qrInnerMatch ? qrInnerMatch[1] : '';
  const viewBoxMatch = qrSvgRaw.match(/viewBox="([^"]+)"/i);
  const qrViewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 33 33';
  const qrSize = height - 16; // 79x79 pt

  // 2. Generate Code 128 barcode binary
  let binary = '';
  try {
    const encoder = new CODE128(cleanNumber, {});
    if (encoder.valid()) {
      binary = encoder.encode().data;
    }
  } catch (e) {}

  if (!binary) {
    const { CODE128B } = require('jsbarcode/bin/barcodes/CODE128');
    const encoderB = new CODE128B(cleanNumber, {});
    binary = encoderB.encode().data;
  }

  const rightAreaWidth = width - qrSize - 32;
  const moduleWidth = Math.max(1.2, rightAreaWidth / (binary.length + 10));
  const barHeight = 32;
  const barcodeStartX = qrSize + 22;
  const barcodeY = 36;

  let rects = '';
  let currentX = barcodeStartX;
  let i = 0;
  while (i < binary.length) {
    if (binary[i] === '1') {
      let runLength = 1;
      while (i + 1 < binary.length && binary[i + 1] === '1') {
        runLength++;
        i++;
      }
      const barW = runLength * moduleWidth;
      rects += `<rect x="${currentX.toFixed(2)}" y="${barcodeY}" width="${barW.toFixed(2)}" height="${barHeight}" fill="#000000" />`;
      currentX += barW;
    } else {
      currentX += moduleWidth;
    }
    i++;
  }

  const barcodeCenterX = barcodeStartX + (currentX - barcodeStartX) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Background Badge Card with Rounded Corners -->
  <rect width="100%" height="100%" fill="#ffffff" rx="6" stroke="#94a3b8" stroke-width="1.5" />
  
  <!-- QR Code Section (Scan with phone to open site) -->
  <g transform="translate(8, 8)">
    <svg width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">
      ${qrInner}
    </svg>
  </g>

  <!-- Divider Line -->
  <line x1="${qrSize + 14}" y1="8" x2="${qrSize + 14}" y2="${height - 8}" stroke="#e2e8f0" stroke-width="1.5" />

  <!-- Official Top Label -->
  <text x="${barcodeCenterX.toFixed(2)}" y="17" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#0f172a" letter-spacing="0.8">OFFICIAL VERIFICATION CODE</text>

  <!-- Certificate Number Header -->
  <text x="${barcodeCenterX.toFixed(2)}" y="30" font-family="'JetBrains Mono', monospace" font-size="11.5" font-weight="800" text-anchor="middle" fill="#0f172a" letter-spacing="1.5">${cleanNumber}</text>

  <!-- 1D Linear Barcode -->
  ${rects}

  <!-- Scan with Phone Callout Link -->
  <text x="${barcodeCenterX.toFixed(2)}" y="${(barcodeY + barHeight + 13).toFixed(2)}" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="#2563eb" letter-spacing="0.5">SCAN WITH PHONE CAMERA TO VERIFY</text>
</svg>`;

  return {
    svg,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    width,
    height,
    certNumber: cleanNumber,
    verificationUrl
  };
}

module.exports = {
  generateQRCode,
  generateQRCodeSVG,
  generateBarcodeSVG,
  generateDualVerificationBadgeSVG,
  validateCodes
};
