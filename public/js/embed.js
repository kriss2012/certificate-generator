/**
 * Club Certificate Verification Embed Widget
 * Can be embedded on any external club website.
 * Usage:
 * <div id="club-certificate-verifier" data-base-url="https://YOUR-DOMAIN.com"></div>
 * <script src="https://YOUR-DOMAIN.com/js/embed.js"></script>
 */

(function () {
  const container = document.getElementById('club-certificate-verifier');
  if (!container) return;

  const scriptTag = document.currentScript;
  const defaultBase = scriptTag ? new URL(scriptTag.src).origin : window.location.origin;
  const baseUrl = container.getAttribute('data-base-url') || defaultBase;

  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}/embed/verify`;
  iframe.style.width = '100%';
  iframe.style.minHeight = '480px';
  iframe.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
  iframe.style.background = '#0f172a';
  iframe.allowTransparency = 'true';

  container.appendChild(iframe);
})();
