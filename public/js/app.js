/**
 * AISC Certificate Generation & Verification System — Main Client Application
 * Aligned with https://imrdaisc.vercel.app/
 */

// Defensive guard ensuring CanvasRenderingContext2D.fillRect always receives 4 valid arguments
if (typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype.fillRect) {
  const _origFillRect = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
    if (arguments.length < 4) {
      return _origFillRect.call(this, Number(x) || 0, Number(y) || 0, Number(w) || 0, Number(h) || 0);
    }
    return _origFillRect.apply(this, arguments);
  };
}

const API_BASE = '/api/v1';

// Application State
const state = {
  token: localStorage.getItem('cert_token') || null,
  user: null,
  club: {
    name: 'AI Student Chapters',
    abbr: 'AISC',
    logo: '/assets/club-logo.webp',
    official_website_url: 'https://imrdaisc.vercel.app/',
    president_name: 'Dr. Vaishali Patil',
    seal: '/assets/official_seal.svg'
  },
  types: [],
  currentCert: null,
  assets: {
    logoImg: null,
    sealImg: null
  }
};

// UI Notification Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  let icon = '⚡';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  toast.innerHTML = `<span style="color:var(--color-acid);font-weight:bold;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Preload Assets
function preloadAssets() {
  const logo = new Image();
  logo.src = state.club.logo || '/assets/club-logo.webp';
  logo.onload = () => {
    state.assets.logoImg = logo;
    renderStudioCertificate();
  };

  const seal = new Image();
  seal.src = state.club.seal || '/assets/official_seal.svg';
  seal.onload = () => {
    state.assets.sealImg = seal;
    renderStudioCertificate();
  };
}

// ==========================================================
// 1. ROUTING & TAB NAVIGATION (GLOBAL & SAFE)
// ==========================================================
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item-btn').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById('view' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
  if (targetPane) {
    targetPane.classList.add('active');
  }

  const activeBtn = document.querySelector(`.nav-item-btn[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'dashboard') loadDashboard();
  if (tabId === 'approvals') loadApprovals();
  if (tabId === 'library') loadLibrary();
  if (tabId === 'settings') loadSettings();
  if (tabId === 'integration') loadIntegration();
  if (tabId === 'logs') loadAuditLogs();
};

// ==========================================================
// 2. PUBLIC VERIFICATION & PROPER BARCODE (CODE 128)
// ==========================================================
window.executeVerification = async function(identifier) {
  if (!identifier) {
    identifier = document.getElementById('verifySearchInput').value.trim();
  }
  if (!identifier) {
    showToast('Please enter a certificate number or verification ID', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/verify/${encodeURIComponent(identifier)}`);
    const data = await res.json();

    const resultArea = document.getElementById('verifyResultArea');
    const banner = document.getElementById('verifyStatusBanner');
    const statusText = document.getElementById('verifyStatusText');
    const subtext = document.getElementById('verifySubtext');
    const tamperBadge = document.getElementById('verifyTamperBadge');
    const tamperText = document.getElementById('verifyTamperText');
    const visitClubBtn = document.getElementById('btnVisitOfficialClub');

    if (resultArea) resultArea.style.display = 'block';

    if (!res.ok || !data.success) {
      if (banner) banner.className = 'verify-badge-banner verify-invalid';
      if (statusText) statusText.textContent = data.status_badge || 'CERTIFICATE NOT FOUND';
      if (subtext) subtext.textContent = data.message || 'No official certificate matches this identifier.';
      if (tamperBadge) tamperBadge.style.display = 'none';
      const sheet = document.querySelector('.certificate-sheet-wrapper');
      if (sheet) sheet.style.display = 'none';
      const bCard = document.getElementById('dtBarcodeCard');
      if (bCard) bCard.style.display = 'none';
      return;
    }

    const sheet = document.querySelector('.certificate-sheet-wrapper');
    if (sheet) sheet.style.display = 'block';
    const bCard = document.getElementById('dtBarcodeCard');
    if (bCard) bCard.style.display = 'block';

    state.currentCert = data.certificate;

    // Status Banner
    if (data.status === 'issued' && data.is_valid) {
      if (banner) banner.className = 'verify-badge-banner verify-valid';
      if (statusText) statusText.textContent = 'VERIFIED AND VALID';
      if (subtext) subtext.innerHTML = `Official certificate issued by <strong>${data.club.name}</strong>. Cryptographic integrity verified.`;
    } else if (data.status === 'revoked') {
      if (banner) banner.className = 'verify-badge-banner verify-revoked';
      if (statusText) statusText.textContent = 'CERTIFICATE REVOKED';
      if (subtext) subtext.textContent = `Revocation reason: ${data.certificate.revoke_reason || 'Administrative action'}`;
    } else {
      if (banner) banner.className = 'verify-badge-banner verify-invalid';
      if (statusText) statusText.textContent = data.status_badge || 'TAMPER ALERT / INVALID';
      if (subtext) subtext.textContent = data.tamper_check.message;
    }

    if (tamperBadge) {
      tamperBadge.style.display = 'inline-flex';
      tamperText.textContent = data.tamper_check.message;
    }

    // Official Club Website URL (Opens in new tab)
    const officialUrl = data.club.official_website_url || 'https://imrdaisc.vercel.app/';
    if (visitClubBtn) {
      visitClubBtn.href = officialUrl;
      visitClubBtn.target = '_blank';
    }

    // Details Card
    document.getElementById('dtCertNumber').textContent = data.certificate.cert_number;
    document.getElementById('dtRecipientName').textContent = data.certificate.recipient_display_name || data.certificate.recipient_name;
    document.getElementById('dtMemberId').textContent = data.certificate.member_id || 'Not disclosed';
    document.getElementById('dtCategory').textContent = data.certificate.type_name;
    document.getElementById('dtPosition').textContent = data.certificate.position_held || 'Member';
    document.getElementById('dtEvent').textContent = data.certificate.event_name || 'AISC Activities';
    document.getElementById('dtYear').textContent = data.certificate.event_year || '-';
    document.getElementById('dtIssueDate').textContent = data.certificate.issue_date || '-';
    document.getElementById('dtAchievement').textContent = data.certificate.achievement_text || '-';
    document.getElementById('dtApprover').textContent = `${data.certificate.approver_name || 'Dr. Vaishali Patil'} (${data.certificate.approver_title || 'President'})`;
    document.getElementById('dtVerifiedAt').textContent = new Date(data.verification_timestamp).toLocaleString();

    // RENDER PROPER DUAL VERIFICATION: QR CODE + CODE 128 BARCODE
    const verifyUrl = data.certificate.verification_url || `${window.location.origin}/verify/${data.certificate.cert_number}`;
    const qrImg = document.getElementById('verifyQrImage');
    if (qrImg) {
      qrImg.src = data.certificate.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;
    }
    const directLink = document.getElementById('verifyDirectLink');
    if (directLink) {
      directLink.href = verifyUrl;
    }
    renderCode128Barcode(data.certificate.cert_number);

    // Setup direct PDF download if authentic stamped PDF exists
    const downloadPdfBtn = document.getElementById('btnDownloadVerifiedPdf');
    if (downloadPdfBtn) {
      if (data.certificate.pdf_url) {
        downloadPdfBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = data.certificate.pdf_url;
          a.download = data.certificate.pdf_url.split('/').pop();
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('Downloading official stamped PDF certificate...', 'success');
        };
      } else {
        downloadPdfBtn.onclick = () => {
          const cvs = document.getElementById('verifyCanvas');
          const name = (data.certificate && data.certificate.recipient_name) || 'Certificate';
          window.downloadCanvasAsPdf(cvs, `${name}_Verified_Certificate.pdf`);
        };
      }
    }

    // Render Canvas safely with dedicated error capture
    try {
      renderCertificateToCanvas(document.getElementById('verifyCanvas'), data.certificate, data.club);
    } catch (canvasErr) {
      console.warn('Canvas rendering notice:', canvasErr);
    }

    // Setup Sharing
    setupShareLinks(data.certificate.cert_number, data.certificate.recipient_name);

    showToast('Official certificate record verified!', 'success');
  } catch (err) {
    console.error('Verification error:', err);
    showToast('Verification query error: ' + err.message, 'error');
  }
};

