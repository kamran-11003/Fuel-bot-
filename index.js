/**
 * Fuel Complaint Bot - Express Server
 * WhatsApp Cloud API webhook handler
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const { parseWebhookMessage, markAsRead } = require('./src/whatsapp');
const { handleMessage } = require('./src/handler');
const { initSupabase } = require('./src/session');

const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Privacy page
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Admin dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /webhook - Meta webhook verification
 * Meta sends a GET request to verify the webhook URL
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /webhook - Incoming WhatsApp messages
 * This is the main entry point for all incoming messages
 */
app.post('/webhook', async (req, res) => {
  // Return 200 immediately to acknowledge receipt
  res.sendStatus(200);
  
  try {
    const body = req.body;
    
    // Log incoming payload (for debugging)
    console.log('Webhook received:', JSON.stringify(body, null, 2));
    
    // Parse the webhook message
    const parsed = parseWebhookMessage(body);
    
    if (!parsed) {
      console.log('No message to process');
      return;
    }
    
    const { messageId, from, message } = parsed;
    
    console.log(`Message from ${from}:`, message.type);
    
    // Mark message as read (async, don't wait)
    markAsRead(messageId).catch(console.error);
    
    // Handle the message through the state machine
    await handleMessage(from, message);
    
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

/**
 * API endpoint to get complaints (for admin dashboard)
 */
app.get('/api/complaints', async (req, res) => {
  try {
    const { getSupabase } = require('./src/session');
    const db = getSupabase();
    
    const { data, error } = await db
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    res.json({ success: true, complaints: data });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to get complaint by ID
 */
app.get('/api/complaints/:id', async (req, res) => {
  try {
    const { getSupabase } = require('./src/session');
    const db = getSupabase();
    
    const { data, error } = await db
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }
    
    res.json({ success: true, complaint: data });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to update complaint status
 */
app.patch('/api/complaints/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const { getSupabase } = require('./src/session');
    const db = getSupabase();
    
    const { data, error } = await db
      .from('complaints')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, complaint: data });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Fuel Complaint Bot server running on port ${PORT}`);
  
  // Initialize Supabase connection
  try {
    initSupabase();
    console.log('✅ Supabase connected');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
  
  console.log(`
📱 Webhook endpoints:
   GET  /webhook  - Meta verification
   POST /webhook  - Incoming messages

🔧 API endpoints:
   GET   /api/complaints            - List all complaints
   GET   /api/complaints/:id        - Get complaint by ID
   PATCH /api/complaints/:id/status - Update complaint status

🌐 Pages:
   GET  /            - WhatsApp bot prototype
   GET  /dashboard   - Admin complaints dashboard
   GET  /privacy     - Privacy policy
  `);
});
