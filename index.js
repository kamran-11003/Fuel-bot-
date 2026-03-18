'use strict';

/**
 * Fuel Complaint Bot — Express server
 *
 * Routes:
 *   GET/POST /webhook                      WhatsApp Cloud API webhook
 *   POST     /api/complaints/:code/status  Proactive status update (in_progress / resolved)
 *   GET      /api/queue/length             Current dispatch queue depth
 *   GET      /health                       Liveness probe
 *   GET      /api/bot-info                 Landing page WhatsApp link helper
 *   Static   / | /privacy
 */

require('dotenv').config();

const express = require('express');
const path    = require('path');

const { parseWebhookMessage, markAsRead, sendTextMessage } = require('./src/whatsapp');
const { handleMessage }    = require('./src/handler');
const { startCronWorker }  = require('./src/cron');
const {
  getComplaintRecord,
  updateComplaintRecord,
  queueLength
} = require('./src/redis');
const { getMessage } = require('./src/i18n');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ── Static pages ──────────────────────────────────────────────────────────────

app.get('/privacy',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));

// ── Utility endpoints ─────────────────────────────────────────────────────────

app.get('/api/bot-info', (_, res) => {
  res.json({
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    phoneNumber:   process.env.WHATSAPP_DISPLAY_NUMBER  || null
  });
});

app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/queue/length', async (_, res) => {
  try {
    res.json({ success: true, queueLength: await queueLength() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── WhatsApp webhook ──────────────────────────────────────────────────────────

app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  try {
    const parsed = parseWebhookMessage(req.body);
    if (!parsed) return;

    const { messageId, from, message } = parsed;
    markAsRead(messageId).catch(console.error);
    await handleMessage(from, message);
  } catch (err) {
    console.error('[webhook] Error:', err);
  }
});

// ── Status update endpoint (called by admin / gov API callback) ───────────────

app.post('/api/complaints/:code/status', async (req, res) => {
  try {
    const { code }    = req.params;
    const { status, remarks } = req.body;

    const valid = ['in_progress', 'resolved'];
    if (!valid.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${valid.join(', ')}`
      });
    }

    const complaint = await getComplaintRecord(code);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    // Validate remarks for resolved status
    if (status === 'resolved' && !(remarks || '').trim()) {
      return res.status(400).json({ success: false, error: 'remarks is required for resolved status' });
    }

    // Sanitise remarks before embedding in message to prevent injection
    const safeRemarks = (remarks || '').trim().replace(/[<>"]/g, '');

    // Persist updated status
    await updateComplaintRecord(code, { status, updatedAt: new Date().toISOString() });

    // Build and send WhatsApp notification in the user's language
    const lang = complaint.language || 'EN';
    const msgFn = getMessage(lang, status === 'in_progress' ? 'STATUS_IN_PROGRESS_MSG' : 'STATUS_RESOLVED_MSG');
    const msg   = status === 'in_progress' ? msgFn(code) : msgFn(code, safeRemarks);

    await sendTextMessage(complaint.phoneNumber, msg);

    res.json({ success: true });
  } catch (err) {
    console.error('[status-update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Fuel Complaint Bot running on port ${PORT}`);

  startCronWorker();

  console.log(`
📱 Webhook:
   GET  /webhook          Meta verification
   POST /webhook          Incoming messages

🔔 Admin / Gov API callbacks:
   POST /api/complaints/:code/status   Update status (in_progress | resolved)
   GET  /api/queue/length              Queue depth

🌐 Pages:
   /            Landing page
   /demo        WhatsApp simulator
   /dashboard   Admin dashboard
   /privacy     Privacy policy
  `);
});
