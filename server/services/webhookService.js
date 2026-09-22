const crypto = require('crypto');
const db = require('../config/database');

/**
 * Dispatches webhook events to all active registered subscribers.
 */
async function dispatchWebhook(eventType, payload) {
  try {
    const hooks = db.prepare(`
      SELECT * FROM webhooks 
      WHERE is_active = 1 AND (event_types LIKE ? OR event_types = '*')
    `).all(`%${eventType}%`);

    if (!hooks || hooks.length === 0) return;

    const dataString = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    });

    for (const hook of hooks) {
      try {
        const signature = crypto.createHmac('sha256', hook.secret || 'default-secret')
          .update(dataString)
          .digest('hex');

        // Non-blocking fetch with timeout
        fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Club-Event': eventType,
            'X-Club-Signature': signature,
            'User-Agent': 'ClubCertificateSystem-Webhook/1.0'
          },
          body: dataString,
          signal: AbortSignal.timeout(5000)
        }).then(res => {
          if (res.ok) {
            db.prepare('UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?').run(hook.id);
          } else {
            db.prepare('UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = ?').run(hook.id);
          }
        }).catch(err => {
          console.warn(`Webhook failed for ${hook.url}:`, err.message);
          db.prepare('UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = ?').run(hook.id);
        });
      } catch (innerErr) {
        console.warn('Webhook dispatch loop error:', innerErr);
      }
    }
  } catch (err) {
    console.error('Failed to dispatch webhooks:', err);
  }
}

module.exports = {
  dispatchWebhook
};