window.loadSampleCert = function() {
  document.getElementById('verifySearchInput').value = 'AISC-2026-HIRE-00007';
  window.executeVerification('AISC-2026-HIRE-00007');
};

function renderCode128Barcode(certNumber) {
  const barcodeSvg = document.getElementById('verifyBarcodeSvg');
  if (!barcodeSvg) return;

  const cleanNumber = (certNumber || 'CLUB-2024-LEAD-00001').replace(/[^A-Za-z0-9\-]/g, '');

  if (window.JsBarcode) {
    try {
      JsBarcode(barcodeSvg, cleanNumber, {
        format: "CODE128",
        lineColor: "#000000",
        width: 2,
        height: 60,
        displayValue: true,
        font: "'JetBrains Mono', monospace",
        fontSize: 13,
        fontOptions: "bold",
        textMargin: 6,
        margin: 20,
        background: "#ffffff"
      });
      return;
    } catch (e) {
      console.warn('JsBarcode client error, falling back to SVG pattern:', e);
    }
  }

  // Fallback if JsBarcode script CDN is unreachable
  if (state.currentCert && state.currentCert.barcode_data) {
    const parent = barcodeSvg.parentElement;
    if (parent) {
      parent.innerHTML = state.currentCert.barcode_data;
      const newSvg = parent.querySelector('svg');
      if (newSvg) {
        newSvg.id = 'verifyBarcodeSvg';
        newSvg.style.maxWidth = '100%';
        newSvg.style.height = 'auto';
        newSvg.style.display = 'block';
        newSvg.style.margin = '0 auto';
      }
    }
  }
}

function setupShareLinks(certNumber, recipient) {
  const verifyUrl = `${window.location.origin}/verify/${certNumber}`;
  const shareText = encodeURIComponent(`Verified official club certificate for ${recipient} (Cert #${certNumber}): ${verifyUrl}`);

  const wa = document.getElementById('shareWhatsApp');
  const li = document.getElementById('shareLinkedIn');
  const tg = document.getElementById('shareTelegram');

  if (wa) wa.href = `https://api.whatsapp.com/send?text=${shareText}`;
  if (li) li.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
  if (tg) tg.href = `https://t.me/share/url?url=${encodeURIComponent(verifyUrl)}&text=${encodeURIComponent('Official Verified Certificate')}`;
}

