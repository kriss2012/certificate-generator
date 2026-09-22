const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { generateDualVerificationBadgeSVG } = require('./qrBarcodeService');

/**
 * Service to generate authentic official certificates by editing official PDF templates.
 */
async function generateOfficialCertificateDocument({
  template_type = 'hiring',
  recipient_name,
  position = 'Member',
  class_info = 'MCA (Int.) - III',
  tenure = 'AY 2026-27',
  date = '19 September 2026',
  cert_number,
  verification_url
}) {
  const safeNumber = (cert_number || 'AISC-2026-CERT-00000').replace(/[^a-zA-Z0-9\-]/g, '_');
  const projectRoot = path.resolve(__dirname, '../..');
  const outputDir = path.join(projectRoot, 'public/stamped_certificates/generated');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPdf = path.join(outputDir, `${safeNumber}.pdf`);
  const outputPng = path.join(outputDir, `${safeNumber}.png`);

  // Generate the dual verification badge SVG
  const badge = await generateDualVerificationBadgeSVG(cert_number, verification_url, {
    width: 420,
    height: 95
  });

  const payload = {
    template_type,
    recipient_name,
    position,
    class_info,
    tenure,
    date,
    cert_number,
    badge_svg: badge.svg,
    output_pdf: outputPdf,
    output_png: outputPng
  };

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'generate_official_cert.py');
    const py = spawn('python', [pythonScript]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        console.error('Python official cert generation error:', stderr);
        return reject(new Error(`Generator exited with code ${code}: ${stderr}`));
      }
      try {
        const result = JSON.parse(stdout.trim().split('\n').pop());
        resolve({
          success: true,
          pdf_url: `/stamped_certificates/generated/${safeNumber}.pdf`,
          preview_url: `/stamped_certificates/generated/${safeNumber}.png`,
          pdf_path: outputPdf,
          preview_path: outputPng
        });
      } catch (err) {
        reject(new Error(`Failed to parse generator output: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

module.exports = {
  generateOfficialCertificateDocument
};
