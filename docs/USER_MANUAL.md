# Official Club Certificate Management System — User Manual

This manual guides club administrators, approvers, and verification officers on how to operate the system.

---

## 1. System Access & Roles

The system uses Role-Based Access Control (RBAC):

| Role | Permissions | Default Credentials |
| :--- | :--- | :--- |
| **Super Administrator** | Full system control, club settings, audit logs, issue/revoke certificates, manage API keys | `admin@club.org` / `admin123` |
| **Certificate Admin** | Create certificates, manage recipients, generate PDFs, submit for approval | `manager@club.org` / `manager123` |
| **Approver** | Review pending certificates, approve or reject with comments, add digital signatures | `approver@club.org` / `approver123` |
| **Verifier** | Search and verify authenticity of certificates, view audit statuses | `verifier@club.org` / `verifier123` |
| **Read-Only** | View reports, statistics, and public records without edit permissions | `viewer@club.org` / `viewer123` |

---

## 2. Verifying a Certificate

Anyone can verify a certificate without logging in:
1. Open the verification URL (or scan the QR code on a printed certificate).
2. Or enter the Certificate Number (e.g. `CLUB-2024-LEAD-00001`) in the verification search bar.
3. If genuine, a prominent green banner displays: **"VERIFIED AND VALID"**.
4. The cryptographic SHA-256 validation confirms: *"Certificate data matches the official cryptographic record."*
5. Click **"Visit Official Club Website"** to visit the club homepage in a new tab.
6. Click **"Download PDF Certificate"** to get a high-resolution PDF copy.
7. Click social sharing icons (WhatsApp, LinkedIn, Telegram) to share the verified credential.

---

## 3. Creating a Certificate

1. Log in to the Admin Portal.
2. Click **Create Certificate**.
3. Select a category (Winner, Appreciation, Leadership, Membership, Participation, Service, Special Recognition).
4. Click **Auto-Generate** to automatically format official wording with placeholders.
5. Fill in recipient details (Full Name, Member ID, Event, Year, Award Title, Issue Date).
6. Select one of the **8 Design Themes** (Classic Gold, Royal Blue, Elegant Green, Modern Minimal, Academic, Sports Award, Corporate, Traditional Ceremonial).
7. Review the live interactive canvas preview (A4 Landscape 300 DPI).
8. Click **Issue / Save**.

---

## 4. Approval Workflow

1. When a Certificate Admin submits a draft certificate, it enters the **Approver Queue**.
2. An Approver logs in and navigates to the **Approvals** tab.
3. The Approver reviews the recipient details, achievement statement, and event metadata.
4. Click **Approve & Sign** to finalize and issue the certificate with an official cryptographic tamper hash and active verification URL.
5. Or click **Reject** and provide a reason to return the certificate to draft status with notes.

---

## 5. Bulk Generation

1. Navigate to the **Bulk Import** tab.
2. Upload a `.csv` file or paste comma-separated lines:
   ```csv
   Alex Morgan, MEM-001, winner, AI Hackathon, 2024, 1st Place, alex@example.com
   Sarah Connor, MEM-002, participation, AI Hackathon, 2024, Participant, sarah@example.com
   ```
3. Click **Generate Batch Certificates**.
4. The system validates each row, generates unique certificate numbers, and assigns unique QR codes.
5. Click **Download Batch as ZIP** to download all certificates in high-resolution image format.

---

## 6. Superseding & Revoking Certificates

- **Revocation**: If a certificate was issued erroneously or the award is cancelled, a Superadmin can click **Revoke** and enter the official reason. The public verification page will immediately display **"CERTIFICATE REVOKED"** with the reason and timestamp.
- **Superseding**: If there is a typo (e.g. spelling in the recipient's name), use **Supersede**. The system creates a corrected certificate with a new unique number and marks the original certificate as superseded, preserving full audit history.