// ==========================================================
// 3. CANVAS DRAWING ENGINE (WITH ACCURATE CODE 128 BARCODE)
// ==========================================================
function renderCertificateToCanvas(canvas, cert, club) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = Number(canvas.width) || 1120;
  const h = Number(canvas.height) || 792;

  ctx.clearRect(0, 0, w, h);

  const theme = (cert && cert.theme) || 'classic_gold';

  // Aesthetic Themes
  let bgColor = '#fffdfa';
  let outerBorderColor = '#b45309';
  let innerBorderColor = '#d97706';
  let titleColor = '#78350f';
  let nameColor = '#0f172a';

  if (theme === 'classic_gold') {
    bgColor = '#fffdfa'; outerBorderColor = '#b45309'; innerBorderColor = '#f59e0b'; titleColor = '#78350f';
  } else if (theme === 'royal_blue') {
    bgColor = '#f8fafc'; outerBorderColor = '#1e3a8a'; innerBorderColor = '#3b82f6'; titleColor = '#1e40af';
  } else if (theme === 'elegant_green') {
    bgColor = '#f7fee7'; outerBorderColor = '#064e3b'; innerBorderColor = '#10b981'; titleColor = '#065f46';
  } else if (theme === 'modern_minimal') {
    bgColor = '#ffffff'; outerBorderColor = '#04060f'; innerBorderColor = '#d8ff3e'; titleColor = '#04060f';
  } else if (theme === 'academic') {
    bgColor = '#fffbf5'; outerBorderColor = '#451a03'; innerBorderColor = '#92400e'; titleColor = '#451a03';
  } else if (theme === 'sports_award') {
    bgColor = '#fef2f2'; outerBorderColor = '#991b1b'; innerBorderColor = '#dc2626'; titleColor = '#991b1b';
  } else if (theme === 'corporate') {
    bgColor = '#f8fafc'; outerBorderColor = '#0f172a'; innerBorderColor = '#334155'; titleColor = '#1e293b';
  } else if (theme === 'traditional_ceremonial') {
    bgColor = '#fdf4ff'; outerBorderColor = '#581c87'; innerBorderColor = '#b500ff'; titleColor = '#701a75';
  }

  // Base
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Borders
  ctx.strokeStyle = outerBorderColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(30, 30, Math.max(10, w - 60), Math.max(10, h - 60));

  ctx.strokeStyle = innerBorderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(45, 45, Math.max(10, w - 90), Math.max(10, h - 90));

  // Ornate Corner Accents
  const cornerSize = 25;
  ctx.fillStyle = outerBorderColor;
  ctx.fillRect(40, 40, cornerSize, cornerSize);
  ctx.fillRect(Math.max(0, w - 40 - cornerSize), 40, cornerSize, cornerSize);
  ctx.fillRect(40, Math.max(0, h - 40 - cornerSize), cornerSize, cornerSize);
  ctx.fillRect(Math.max(0, w - 40 - cornerSize), Math.max(0, h - 40 - cornerSize), cornerSize, cornerSize);

  // Logo
  const logo = state.assets.logoImg;
  if (logo && logo.complete) {
    ctx.drawImage(logo, w / 2 - 50, 65, 100, 100);
  }

  // Header Titles
  ctx.fillStyle = titleColor;
  ctx.font = "bold 26px 'Outfit', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText((club ? club.name : state.club.name).toUpperCase(), w / 2, 195);

  ctx.fillStyle = '#64748b';
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillText('OFFICIAL CERTIFICATE OF EXCELLENCE & RECORD', w / 2, 220);

  // Category Title
  ctx.fillStyle = outerBorderColor;
  ctx.font = "bold 38px 'Playfair Display', Georgia, serif";
  ctx.fillText((cert.type_name || 'Certificate of Recognition').toUpperCase(), w / 2, 280);

  // Presentation text
  ctx.fillStyle = '#475569';
  ctx.font = "italic 18px 'Playfair Display', serif";
  ctx.fillText('This is proudly presented to', w / 2, 325);

  // Recipient Name
  ctx.fillStyle = nameColor;
  ctx.font = "bold 46px 'Playfair Display', Georgia, serif";
  const recName = (cert.recipient_display_name || cert.recipient_name || 'Alex Morgan').toUpperCase();
  ctx.fillText(recName, w / 2, 385);

  const nameWidth = ctx.measureText(recName).width;
  ctx.strokeStyle = innerBorderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - nameWidth / 2 - 20, 400);
  ctx.lineTo(w / 2 + nameWidth / 2 + 20, 400);
  ctx.stroke();

  // Achievement Wording
  ctx.fillStyle = '#334155';
  ctx.font = "19px 'Inter', sans-serif";
  const achievement = cert.achievement_text || 'In recognition of outstanding dedication, leadership, and contribution.';
  wrapText(ctx, achievement, w / 2, 450, w - 260, 30);

  // Event & Position
  if (cert.event_name || cert.position_held) {
    ctx.font = "600 16px 'Outfit', sans-serif";
    ctx.fillStyle = outerBorderColor;
    const detailLine = [
      cert.position_held ? `Position: ${cert.position_held}` : null,
      cert.event_name ? `Event: ${cert.event_name}` : null,
      cert.event_year ? `Year: ${cert.event_year}` : null
    ].filter(Boolean).join('  •  ');
    ctx.fillText(detailLine, w / 2, 535);
  }

  // Official Seal (Bottom Left)
  const seal = state.assets.sealImg;
  if (seal && seal.complete) {
    ctx.drawImage(seal, 110, h - 225, 125, 125);
  }

  // Primary Signatory (Bottom Right)
  const sigX1 = w - 220;
  const sigY1 = h - 145;
  ctx.textAlign = 'center';
  ctx.font = "italic 26px 'Great Vibes', 'Playfair Display', cursive";
  ctx.fillStyle = '#0f172a';
  ctx.fillText(cert.approver_name || 'Dr. Vaishali Patil', sigX1, sigY1);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sigX1 - 100, sigY1 + 10);
  ctx.lineTo(sigX1 + 100, sigY1 + 10);
  ctx.stroke();

  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.fillStyle = '#1e293b';
  ctx.fillText(cert.approver_name || 'Dr. Vaishali Patil', sigX1, sigY1 + 28);
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = '#64748b';
  ctx.fillText(cert.approver_title || 'President & Approving Authority', sigX1, sigY1 + 44);

  // QR Code (Center-Bottom)
  if (cert.qr_data) {
    const qrImg = new Image();
    qrImg.src = cert.qr_data;
    if (qrImg.complete) {
      ctx.drawImage(qrImg, w / 2 - 45, h - 225, 90, 90);
    } else {
      qrImg.onload = () => ctx.drawImage(qrImg, w / 2 - 45, h - 225, 90, 90);
    }
  }

  // DRAW AUTHENTIC LINEAR BARCODE (CODE 128) DIRECTLY ON CANVAS
  const certNum = cert.cert_number || 'CLUB-2024-LEAD-00001';
  drawBarcodeOnCanvas(ctx, certNum, w / 2, h - 132, 42);

  // Cert Number Text
  ctx.textAlign = 'center';
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.fillStyle = '#0f172a';
  ctx.fillText(certNum, w / 2, h - 80);

  // Verification URL & Club Site
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Issued on: ${cert.issue_date || '2024-12-15'}  |  Verify online: ${window.location.origin}/verify/${certNum}`, w / 2, h - 64);

  ctx.font = "600 11px 'Inter', sans-serif";
  ctx.fillStyle = outerBorderColor;
  ctx.fillText(`OFFICIAL CLUB PORTAL: ${(club ? club.official_website_url : state.club.official_website_url) || 'https://imrdaisc.vercel.app/'}`, w / 2, h - 46);
}

// Helper to draw clean Code 128 linear barcode bars directly onto Canvas 2D
function drawBarcodeOnCanvas(ctx, text, centerX, y, barHeight = 42) {
  const safeText = String(text || 'AISC-2026-00001');
  const safeCenterX = Number(centerX) || 560;
  const safeY = Number(y) || 660;
  const safeHeight = Math.max(20, Number(barHeight) || 42);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 450;
  tempCanvas.height = safeHeight + 30;

  if (window.JsBarcode) {
    try {
      JsBarcode(tempCanvas, safeText, {
        format: "CODE128",
        width: 1.5,
        height: safeHeight,
        displayValue: false,
        margin: 15,
        background: "#ffffff",
        lineColor: "#000000"
      });
      const bw = Number(tempCanvas.width) || 360;
      const startX = Math.round(safeCenterX - bw / 2);
      ctx.save();
      // Crucial for optical barcode scanners: disable interpolation blur
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, startX, Math.round(safeY));
      ctx.restore();
      return;
    } catch (e) {
      console.warn('JsBarcode canvas error:', e);
    }
  }

  // Pure canvas fallback with quiet zone
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(safeCenterX - 180), Math.round(safeY), 360, Math.round(safeHeight + 10));
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Studio Live Canvas
function renderStudioCertificate() {
  const canvas = document.getElementById('certCanvas');
  if (!canvas) return;

  const currentType = state.types.find(t => t.id === document.getElementById('certTypeSelect').value) || {};

  const certData = {
    theme: document.getElementById('certThemeSelect').value,
    type_name: currentType.name || 'Certificate of Recognition',
    recipient_name: document.getElementById('certRecipientName').value || 'Alex Morgan',
    recipient_display_name: document.getElementById('certDisplayName').value,
    achievement_text: document.getElementById('certAchievement').value,
    position_held: document.getElementById('certPosition').value,
    event_name: document.getElementById('certEventName').value,
    event_year: document.getElementById('certEventYear').value,
    issue_date: document.getElementById('certIssueDate').value || new Date().toISOString().split('T')[0],
    cert_number: 'AISC-2024-LEAD-00001',
    approver_name: document.getElementById('certApproverName').value,
    approver_title: document.getElementById('certApproverTitle').value,
    qr_data: state.currentCert ? state.currentCert.qr_data : null
  };

  renderCertificateToCanvas(canvas, certData, state.club);
}

// ==========================================================
// 4. AUTO-WORDING, SUBMIT & BULK GENERATOR
// ==========================================================
window.autoGenerateWording = function() {
  const typeSelect = document.getElementById('certTypeSelect');
  const selectedType = state.types.find(t => t.id === typeSelect.value);
  if (!selectedType) return;

  const recName = document.getElementById('certRecipientName').value || '[RECIPIENT_NAME]';
  const clubName = state.club.name || 'RCPIMRD AI Student Chapters';
  const eventName = document.getElementById('certEventName').value || '[EVENT_NAME]';
  const eventYear = document.getElementById('certEventYear').value || '[EVENT_YEAR]';
  const position = document.getElementById('certPosition').value || '[POSITION_NAME]';
  const awardPos = document.getElementById('certAwardTitle').value || '1st Place';
  const memberId = document.getElementById('certMemberId').value || 'MEM-001';

  let wording = selectedType.wording_template || '';
  wording = wording
    .replace(/\[RECIPIENT_NAME\]/g, recName)
    .replace(/\[CLUB_NAME\]/g, clubName)
    .replace(/\[EVENT_NAME\]/g, eventName)
    .replace(/\[EVENT_YEAR\]/g, eventYear)
    .replace(/\[POSITION_NAME\]/g, position)
    .replace(/\[AWARD_POSITION\]/g, awardPos)
    .replace(/\[MEMBER_ID\]/g, memberId)
    .replace(/\[START_DATE\]/g, '01/01/' + eventYear)
    .replace(/\[END_DATE\]/g, '31/12/' + eventYear)
    .replace(/\[MEMBERSHIP_PERIOD\]/g, `${eventYear}-${parseInt(eventYear, 10)+1}`);

  document.getElementById('certAchievement').value = wording;
  renderStudioCertificate();
  showToast('Official wording auto-generated', 'info');
};

window.submitCertificate = async function() {
  if (!state.token) {
    showToast('Please sign in to the Admin Portal to issue certificates (e.g. admin@club.org / admin123)', 'warning');
    window.openLoginModal();
    return;
  }
  const btn = document.getElementById('btnSubmitCertificate');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const payload = {
      type_id: document.getElementById('certTypeSelect').value,
      recipient_name: document.getElementById('certRecipientName').value,
      recipient_display_name: document.getElementById('certDisplayName').value,
      member_id: document.getElementById('certMemberId').value,
      membership_status: document.getElementById('certMemberStatus').value,
      position_held: document.getElementById('certPosition').value,
      department: document.getElementById('certDepartment').value,
      event_name: document.getElementById('certEventName').value,
      event_year: parseInt(document.getElementById('certEventYear').value, 10),
      award_title: document.getElementById('certAwardTitle').value,
      issue_date: document.getElementById('certIssueDate').value || new Date().toISOString().split('T')[0],
      achievement_text: document.getElementById('certAchievement').value,
      theme: document.getElementById('certThemeSelect').value,
      approver_name: document.getElementById('certApproverName').value,
      approver_title: document.getElementById('certApproverTitle').value,
      privacy_settings: {
        show_member_id: document.getElementById('privacyShowMemberId').checked,
        show_position: document.getElementById('privacyShowPosition').checked
      }
    };

    const res = await fetch(`${API_BASE}/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save certificate');

    showToast(`Certificate issued: ${data.cert_number}`, 'success');
    window.switchTab('library');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Issue / Save';
  }
};

