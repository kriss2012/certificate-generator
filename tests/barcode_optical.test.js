const { Code128Reader, BinaryBitmap, HybridBinarizer, LuminanceSource } = require('@zxing/library');

class CustomLuminanceSource extends LuminanceSource {
  constructor(matrix, width, height) {
    super(width, height);
    this.matrix = matrix;
  }
  getRow(y, row) {
    const w = this.getWidth();
    const arr = row ? row : new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      arr[x] = this.matrix[y * w + x];
    }
    return arr;
  }
  getMatrix() {
    return this.matrix;
  }
}

async function testBarcodeOpticalScannability() {
  const { generateBarcodeSVG } = require('../server/services/qrBarcodeService');
  const testIds = [
    'CLUB-2024-LEAD-00001',
    'AISC-2024-WIN-00042',
    'AISC-2025-MEM-99999',
    'SPECIAL-2024-APPR-001'
  ];

  console.log('---------------------------------------------------------');
  console.log('RUNNING OPTICAL BARCODE SCANNABILITY TESTS (ISO/IEC 15417)');
  console.log('---------------------------------------------------------');

  for (const certId of testIds) {
    const res = generateBarcodeSVG(certId);
    const svg = res.svg;

    const widthMatch = svg.match(/width="(\d+)"/);
    const heightMatch = svg.match(/height="(\d+)"/);
    const width = parseInt(widthMatch[1], 10);
    const height = parseInt(heightMatch[1], 10);

    const rectRegex = /<rect x="(\d+)" y="\d+" width="(\d+)" height="(\d+)" fill="#000000"/g;
    let match;
    const matrix = new Uint8Array(width * height);
    matrix.fill(255); // White background & quiet zone

    while ((match = rectRegex.exec(svg)) !== null) {
      const rx = parseInt(match[1], 10);
      const rw = parseInt(match[2], 10);
      const rh = parseInt(match[3], 10);
      for (let y = 6; y < 6 + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          matrix[y * width + x] = 0; // Black bars
        }
      }
    }

    const source = new CustomLuminanceSource(matrix, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const reader = new Code128Reader();
    const decoded = reader.decode(bitmap);

    console.log(`  ✓ SCANNED: "${certId}" -> Decoded: "${decoded.getText()}" (Match: ${decoded.getText() === certId})`);
    if (decoded.getText() !== certId) {
      throw new Error(`Barcode mismatch for ${certId}!`);
    }
  }
  console.log('---------------------------------------------------------');
  console.log('ALL BARCODES 100% OPTICALLY VERIFIED AND SCANNABLE!');
  console.log('---------------------------------------------------------');
}

testBarcodeOpticalScannability().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
