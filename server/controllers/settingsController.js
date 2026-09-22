const db = require('../config/database');
const { logAudit } = require('../middleware/auth');

// Get all club settings as a clean key-value dictionary
exports.getClubSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, description FROM club_settings').all();
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    });

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Public club information endpoint for public verification & embedding
exports.getPublicClubInfo = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT key, value FROM club_settings 
      WHERE key IN (
        'club_name', 'club_abbr', 'club_logo', 'official_website_url', 
        'homepage_url', 'contact_email', 'contact_phone', 'club_address',
        'reg_number', 'social_links', 'president_name', 'secretary_name',
        'authorizing_officer_name', 'club_colors', 'official_seal'
      )
    `).all();

    const info = {};
    rows.forEach(r => {
      try {
        info[r.key] = JSON.parse(r.value);
      } catch (e) {
        info[r.key] = r.value;
      }
    });

    res.json({ success: true, club: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update club settings (admin only)
exports.updateClubSettings = (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload' });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO club_settings (key, value, updated_at, updated_by)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value, 
        updated_at = CURRENT_TIMESTAMP,
        updated_by = excluded.updated_by
    `);

    const updateTx = db.transaction(() => {
      for (const [key, val] of Object.entries(updates)) {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        upsertStmt.run(key, valStr, req.user ? req.user.email : 'system');
      }
    });

    updateTx();

    logAudit(
      req.user ? req.user.id : 'system',
      req.user ? req.user.email : 'system',
      'UPDATE_SETTINGS',
      'club_settings',
      'all',
      Object.keys(updates),
      req.ip
    );

    res.json({ success: true, message: 'Club settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Certificate Types
exports.listCertificateTypes = (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM certificate_types ORDER BY is_system DESC, name ASC').all();
    res.json({ success: true, types });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCertificateType = (req, res) => {
  try {
    const { name, slug, description, wording_template } = req.body;
    if (!name || !wording_template) {
      return res.status(400).json({ success: false, error: 'Name and wording template are required' });
    }

    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = 'typ_' + Math.random().toString(36).substring(2, 10);

    db.prepare(`
      INSERT INTO certificate_types (id, slug, name, description, wording_template, is_system)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(id, cleanSlug, name, description || '', wording_template);

    logAudit(req.user.id, req.user.email, 'CREATE_TYPE', 'certificate_types', id, { name }, req.ip);

    res.status(201).json({ success: true, id, slug: cleanSlug });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Templates
exports.listTemplates = (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM certificate_templates ORDER BY is_default DESC, name ASC').all();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateTemplate = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, theme, orientation, page_size, font_family, font_size,
      primary_color, accent_color, border_style, show_seal, show_barcode, show_qr, layout_config
    } = req.body;

    db.prepare(`
      UPDATE certificate_templates SET
        name = COALESCE(?, name),
        theme = COALESCE(?, theme),
        orientation = COALESCE(?, orientation),
        page_size = COALESCE(?, page_size),
        font_family = COALESCE(?, font_family),
        font_size = COALESCE(?, font_size),
        primary_color = COALESCE(?, primary_color),
        accent_color = COALESCE(?, accent_color),
        border_style = COALESCE(?, border_style),
        show_seal = COALESCE(?, show_seal),
        show_barcode = COALESCE(?, show_barcode),
        show_qr = COALESCE(?, show_qr),
        layout_config = COALESCE(?, layout_config)
      WHERE id = ?
    `).run(
      name, theme, orientation, page_size, font_family, font_size,
      primary_color, accent_color, border_style, show_seal, show_barcode, show_qr,
      typeof layout_config === 'object' ? JSON.stringify(layout_config) : layout_config,
      id
    );

    res.json({ success: true, message: 'Template updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
