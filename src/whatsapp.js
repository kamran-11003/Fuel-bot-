/**
 * WhatsApp Cloud API helpers
 */

const axios = require('axios');

const WA_API = 'https://graph.facebook.com/v18.0';

function cfg() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken:   process.env.WHATSAPP_ACCESS_TOKEN
  };
}

function headers() {
  return {
    'Authorization': `Bearer ${cfg().accessToken}`,
    'Content-Type':  'application/json'
  };
}

/**
 * Send a plain text message
 */
async function sendTextMessage(to, text) {
  const { phoneNumberId } = cfg();
  await axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text }
  }, { headers: headers() }).catch(e =>
    console.error('sendTextMessage error:', e.response?.data || e.message)
  );
}

/**
 * Send interactive button message (max 3 buttons)
 */
async function sendButtonMessage(to, bodyText, buttons) {
  const { phoneNumberId } = cfg();
  await axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type:  'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) }
        }))
      }
    }
  }, { headers: headers() }).catch(e =>
    console.error('sendButtonMessage error:', e.response?.data || e.message)
  );
}

/**
 * Send interactive list message — single section (max 10 rows)
 */
async function sendListMessage(to, bodyText, buttonText, items, sectionTitle = 'Options') {
  const { phoneNumberId } = cfg();
  await axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20),
        sections: [{
          title: sectionTitle.slice(0, 24),
          rows:  items.slice(0, 10).map(i => ({
            id:          i.id,
            title:       i.title.slice(0, 24),
            description: (i.description || '').slice(0, 72)
          }))
        }]
      }
    }
  }, { headers: headers() }).catch(e =>
    console.error('sendListMessage error:', e.response?.data || e.message)
  );
}

/**
 * Send interactive list message — multiple sections
 * @param {Array<{ title: string, items: Array<{ id, title, description? }> }>} sections
 */
async function sendMultiSectionListMessage(to, bodyText, buttonText, sections) {
  const { phoneNumberId } = cfg();
  await axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map(s => ({
          title: s.title.slice(0, 24),
          rows:  s.items.slice(0, 10).map(i => ({
            id:          i.id,
            title:       i.title.slice(0, 24),
            description: (i.description || '').slice(0, 72)
          }))
        }))
      }
    }
  }, { headers: headers() }).catch(e =>
    console.error('sendMultiSectionListMessage error:', e.response?.data || e.message)
  );
}

/**
 * Mark a message as read
 */
async function markAsRead(messageId) {
  const { phoneNumberId } = cfg();
  await axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    status:            'read',
    message_id:        messageId
  }, { headers: headers() }).catch(e =>
    console.error('markAsRead error:', e.response?.data || e.message)
  );
}

// ---------------------------------------------------------------------------
// Webhook parsing
// ---------------------------------------------------------------------------

/**
 * Extract message + metadata from webhook body
 * Returns null if no user message present (e.g. status update)
 */
function parseWebhookMessage(body) {
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return null;

    return {
      messageId: msg.id,
      from:      msg.from,
      message:   msg
    };
  } catch (err) {
    console.error('parseWebhookMessage error:', err);
    return null;
  }
}

/**
 * Normalise any incoming message into a simple { type, value } object
 */
function getUserInput(message) {
  // Button reply
  if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
    const r = message.interactive.button_reply;
    return { type: 'button', value: r.id, title: r.title };
  }

  // List reply
  if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
    const r = message.interactive.list_reply;
    return { type: 'list', value: r.id, title: r.title };
  }

  // Text
  if (message.type === 'text') {
    return { type: 'text', value: message.text?.body || '' };
  }

  // Location
  if (message.type === 'location') {
    return {
      type:  'location',
      value: {
        latitude:  message.location.latitude,
        longitude: message.location.longitude,
        name:      message.location.name,
        address:   message.location.address
      }
    };
  }

  // Image
  if (message.type === 'image') {
    return {
      type:  'image',
      value: { id: message.image.id, mimeType: message.image.mime_type }
    };
  }

  return { type: 'unknown', value: null };
}

/**
 * Check if message text is a start/restart trigger
 */
function isStartTrigger(text) {
  if (!text) return false;
  return ['start', 'hi', 'hello', 'shuru', 'restart', 'menu', 'helo']
    .includes(text.toLowerCase().trim());
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  sendMultiSectionListMessage,
  markAsRead,
  parseWebhookMessage,
  getUserInput,
  isStartTrigger
};
