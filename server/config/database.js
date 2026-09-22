const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/certificates.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency (with fallback for network/volume storage)
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('SQLite WAL mode initialization notice:', e.message);
}
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    -- Users and Authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'cert_admin', 'approver', 'verifier', 'readonly')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    -- Official Club Settings
    CREATE TABLE IF NOT EXISTS club_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    );

    -- Certificate Types (Categories)
    CREATE TABLE IF NOT EXISTS certificate_types (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      wording_template TEXT NOT NULL,
      is_system INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Certificate Templates (Design Layouts)
    CREATE TABLE IF NOT EXISTS certificate_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'classic_gold',
      orientation TEXT NOT NULL DEFAULT 'landscape',
      page_size TEXT NOT NULL DEFAULT 'A4',
      font_family TEXT NOT NULL DEFAULT 'Inter, sans-serif',
      font_size INTEGER DEFAULT 52,
      primary_color TEXT DEFAULT '#b8860b',
      accent_color TEXT DEFAULT '#1a365d',
      border_style TEXT DEFAULT 'ornate_gold',
      show_seal INTEGER DEFAULT 1,
      show_barcode INTEGER DEFAULT 1,
      show_qr INTEGER DEFAULT 1,
      layout_config TEXT, -- JSON layout details
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Recipients
    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      member_id TEXT,
      membership_status TEXT DEFAULT 'Official member',
      position_held TEXT,
      department TEXT,
      photo_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Certificates
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      cert_number TEXT UNIQUE NOT NULL,
      recipient_id TEXT,
      recipient_name TEXT NOT NULL,
      recipient_display_name TEXT,
      recipient_email TEXT,
      recipient_photo TEXT,
      member_id TEXT,
      membership_status TEXT,
      position_held TEXT,
      department TEXT,
      type_id TEXT NOT NULL,
      type_name TEXT NOT NULL,
      award_title TEXT,
      achievement_text TEXT NOT NULL,
      event_name TEXT,
      event_year INTEGER,
      event_date TEXT,
      location TEXT,
      membership_start TEXT,
      membership_end TEXT,
      position_start TEXT,
      position_end TEXT,
      result_rank TEXT,
      score TEXT,
      category TEXT,
      issue_date TEXT NOT NULL,
      issued_by TEXT,
      approver_name TEXT,
      approver_title TEXT,
      approver_signature TEXT,
      secondary_approver_name TEXT,
      secondary_approver_title TEXT,
      secondary_approver_signature TEXT,
      template_id TEXT,
      theme TEXT DEFAULT 'classic_gold',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_approval', 'approved', 'issued', 'revoked', 'expired', 'suspended', 'superseded')),
      privacy_settings TEXT, -- JSON for public field visibility
      qr_data TEXT NOT NULL,
      barcode_data TEXT NOT NULL,
      verification_url TEXT NOT NULL,
      tamper_hash TEXT NOT NULL,
      pdf_hash TEXT,
      version INTEGER DEFAULT 1,
      superseded_by TEXT,
      supersede_reason TEXT,
      created_by TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      revoked_by TEXT,
      revoked_at DATETIME,
      revoke_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(recipient_id) REFERENCES recipients(id) ON DELETE SET NULL,
      FOREIGN KEY(type_id) REFERENCES certificate_types(id)
    );

    -- Certificate Versions & Audit Snapshots
    CREATE TABLE IF NOT EXISTS certificate_versions (
      id TEXT PRIMARY KEY,
      certificate_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      cert_number TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
    );

    -- Approvals Workflow
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      certificate_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approver_id TEXT,
      approver_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      comments TEXT,
      signature_data TEXT,
      decision_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
    );

    -- Public Verification Logs
    CREATE TABLE IF NOT EXISTS verification_logs (
      id TEXT PRIMARY KEY,
      certificate_id TEXT,
      query_term TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status_returned TEXT NOT NULL,
      tamper_detected INTEGER DEFAULT 0,
      verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Audit Trail
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- API Keys for Website Integration
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT DEFAULT 'read,verify',
      created_by TEXT,
      is_active INTEGER DEFAULT 1,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Webhooks
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      event_types TEXT NOT NULL, -- comma separated
      secret TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      failure_count INTEGER DEFAULT 0,
      last_triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for fast search and lookup
    CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON certificates(cert_number);
    CREATE INDEX IF NOT EXISTS idx_certificates_public_id ON certificates(public_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
    CREATE INDEX IF NOT EXISTS idx_certificates_recipient ON certificates(recipient_name);
    CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type_id);
    CREATE INDEX IF NOT EXISTS idx_verification_logs_cert ON verification_logs(certificate_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  `);
}

initSchema();

module.exports = db;