window.downloadCanvasAsPdf = function(canvas, filename) {
  if (!canvas || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1120, 792]
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, 1120, 792);
  pdf.save(filename || 'AISC_Certificate.pdf');
  showToast('PDF downloaded successfully!', 'success');
};

window.processBulkImport = async function() {
  if (!state.token) {
    showToast('Please sign in to the Admin Portal to generate bulk certificates (e.g. admin@club.org / admin123)', 'warning');
    window.openLoginModal();
    return;
  }
  const text = document.getElementById('bulkCsvTextInput').value.trim();
  if (!text) {
    showToast('Please enter or upload CSV recipient data', 'error');
    return;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items = [];

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 1) continue;
    items.push({
      recipient_name: cols[0],
      member_id: cols[1] || '',
      type_id: cols[2] ? `typ_${cols[2].toLowerCase()}` : 'typ_participation',
      event_name: cols[3] || 'AISC Hackathon',
      event_year: cols[4] || 2024,
      award_title: cols[5] || '',
      email: cols[6] || ''
    });
  }

  const btn = document.getElementById('btnProcessBulk');
  btn.disabled = true;
  btn.textContent = `Processing ${items.length} records...`;

  try {
    const res = await fetch(`${API_BASE}/certificates/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ items, auto_issue: true })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Bulk generation failed');

    showToast(`Generated ${data.processed} certificates!`, 'success');

    const tbody = document.getElementById('bulkResultsTableBody');
    tbody.innerHTML = '';
    data.certificates.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><code style="color:var(--color-acid);">${c.cert_number}</code></td>
        <td><strong>${c.recipient_name}</strong></td>
        <td><span class="status-pill status-issued">${c.status}</span></td>
        <td><a href="${c.verification_url}" target="_blank" class="btn btn-secondary btn-sm">Verify</a></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('bulkResultsArea').style.display = 'block';
    const zipBtn = document.getElementById('btnDownloadBatchZip');
    zipBtn.style.display = 'inline-flex';
    zipBtn.onclick = () => window.downloadBatchZip(data.certificates);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Batch Certificates';
  }
};

window.downloadBatchZip = async function(certs) {
  const zip = new JSZip();
  const folder = zip.folder("AISC_Official_Certificates");
  showToast('Packaging ZIP with certificates...', 'info');

  for (let i = 0; i < certs.length; i++) {
    const c = certs[i];
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1120;
    offCanvas.height = 792;
    renderCertificateToCanvas(offCanvas, c, state.club);

    const blob = await new Promise(resolve => offCanvas.toBlob(resolve, 'image/jpeg', 0.95));
    const safeName = (c.recipient_name || 'cert').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    folder.file(`${c.cert_number}_${safeName}.jpg`, blob);
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, 'AISC_Certificates_Batch.zip');
  showToast('Batch ZIP downloaded successfully!', 'success');
};

// ==========================================================
// 5. DASHBOARD, LIBRARY, SETTINGS, AUDIT LOGS
// ==========================================================
async function loadDashboard() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('statTotalIssued').textContent = data.stats.total_issued;
      document.getElementById('statIssuedYear').textContent = data.stats.issued_this_year;
      document.getElementById('statPendingApproval').textContent = data.stats.pending_approval;
      document.getElementById('statRevoked').textContent = data.stats.total_revoked;
      document.getElementById('statVerifications').textContent = data.stats.total_verifications;

      const feed = document.getElementById('dashboardRecentVerifFeed');
      feed.innerHTML = '';
      if (data.stats.recent_verifications.length === 0) {
        feed.innerHTML = '<p style="color:var(--text-muted);">No verification activity yet.</p>';
      } else {
        data.stats.recent_verifications.forEach(v => {
          const item = document.createElement('div');
          item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          item.style.paddingBottom = '6px';
          const isTamper = v.tamper_detected === 1;
          item.innerHTML = `
            <div style="display:flex;justify-content:space-between;">
              <span style="font-weight:700;color:${isTamper ? 'var(--color-coral)' : 'var(--color-acid)'};">${isTamper ? '⚠️ TAMPER ALERT' : '✓ Verified'}</span>
              <span style="font-size:0.75rem;color:var(--text-dim);font-family:var(--font-mono);">${new Date(v.verified_at).toLocaleTimeString()}</span>
            </div>
            <div style="color:var(--text-muted);font-size:0.8rem;font-family:var(--font-mono);">Query: ${v.query_term} (IP: ${v.ip_address})</div>
          `;
          feed.appendChild(item);
        });
      }
    }
  } catch (err) {
    console.warn('Dashboard load error:', err);
  }
}

async function loadApprovals() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/approvals/pending`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('approvalsTableBody');
    tbody.innerHTML = '';

    if (!data.pending || data.pending.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No pending certificates awaiting approval.</td></tr>';
      return;
    }

    data.pending.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code style="color:var(--color-acid);">${c.cert_number}</code></td>
        <td><strong>${c.recipient_name}</strong></td>
        <td>${c.type_name}</td>
        <td>${c.event_name || '-'} (${c.event_year})</td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
        <td>
          <div style="display:flex;gap:0.4rem;">
            <button class="btn btn-success btn-sm" onclick="approveCert('${c.id}')">Approve &amp; Sign</button>
            <button class="btn btn-danger btn-sm" onclick="rejectCert('${c.id}')">Reject</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.warn('Approvals error:', err);
  }
}

