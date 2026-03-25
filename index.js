/**
 * Fuel Complaint Bot — Express server
 * WhatsApp Cloud API webhook + static pages + in-memory complaints API
 */

require('dotenv').config();

const express = require('express');
const path    = require('path');

const { parseWebhookMessage, markAsRead } = require('./src/whatsapp');
const { handleMessage }                   = require('./src/handler');
const { getComplaints }                   = require('./src/session');
const { getMediaUrl, downloadMedia }       = require('./src/media');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

app.get('/',          (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (_, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/privacy',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // acknowledge immediately

  try {
    const parsed = parseWebhookMessage(req.body);
    if (!parsed) return;

    const { messageId, from, message } = parsed;
    console.log(`📨 Message from ${from} [${message.type}]`);

    markAsRead(messageId).catch(() => {});
    await handleMessage(from, message);
  } catch (err) {
    console.error('Webhook error:', err);
  }
});

// ---------------------------------------------------------------------------
// Complaints API (in-memory)
// ---------------------------------------------------------------------------

app.get('/api/complaints', (req, res) => {
  const complaints = getComplaints();
  res.json({ success: true, total: complaints.length, complaints });
});

app.get('/api/complaints/:code', (req, res) => {
  const complaints = getComplaints();
  const complaint  = complaints.find(c => c.complaint_code === req.params.code);
  if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, complaint });
});

// Status update (in-memory patch)
app.patch('/api/complaints/:code/status', (req, res) => {
  const valid = ['pending', 'in_progress', 'resolved', 'rejected'];
  const { status } = req.body;

  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, error: `Status must be one of: ${valid.join(', ')}` });
  }

  const complaints = getComplaints();
  const complaint  = complaints.find(c => c.complaint_code === req.params.code);
  if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });

  complaint.status = status;
  res.json({ success: true, complaint });
});

// Bot phone number for the landing page link
app.get('/api/bot-info', (req, res) => {
  res.json({ phoneNumber: process.env.WHATSAPP_DISPLAY_NUMBER || null });
});

// Image proxy — securely fetch WhatsApp media and serve to dashboard
app.get('/api/media/:mediaId', async (req, res) => {
  const mediaId = req.params.mediaId;

  // Validate media ID format (numeric string)
  if (!/^\d+$/.test(mediaId)) {
    return res.status(400).json({ success: false, error: 'Invalid media ID' });
  }

  try {
    const media = await getMediaUrl(mediaId);
    const { buffer, contentType } = await downloadMedia(media.url);
    const mime = media.mimeType || contentType || 'image/jpeg';

    res.set({
      'Content-Type': mime,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="complaint-${mediaId}.jpg"`
    });
    res.send(buffer);
  } catch (err) {
    console.error('Media proxy error:', err.message);
    res.status(502).json({ success: false, error: 'Could not fetch image' });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🚀 Fuel Complaint Bot running on port ${PORT}`);
  console.log(`\n📱 Webhook:    GET/POST /webhook`);
  console.log(`🌐 Landing:    /`);
  console.log(`📊 Dashboard:  /dashboard`);
  console.log(`🔒 Privacy:    /privacy`);
  console.log(`🔧 API:        /api/complaints\n`);
});
