# Website Integration Guide: Connecting to Your Existing Club Website

This guide explains how to connect this **Certificate Generation and Verification System** to your existing club website.

---

## 1. Direct Link Integration (Simplest & Recommended)

You can link directly to the Public Verification Portal from your existing website navigation menu, footer, or announcement banners.

### Navbar Link Example:
```html
<a href="https://cert.yourclub.org/verify" target="_blank" class="nav-link">
  Verify Certificate Authenticity
</a>
```

### Specific Certificate Direct Verification:
When printing or sharing a link with a member, provide their direct certificate URL:
```text
https://cert.yourclub.org/verify/CLUB-2024-LEAD-00001
```

The system automatically opens the verification record with the prominent **"VERIFIED AND VALID"** badge, SHA-256 tamper integrity status, and a button titled **"Visit Official Club Website"** linking back to your main site homepage.

---

## 2. Embedded Iframe Widget

To allow members and employers to verify credentials directly on an existing page without leaving your website (e.g. `https://yourclub.org/verify`), embed our clean iframe widget:

```html
<!-- Embed Certificate Verification Widget on Existing Club Website -->
<div class="club-verify-widget-container" style="max-width: 900px; margin: 0 auto; padding: 20px;">
  <iframe 
    src="https://cert.yourclub.org/embed/verify" 
    width="100%" 
    height="680px" 
    frameborder="0" 
    scrolling="auto"
    style="border-radius: 14px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.15);"
    title="Official Certificate Verification Portal">
  </iframe>
</div>
```

---

## 3. REST API Integration

If your existing website has a backend (Node.js, PHP, Python, Ruby, Go, WordPress, etc.), you can communicate with this system via REST API using your secret API Key.

### Generating an API Key:
1. Log in to the Admin Dashboard (`admin@club.org`).
2. Go to **Website Integration** > **REST API & Keys**.
3. Click **Generate New API Key**.
4. Copy the generated key (e.g., `clb_a1b2c3d4.e5f6g7h8...`).

### Endpoint: Check Certificate Validity
```http
GET /api/v1/verify/CLUB-2024-LEAD-00001 HTTP/1.1
Host: cert.yourclub.org
```

#### Node.js / JavaScript Example:
```javascript
async function verifyCertificate(certNumber) {
  const response = await fetch(`https://cert.yourclub.org/api/v1/verify/${encodeURIComponent(certNumber)}`);
  const result = await response.json();
  
  if (result.success && result.is_valid) {
    console.log(`Certificate is authentic! Recipient: ${result.certificate.recipient_name}`);
    return true;
  } else {
    console.warn(`Verification failed: ${result.tamper_check.message}`);
    return false;
  }
}
```

#### PHP Example:
```php
<?php
function verifyCertificate($certNumber) {
    $url = "https://cert.yourclub.org/api/v1/verify/" . urlencode($certNumber);
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    
    if ($data && $data['success'] && $data['is_valid']) {
        return "Valid certificate for: " . htmlspecialchars($data['certificate']['recipient_name']);
    }
    return "Invalid or unverified certificate.";
}
?>
```

#### Python Example:
```python
import requests

def verify_certificate(cert_number):
    url = f"https://cert.yourclub.org/api/v1/verify/{cert_number}"
    res = requests.get(url)
    data = res.json()
    
    if data.get("is_valid"):
        print(f"Verified: {data['certificate']['recipient_name']} - {data['certificate']['award_title']}")
    else:
        print("Tamper detected or certificate invalid.")
```

---

## 4. Webhook Integration

Configure webhooks in the Admin Portal to receive instant POST notifications whenever:
- `certificate.issued`
- `certificate.approved`
- `certificate.revoked`
- `certificate.verified`

### Verifying Webhook Signatures (Node.js):
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req, secret) {
  const signature = req.headers['x-club-signature'];
  const expected = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === expected;
}
```