window.approveCert = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/approvals/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ comments: 'Officially approved and electronically signed' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Certificate approved and issued!', 'success');
      loadApprovals();
      loadDashboard();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.rejectCert = async function(id) {
  const reason = prompt('Please enter rejection feedback/reason:');
  if (!reason) return;
  try {
    const res = await fetch(`${API_BASE}/approvals/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ comments: reason })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Certificate rejected with feedback', 'info');
      loadApprovals();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.loadLibrary = async function() {
  try {
    const search = document.getElementById('libSearchInput')?.value || '';
    const status = document.getElementById('libStatusFilter')?.value || '';
    const type_id = document.getElementById('libTypeFilter')?.value || '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (type_id) params.append('type_id', type_id);

    const res = await fetch(`${API_BASE}/certificates?${params.toString()}`, {
      headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : {}
    });
    const data = await res.json();
    const tbody = document.getElementById('libraryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.certificates || data.certificates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No certificates found matching criteria.</td></tr>';
      return;
    }

    data.certificates.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code style="color:var(--color-acid);">${c.cert_number}</code></td>
        <td><strong>${c.recipient_name}</strong></td>
        <td>${c.type_name}</td>
        <td>${c.event_name || '-'}</td>
        <td>${c.issue_date}</td>
        <td><span class="status-pill status-${c.status}">${c.status}</span></td>
        <td>
          <div style="display:flex;gap:0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="inspectCert('${c.cert_number}')">View</button>
            ${state.user && state.user.role === 'superadmin' && c.status === 'issued' ? `<button class="btn btn-danger btn-sm" onclick="revokeCertPrompt('${c.id}')">Revoke</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Populate dashboard table
    const dashTbody = document.getElementById('dashboardRecentCertsTable');
    if (dashTbody) {
      dashTbody.innerHTML = '';
      data.certificates.slice(0, 5).forEach(c => {
        const dtr = document.createElement('tr');
        dtr.innerHTML = `
          <td><code>${c.cert_number}</code></td>
          <td>${c.recipient_name}</td>
          <td>${c.type_name}</td>
          <td><span class="status-pill status-${c.status}">${c.status}</span></td>
          <td>${c.issue_date}</td>
          <td><button class="btn btn-secondary btn-sm" onclick="inspectCert('${c.cert_number}')">View</button></td>
        `;
        dashTbody.appendChild(dtr);
      });
    }
  } catch (err) {
    console.warn('Library error:', err);
  }
};

window.inspectCert = function(certNumber) {
  document.getElementById('verifySearchInput').value = certNumber;
  window.switchTab('verification');
  window.executeVerification(certNumber);
};

window.revokeCertPrompt = async function(id) {
  const reason = prompt('Please enter official revocation reason:');
  if (!reason) return;
  try {
    const res = await fetch(`${API_BASE}/certificates/${id}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Certificate revoked', 'success');
      window.loadLibrary();
      loadDashboard();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function loadSettings() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/settings/club`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      if (s.club_name) document.getElementById('setClubName').value = s.club_name;
      if (s.club_abbr) document.getElementById('setClubAbbr').value = s.club_abbr;
      if (s.official_website_url) document.getElementById('setOfficialUrl').value = s.official_website_url;
      if (s.homepage_url) document.getElementById('setHomepageUrl').value = s.homepage_url;
      if (s.contact_email) document.getElementById('setContactEmail').value = s.contact_email;
      if (s.contact_phone) document.getElementById('setContactPhone').value = s.contact_phone;
      if (s.club_address) document.getElementById('setClubAddress').value = s.club_address;
      if (s.reg_number) document.getElementById('setRegNumber').value = s.reg_number;
      if (s.president_name) document.getElementById('setPresidentName').value = s.president_name;
      if (s.secretary_name) document.getElementById('setSecretaryName').value = s.secretary_name;
      if (s.authorizing_officer_name) document.getElementById('setAuthOfficer').value = s.authorizing_officer_name;
    }
  } catch (err) {
    console.warn('Settings load error:', err);
  }
}

async function loadIntegration() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/integration/keys`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('apiKeysTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      if (data.keys && data.keys.length > 0) {
        data.keys.forEach(k => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${k.key_prefix}...</code></td>
            <td><strong>${k.name}</strong></td>
            <td>${k.permissions}</td>
            <td>${new Date(k.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-danger btn-sm" onclick="revokeKey('${k.id}')">Revoke</button></td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);">No active API keys found.</td></tr>';
      }
    }

    // Load webhooks
    const whRes = await fetch(`${API_BASE}/integration/webhooks`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const whData = await whRes.json();
    const whTbody = document.getElementById('webhooksTableBody');
    if (whTbody) {
      whTbody.innerHTML = '';
      if (whData.webhooks && whData.webhooks.length > 0) {
        whData.webhooks.forEach(w => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${w.url}</code></td>
            <td>${Array.isArray(w.events) ? w.events.join(', ') : w.events}</td>
            <td><span class="status-pill status-issued">${w.status || 'active'}</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteWebhook('${w.id}')">Delete</button></td>
          `;
          whTbody.appendChild(tr);
        });
      } else {
        whTbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted);">No webhooks registered.</td></tr>';
      }
    }
  } catch (err) {
    console.warn('Integration error:', err);
  }
}

