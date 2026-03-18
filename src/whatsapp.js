/**
 * WhatsApp Cloud API helpers
 */

const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Get WhatsApp API config from env
 * @returns {object}
 */
function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN
  };
}

/**
 * Send a text message
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text
 * @returns {Promise<object>}
 */
async function sendTextMessage(to, text) {
  const { phoneNumberId, accessToken } = getConfig();
  
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending text message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send interactive button message
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body
 * @param {array} buttons - Array of {id, title} objects (max 3)
 * @returns {Promise<object>}
 */
async function sendButtonMessage(to, bodyText, buttons) {
  const { phoneNumberId, accessToken } = getConfig();
  
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.slice(0, 3).map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20)
          }
        }))
      }
    }
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending button message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send interactive list message
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body
 * @param {string} buttonText - Button text to open list
 * @param {array} items - Array of {id, title, description?} objects
 * @param {string} sectionTitle - Title for the list section
 * @returns {Promise<object>}
 */
async function sendListMessage(to, bodyText, buttonText, items, sectionTitle = 'Options') {
  const { phoneNumberId, accessToken } = getConfig();
  
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: bodyText
      },
      action: {
        button: buttonText.slice(0, 20),
        sections: [
          {
            title: sectionTitle,
            rows: items.map(item => ({
              id: item.id,
              title: item.title.slice(0, 24),
              description: item.description?.slice(0, 72) || ''
            }))
          }
        ]
      }
    }
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending list message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Download media from WhatsApp
 * @param {string} mediaId - WhatsApp media ID
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function downloadMedia(mediaId) {
  const { accessToken } = getConfig();
  
  // First, get the media URL
  const mediaUrl = `${WHATSAPP_API_URL}/${mediaId}`;
  
  try {
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const downloadUrl = mediaResponse.data.url;
    const mimeType = mediaResponse.data.mime_type;
    
    // Download the actual file
    const fileResponse = await axios.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    });
    
    return {
      buffer: Buffer.from(fileResponse.data),
      mimeType: mimeType
    };
  } catch (error) {
    console.error('Error downloading media:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mark message as read
 * @param {string} messageId - WhatsApp message ID
 * @returns {Promise<object>}
 */
async function markAsRead(messageId) {
  const { phoneNumberId, accessToken } = getConfig();
  
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking message as read:', error.response?.data || error.message);
  }
}

// ============ Message Parsing Helpers ============

/**
 * Extract message data from webhook payload
 * @param {object} body - Webhook body
 * @returns {object|null}
 */
function parseWebhookMessage(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value?.messages?.[0]) {
      return null;
    }
    
    const message = value.messages[0];
    const contact = value.contacts?.[0];
    
    return {
      messageId: message.id,
      from: message.from,
      timestamp: message.timestamp,
      type: message.type,
      message: message,
      contact: contact
    };
  } catch (error) {
    console.error('Error parsing webhook message:', error);
    return null;
  }
}

/**
 * Parse text message content
 * @param {object} message - WhatsApp message object
 * @returns {string|null}
 */
function parseTextMessage(message) {
  if (message.type !== 'text') return null;
  return message.text?.body || null;
}

/**
 * Parse button reply
 * @param {object} message - WhatsApp message object
 * @returns {{id: string, title: string}|null}
 */
function parseButtonReply(message) {
  if (message.type !== 'interactive') return null;
  if (message.interactive?.type !== 'button_reply') return null;
  
  return {
    id: message.interactive.button_reply.id,
    title: message.interactive.button_reply.title
  };
}

/**
 * Parse list reply
 * @param {object} message - WhatsApp message object
 * @returns {{id: string, title: string}|null}
 */
function parseListReply(message) {
  if (message.type !== 'interactive') return null;
  if (message.interactive?.type !== 'list_reply') return null;
  
  return {
    id: message.interactive.list_reply.id,
    title: message.interactive.list_reply.title
  };
}

/**
 * Parse location message
 * @param {object} message - WhatsApp message object
 * @returns {{latitude: number, longitude: number, name?: string, address?: string}|null}
 */
function parseLocationMessage(message) {
  if (message.type !== 'location') return null;
  
  return {
    latitude: message.location.latitude,
    longitude: message.location.longitude,
    name: message.location.name,
    address: message.location.address
  };
}

/**
 * Parse image message
 * @param {object} message - WhatsApp message object
 * @returns {{id: string, mimeType: string, caption?: string}|null}
 */
function parseImageMessage(message) {
  if (message.type !== 'image') return null;
  
  return {
    id: message.image.id,
    mimeType: message.image.mime_type,
    caption: message.image.caption
  };
}

/**
 * Get user input (text, button reply, or list reply)
 * @param {object} message - WhatsApp message object
 * @returns {{type: string, value: string, raw: object}}
 */
function getUserInput(message) {
  // Check button reply
  const buttonReply = parseButtonReply(message);
  if (buttonReply) {
    return { type: 'button', value: buttonReply.id, title: buttonReply.title, raw: buttonReply };
  }
  
  // Check list reply
  const listReply = parseListReply(message);
  if (listReply) {
    return { type: 'list', value: listReply.id, title: listReply.title, raw: listReply };
  }
  
  // Check text message
  const text = parseTextMessage(message);
  if (text) {
    return { type: 'text', value: text, raw: text };
  }
  
  // Check location
  const location = parseLocationMessage(message);
  if (location) {
    return { type: 'location', value: location, raw: location };
  }
  
  // Check image
  const image = parseImageMessage(message);
  if (image) {
    return { type: 'image', value: image, raw: image };
  }
  
  return { type: 'unknown', value: null, raw: message };
}

/**
 * Check if message is a start/restart trigger
 * Supports English and Urdu trigger words.
 * @param {string} text 
 * @returns {boolean}
 */
function isStartTrigger(text) {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  return ['start', 'hi', 'hello', 'shuru', 'restart', 'menu',
          'ہیلو', 'شروع', 'مینو', 'دوبارہ'].includes(normalized);
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  downloadMedia,
  markAsRead,
  parseWebhookMessage,
  parseTextMessage,
  parseButtonReply,
  parseListReply,
  parseLocationMessage,
  parseImageMessage,
  getUserInput,
  isStartTrigger
};
