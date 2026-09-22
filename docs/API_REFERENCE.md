# REST API Reference Manual

The Certificate Generation and Verification System provides a comprehensive REST API.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Protected endpoints require either:
1. Bearer JWT Token in `Authorization` header:
   ```http
   Authorization: Bearer <token>
   ```
2. API Key in `X-API-Key` header:
   ```http
   X-API-Key: clb_xxxxxxxx.yyyyyyyyyyyyyyyy
   ```

---

## Public Endpoints

### 1. Verify Certificate
`GET /verify/:identifier`

Lookup by `cert_number` (e.g. `CLUB-2024-LEAD-00001`) or `public_id`.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "issued",
  "status_badge": "VERIFIED AND VALID",
  "is_valid": true,
  "tamper_check": {
    "matches_record": true,
    "message": "Certificate data matches the official cryptographic record."
  },
  "verification_timestamp": "2026-09-22T08:24:00.000Z",
  "club": {
    "name": "RCPIMRD AI Student Chapters",
    "abbr": "AISC",
    "official_website_url": "https://rcpimrd.ac.in",
    "president_name": "Dr. Vaishali Patil"
  },
  "certificate": {
    "cert_number": "CLUB-2024-LEAD-00001",
    "recipient_name": "Alex Morgan",
    "type_name": "Leadership and Participation Certificate",
    "award_title": "Club President Honor",
    "achievement_text": "Served as President, remained an official member, and participated in the club’s 2024 activities.",
    "event_name": "Annual Tech & AI Symposium",
    "event_year": 2024,
    "issue_date": "2024-12-15",
    "approver_name": "Dr. Vaishali Patil",
    "approver_title": "President & Approving Authority",
    "qr_data": "data:image/png;base64,...",
    "verification_url": "http://localhost:3000/verify/CLUB-2024-LEAD-00001"
  }
}
```

### 2. Public Club Metadata
`GET /public/club`

Returns official club branding, logo path, and the configured `OFFICIAL_CLUB_WEBSITE_URL`.

---

## Authenticated Endpoints

### 3. Login
`POST /auth/login`
```json
{
  "email": "admin@club.org",
  "password": "admin123"
}
```

### 4. Create Certificate
`POST /certificates`
```json
{
  "recipient_name": "Alex Morgan",
  "type_id": "typ_leadership",
  "event_name": "Annual Tech & AI Symposium",
  "event_year": 2024,
  "issue_date": "2024-12-15",
  "achievement_text": "Served as President and contributed to all 2024 club activities.",
  "theme": "classic_gold",
  "approver_name": "Dr. Vaishali Patil",
  "approver_title": "President"
}
```

### 5. Bulk Certificate Creation
`POST /certificates/bulk`
```json
{
  "items": [
    {
      "recipient_name": "Jane Doe",
      "member_id": "MEM-101",
      "type_id": "typ_winner",
      "event_name": "AI Hackathon",
      "event_year": 2024,
      "award_title": "First Place"
    }
  ],
  "auto_issue": true
}
```

### 6. Revoke Certificate
`POST /certificates/:id/revoke`
```json
{
  "reason": "Administrative correction or award cancellation"
}
```

### 7. Supersede Certificate
`POST /certificates/:id/supersede`
```json
{
  "recipient_name": "Alex Morgan (Corrected Spelling)",
  "reason": "Corrected typographical error in recipient name"
}
```
Creates a new certificate with a new unique certificate number, updates the old certificate to `superseded` status, and retains the full audit trail.