window.deleteWebhook = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/integration/webhooks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Webhook deleted', 'info');
      loadIntegration();
    } else {
      showToast(data.error || 'Failed to delete webhook', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.revokeKey = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/integration/keys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('API key revoked', 'info');
      loadIntegration();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function loadAuditLogs() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_BASE}/analytics/audit-logs`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('auditLogsTableBody');
    tbody.innerHTML = '';
    if (data.logs && data.logs.length > 0) {
      data.logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family:var(--font-mono);font-size:0.75rem;">${new Date(l.timestamp).toLocaleString()}</td>
          <td><strong style="color:var(--color-acid);">${l.action}</strong></td>
          <td style="font-family:var(--font-mono);">${l.user_email}</td>
          <td>${l.entity_type} ${l.entity_id ? `(${l.entity_id})` : ''}</td>
          <td style="font-size:0.75rem;color:var(--text-muted);">${l.details || '-'}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No audit logs yet.</td></tr>';
    }
  } catch (err) {
    console.warn('Audit error:', err);
  }
}

// ==========================================================
// 6. AUTHENTICATION & MODALS
// ==========================================================
window.openLoginModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('active');
};

window.closeLoginModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('active');
};

window.logout = function() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('cert_token');
  updateAuthUI(false);
  window.switchTab('verification');
  showToast('Signed out of administrative portal', 'info');
};

function updateAuthUI(isLoggedIn) {
  const adminNav = document.getElementById('adminNavLinks');
  const profileGroup = document.getElementById('authProfileGroup');
  const loginBtn = document.getElementById('navLoginBtn');
  const roleBadge = document.getElementById('currentUserRoleBadge');

  if (isLoggedIn && state.user) {
    if (adminNav) adminNav.style.display = 'flex';
    if (profileGroup) profileGroup.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (roleBadge) {
      roleBadge.textContent = state.user.role;
      roleBadge.className = `role-badge role-${state.user.role}`;
    }
  } else {
    if (adminNav) adminNav.style.display = 'none';
    if (profileGroup) profileGroup.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
  }
}

// ==========================================================
// THEME SWITCHER (DARK & LIGHT MODE)
// ==========================================================
window.applyTheme = function(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('aisc_theme', theme);
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }
};

window.initTheme = function() {
  const savedTheme = localStorage.getItem('aisc_theme') || 'dark';
  window.applyTheme(savedTheme);

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      window.applyTheme(next);
      showToast(`Switched to ${next === 'dark' ? 'Deep Space Dark' : 'Clean Studio Light'} theme`, 'info');
    };
  }
};

// ==========================================================
// 7. INITIALIZATION & EVENT LISTENERS
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
  window.initTheme();
  preloadAssets();

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('certIssueDate');
  if (dateInput) dateInput.value = today;

  // Load Certificate Types
  try {
    const res = await fetch(`${API_BASE}/settings/types`);
    const data = await res.json();
    if (data.success && data.types) {
      state.types = data.types;
      const typeSelect = document.getElementById('certTypeSelect');
      const filterSelect = document.getElementById('libTypeFilter');
      if (typeSelect) {
        typeSelect.innerHTML = '';
        data.types.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          typeSelect.appendChild(opt);
        });
      }
      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        data.types.forEach(t => {
          const fOpt = document.createElement('option');
          fOpt.value = t.id;
          fOpt.textContent = t.name;
          filterSelect.appendChild(fOpt);
        });
      }
    }
  } catch (err) {
    console.warn('Types fetch error:', err);
  }

  // Load Public Club Info
  try {
    const res = await fetch(`${API_BASE}/public/club`);
    const data = await res.json();
    if (data.success && data.club) {
      state.club = { ...state.club, ...data.club };
      if (data.club.club_name) {
        document.getElementById('headerClubName').textContent = data.club.club_name;
      }
      if (data.club.official_website_url) {
        const visitBtn = document.getElementById('btnVisitOfficialClub');
        if (visitBtn) visitBtn.href = data.club.official_website_url;
      }
    }
  } catch (err) {
    console.warn('Club info error:', err);
  }

  // Restore Auth Session
  if (state.token) {
    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const meData = await meRes.json();
      if (meRes.ok && meData.success) {
        state.user = meData.user;
        updateAuthUI(true);
      } else {
        window.logout();
      }
    } catch (e) {
      window.logout();
    }
  }

  // Check URL paths or query params
  const path = window.location.pathname;
  let targetCert = null;

  if (path.startsWith('/verify/')) {
    targetCert = path.replace('/verify/', '').trim();
  } else if (path.startsWith('/embed/verify')) {
    const nav = document.getElementById('appNavbar');
    if (nav) nav.style.display = 'none';
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('verify')) {
    targetCert = urlParams.get('verify');
  }

  // Default: load sample certificate so user immediately sees live verification & proper barcode
  if (!targetCert) {
    targetCert = 'AISC-2026-HIRE-00007';
  }

  document.getElementById('verifySearchInput').value = targetCert;
  window.switchTab('verification');
  window.executeVerification(targetCert);

  // Studio initial canvas render
  renderStudioCertificate();

  // Attach all Button Listeners
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.onclick = () => window.switchTab(btn.getAttribute('data-tab'));
  });

  const brand = document.getElementById('navBrandLogo');
  if (brand) brand.onclick = () => window.switchTab(state.user ? 'dashboard' : 'verification');

  const navVerify = document.getElementById('navVerifyBtn');
  if (navVerify) navVerify.onclick = () => window.switchTab('verification');

  const execVerify = document.getElementById('executeVerifyBtn');
  if (execVerify) execVerify.onclick = () => window.executeVerification();

  const searchInput = document.getElementById('verifySearchInput');
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') window.executeVerification();
    };
  }

  const loadSample = document.getElementById('loadSampleCertBtn');
  if (loadSample) loadSample.onclick = window.loadSampleCert;

  const downloadPdf = document.getElementById('btnDownloadVerifiedPdf');
  if (downloadPdf) {
    downloadPdf.onclick = () => {
      if (state.currentCert && state.currentCert.pdf_url) {
        const a = document.createElement('a');
        a.href = state.currentCert.pdf_url;
        a.download = state.currentCert.pdf_url.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Downloading official stamped PDF certificate...', 'success');
        return;
      }
      const cvs = document.getElementById('verifyCanvas');
      const name = (state.currentCert && state.currentCert.recipient_name) || 'Certificate';
      window.downloadCanvasAsPdf(cvs, `${name}_Verified_Certificate.pdf`);
    };
  }

  const copyLink = document.getElementById('btnCopyVerifyLink');
  if (copyLink) {
    copyLink.onclick = () => {
      if (!state.currentCert) return;
      const url = `${window.location.origin}/verify/${state.currentCert.cert_number}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Verification link copied to clipboard!', 'success');
      });
    };
  }

  const langSel = document.getElementById('langSelector');
  if (langSel) {
    langSel.onchange = (e) => {
      if (window.setLanguage) {
        window.setLanguage(e.target.value);
        showToast(`Language switched to ${e.target.options[e.target.selectedIndex].text}`, 'info');
      }
    };
  }

  const bulkFileInput = document.getElementById('bulkCsvFileInput');
  if (bulkFileInput) {
    bulkFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const ta = document.getElementById('bulkCsvTextInput');
        if (ta) ta.value = event.target.result;
        showToast(`Loaded ${file.name} successfully!`, 'success');
      };
      reader.readAsText(file);
    };
  }

  const expCsv = document.getElementById('btnExportCsv');
  if (expCsv) {
    expCsv.onclick = async () => {
      try {
        const res = await fetch(`${API_BASE}/certificates?limit=1000`, {
          headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : {}
        });
        const d = await res.json();
        const certs = d.certificates || [];
        if (!certs.length) {
          showToast('No certificates found to export', 'info');
          return;
        }
        const headers = ['Certificate Number', 'Recipient Name', 'Member ID', 'Category', 'Position', 'Event', 'Year', 'Issue Date', 'Status', 'Verification URL'];
        const rows = certs.map(c => [
          `"${c.cert_number || ''}"`,
          `"${(c.recipient_name || '').replace(/"/g, '""')}"`,
          `"${c.member_id || ''}"`,
          `"${c.type_name || ''}"`,
          `"${(c.position_held || '').replace(/"/g, '""')}"`,
          `"${(c.event_name || '').replace(/"/g, '""')}"`,
          `"${c.event_year || ''}"`,
          `"${c.issue_date || ''}"`,
          `"${c.status || ''}"`,
          `"${c.verification_url || ''}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `AISC_Certificates_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Exported certificates to CSV!', 'success');
      } catch (err) {
        showToast('Export error: ' + err.message, 'error');
      }
    };
  }

  const expJson = document.getElementById('btnExportJson');
  if (expJson) {
    expJson.onclick = async () => {
      try {
        const res = await fetch(`${API_BASE}/certificates?limit=1000`, {
          headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : {}
        });
        const d = await res.json();
        const certs = d.certificates || [];
        const blob = new Blob([JSON.stringify(certs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `AISC_Certificates_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Exported certificates to JSON!', 'success');
      } catch (err) {
        showToast('Export error: ' + err.message, 'error');
      }
    };
  }

  const autoWording = document.getElementById('btnAutoGenerateWording');
  if (autoWording) autoWording.onclick = window.autoGenerateWording;

  const typeSelect = document.getElementById('certTypeSelect');
  if (typeSelect) typeSelect.onchange = window.autoGenerateWording;

  const submitCert = document.getElementById('btnSubmitCertificate');
  if (submitCert) submitCert.onclick = window.submitCertificate;

  const downloadEditorPdf = document.getElementById('btnDownloadEditorPdf');
  if (downloadEditorPdf) {
    downloadEditorPdf.onclick = () => {
      window.downloadCanvasAsPdf(document.getElementById('certCanvas'), 'Preview_Certificate.pdf');
    };
  }

  const processBulk = document.getElementById('btnProcessBulk');
  if (processBulk) processBulk.onclick = window.processBulkImport;

  const sampleCsvBtn = document.getElementById('btnDownloadCsvSample');
  if (sampleCsvBtn) {
    sampleCsvBtn.onclick = () => {
      const csvContent = "data:text/csv;charset=utf-8,Full Name,Member ID,Certificate Type,Event Name,Event Year,Award Title,Email\nAlex Morgan,MEM-001,winner,AI Hackathon,2024,1st Place,alex@example.com\nSarah Connor,MEM-002,participation,AI Bootcamp,2024,Participant,sarah@example.com";
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", "AISC_Recipients_Sample.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
  }

  const filterLib = document.getElementById('btnFilterLibrary');
  if (filterLib) filterLib.onclick = window.loadLibrary;

  const openLogin = document.getElementById('navLoginBtn');
  if (openLogin) openLogin.onclick = window.openLoginModal;

  const closeLogin = document.getElementById('closeLoginModalBtn');
  if (closeLogin) closeLogin.onclick = window.closeLoginModal;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = window.logout;

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('cert_token', data.token);

        window.closeLoginModal();
        showToast(`Welcome back, ${data.user.full_name}!`, 'success');
        updateAuthUI(true);
        window.switchTab('dashboard');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Club Settings Form
  const settingsForm = document.getElementById('clubSettingsForm');
  if (settingsForm) {
    settingsForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const updates = {
          club_name: document.getElementById('setClubName').value,
          club_abbr: document.getElementById('setClubAbbr').value,
          official_website_url: document.getElementById('setOfficialUrl').value,
          homepage_url: document.getElementById('setHomepageUrl').value,
          contact_email: document.getElementById('setContactEmail').value,
          contact_phone: document.getElementById('setContactPhone').value,
          club_address: document.getElementById('setClubAddress').value,
          reg_number: document.getElementById('setRegNumber').value,
          president_name: document.getElementById('setPresidentName').value,
          secretary_name: document.getElementById('setSecretaryName').value,
          authorizing_officer_name: document.getElementById('setAuthOfficer').value
        };

        const res = await fetch(`${API_BASE}/settings/club`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Official AISC settings updated!', 'success');
          state.club = { ...state.club, ...updates };
          document.getElementById('headerClubName').textContent = updates.club_name;
          const visitBtn = document.getElementById('btnVisitOfficialClub');
          if (visitBtn) visitBtn.href = updates.official_website_url;
        } else {
          showToast(data.error, 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Integration subtabs
  ['Iframe', 'Direct', 'Api', 'Webhooks'].forEach(name => {
    const btn = document.getElementById('btnTab' + name);
    if (btn) {
      btn.onclick = () => {
        ['Iframe', 'Direct', 'Api', 'Webhooks'].forEach(t => {
          const b = document.getElementById('btnTab' + t);
          const p = document.getElementById('panel' + t);
          if (b) b.classList.remove('active');
          if (p) p.style.display = 'none';
        });
        btn.classList.add('active');
        const activePanel = document.getElementById('panel' + name);
        if (activePanel) activePanel.style.display = 'block';
        if (name === 'Api') loadIntegration();
      };
    }
  });

  // API Key creation
  const createApiKeyBtn = document.getElementById('btnCreateApiKey');
  if (createApiKeyBtn) {
    createApiKeyBtn.onclick = async () => {
      const name = prompt('Enter a descriptive name for this API Key (e.g. Website Integration):', 'Club Website API');
      if (!name) return;
      try {
        const res = await fetch(`${API_BASE}/integration/keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) {
          prompt('Save your new API Key now (it will not be shown again):', data.api_key);
          loadIntegration();
        } else {
          showToast(data.error, 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  const addWebhook = document.getElementById('btnAddWebhookBtn');
  if (addWebhook) {
    addWebhook.onclick = async () => {
      if (!state.token) {
        showToast('Please sign in to the Admin Portal to register webhooks (e.g. admin@club.org / admin123)', 'warning');
        window.openLoginModal();
        return;
      }
      const url = prompt('Enter Webhook destination URL:', 'https://imrdaisc.vercel.app/api/cert-hook');
      if (!url) return;
      try {
        const res = await fetch(`${API_BASE}/integration/webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({ url, events: ['certificate.issued', 'certificate.verified'] })
        });
        const d = await res.json();
        if (d.success) {
          showToast('Webhook registered successfully!', 'success');
          loadIntegration();
        } else {
          showToast(d.error || 'Failed to register webhook', 'error');
        }
      } catch (e) {
        showToast('Webhook error: ' + e.message, 'error');
      }
    };
  }

  // Synchronize Studio inputs on keystroke
  [
    'certTypeSelect', 'certRecipientName', 'certDisplayName', 'certPosition',
    'certEventName', 'certEventYear', 'certAwardTitle', 'certIssueDate',
    'certAchievement', 'certThemeSelect', 'certApproverName', 'certApproverTitle'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderStudioCertificate);
  });
});
