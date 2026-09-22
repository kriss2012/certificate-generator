const QRCode = require('qrcode');
const { CODE128 } = require('jsbarcode/bin/barcodes/CODE128');
const fs = require('fs');
const path = require('path');

async function generateDualVerificationBadgeSVG(certNumber, verificationUrl, options = {}) {
  const width = options.width || 420;
  const height = options.height || 95;
  const cleanNumber = (certNumber || 'AISC-2026-00001').replace(/[^A-Za-z0-9\-]/g, '');

  // 1. Generate QR code SVG content
  const qrSvgRaw = await QRCode.toString(verificationUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M'
  });

  // Extract inner content from qrSvgRaw (strip outer <svg...> and </svg>)
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

  // Barcode dimensions to fit the right side
  const rightAreaWidth = width - qrSize - 32; // ~300 pt
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
    width,
    height,
    certNumber: cleanNumber,
    verificationUrl
  };
}

module.exports = { generateDualVerificationBadgeSVG };

if (require.main === module) {
  generateDualVerificationBadgeSVG('AISC-2026-HIRE-00007', 'http://localhost:3000/verify/AISC-2026-HIRE-00007')
    .then(res => {
      fs.writeFileSync('data/preview/test_dual_badge.svg', res.svg, 'utf8');
      console.log('Saved test badge to data/preview/test_dual_badge.svg');
    })
    .catch(console.error);
}
