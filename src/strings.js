/**
 * Bilingual message strings for the Fuel Complaint Bot
 * Mix of Urdu (Roman) and English for Pakistani users
 */

const STRINGS = {
  // GREETING state
  WELCOME: `Assalam-o-Alaikum! 🇵🇰

Welcome to the *Fuel Complaint System*.

Aap yahan apni fuel-related complaint register kar sakte hain.

Kya aap shuru karna chahte hain?`,

  WELCOME_YES_BTN: 'Yes ✅',
  WELCOME_NO_BTN: 'No ❌',

  GOODBYE: `Shukriya! 

Agar aap ko future mein koi complaint register karni ho, toh hum yahan hain.

Allah Hafiz! 🙏`,

  // CNIC_INPUT state
  ASK_CNIC: `Baraye meherbani apna *CNIC number* enter karein.

📝 Format: 13 digits without dashes
📌 Example: 3520212345678`,

  INVALID_CNIC: `⚠️ CNIC format ghalat hai.

Baraye meherbani *13 digits* enter karein bina dashes ke.

📌 Example: 3520212345678`,

  // REGION_SELECTION state
  ASK_REGION: `Apna *region* select karein: 📍`,

  REGIONS: {
    ISLAMABAD: 'Islamabad',
    RAWALPINDI: 'Rawalpindi',
    LAHORE: 'Lahore',
    KARACHI: 'Karachi',
    OTHER: 'Other'
  },

  // COMPLAINT_TYPE state
  ASK_COMPLAINT_TYPE: `Complaint ki *type* select karein:`,

  COMPLAINT_TYPES: {
    FUEL_SHORTAGE: 'Fuel shortage ⛽',
    OVERPRICING: 'Overpricing 💰',
    PUMP_CLOSED: 'Pump closed 🚫',
    ILLEGAL_PRACTICES: 'Illegal practices ⚖️',
    OTHER: 'Other 📝'
  },

  // DETAILS_INPUT state
  ASK_DETAILS: `Apni complaint ki *tafseel* likhein.

📝 Jitni zyada detail dein ge, utna behtar hoga.`,

  DETAILS_TOO_SHORT: `⚠️ Baraye meherbani thori aur detail likhein.

Kam az kam 10 characters likhein.`,

  // LOCATION_INPUT state
  ASK_LOCATION: `Pump ki *location* share karein. 📍

👇 WhatsApp mein:
1. Attachment icon (📎) press karein
2. "Location" select karein
3. Current location ya map se select karein

Ya phir pump ka pura address likh dein.`,

  INVALID_LOCATION: `⚠️ Location receive nahi hui.

Baraye meherbani WhatsApp location share karein ya pump ka complete address likhein.`,

  LOCATION_RECEIVED: `✅ Location receive ho gayi!`,

  // IMAGE_UPLOAD state
  ASK_IMAGE: `Agar mumkin ho to *tasveer* upload karein. 📷

Ye step optional hai - aap skip bhi kar sakte hain.`,

  SKIP_BTN: 'Skip ⏭️',
  IMAGE_RECEIVED: `✅ Tasveer receive ho gayi!`,

  INVALID_IMAGE: `⚠️ Ye tasveer nahi hai.

Baraye meherbani image upload karein ya "Skip" karein.`,

  // REVIEW state
  REVIEW_HEADER: `📋 *Complaint Summary*

Baraye meherbani apni complaint ki details check karein:`,

  REVIEW_CNIC: `🪪 *CNIC:*`,
  REVIEW_REGION: `📍 *Region:*`,
  REVIEW_TYPE: `📝 *Complaint Type:*`,
  REVIEW_DETAILS: `📄 *Details:*`,
  REVIEW_LOCATION: `🗺️ *Location:*`,
  REVIEW_IMAGE: `📷 *Image:*`,

  LOCATION_ATTACHED: 'Attached ✓',
  LOCATION_NOT_ATTACHED: 'Text address provided',
  IMAGE_ATTACHED: 'Attached ✓',
  IMAGE_NOT_ATTACHED: 'Not attached',

  SUBMIT_BTN: 'Submit ✅',
  EDIT_BTN: 'Edit ✏️',

  // EDIT state
  ASK_EDIT_FIELD: `Kya cheez edit karni hai?`,

  EDIT_OPTIONS: {
    COMPLAINT_TYPE: 'Complaint Type 📝',
    DETAILS: 'Details 📄',
    LOCATION: 'Location 📍',
    IMAGE: 'Image 📷'
  },

  // CONFIRMATION state
  CONFIRMATION_SUCCESS: `🎉 *Shukriya!*

Aap ki complaint *successfully register* ho gayi hai.`,

  COMPLAINT_ID_LABEL: `🔖 *Complaint ID:*`,
  STATUS_LABEL: `📊 *Status:*`,
  STATUS_PENDING: 'Pending',

  CONFIRMATION_FOOTER: `Hum jald az jald aap ki complaint par action lein ge.

Agar koi aur complaint ho toh "Start" type karein.`,

  // Duplicate complaint warning
  DUPLICATE_WARNING: `⚠️ Aap ne recently ek complaint register ki hai.

Baraye meherbani 24 ghante baad doosri complaint register karein.`,

  // Error messages
  ERROR_GENERIC: `⚠️ Maazrat! Kuch ghalat ho gaya.

Baraye meherbani dobara koshish karein.`,

  ERROR_SESSION: `⚠️ Session expire ho gaya hai.

Naye complaint ke liye "Start" type karein.`,

  // Restart
  RESTART_PROMPT: `Naye complaint ke liye "Start" type karein.`,

  START_BTN: 'Start 🚀',

  // Misc
  PROCESSING: `⏳ Processing...`,
  THANK_YOU: `Shukriya! 🙏`
};

/**
 * Mask CNIC for display (show first 5 and last 3 digits)
 * @param {string} cnic 
 * @returns {string}
 */
function maskCnic(cnic) {
  if (!cnic || cnic.length !== 13) return cnic;
  return cnic.slice(0, 5) + '*****' + cnic.slice(-3);
}

/**
 * Build review summary message
 * @param {object} session 
 * @returns {string}
 */
function buildReviewSummary(session) {
  const lines = [
    STRINGS.REVIEW_HEADER,
    '',
    `${STRINGS.REVIEW_CNIC} ${maskCnic(session.cnic)}`,
    `${STRINGS.REVIEW_REGION} ${session.region}`,
    `${STRINGS.REVIEW_TYPE} ${session.complaint_type}`,
    `${STRINGS.REVIEW_DETAILS} ${session.details}`,
    '',
    `${STRINGS.REVIEW_LOCATION} ${session.latitude ? STRINGS.LOCATION_ATTACHED : (session.location_text ? STRINGS.LOCATION_NOT_ATTACHED : 'Not provided')}`,
    `${STRINGS.REVIEW_IMAGE} ${session.image_url ? STRINGS.IMAGE_ATTACHED : STRINGS.IMAGE_NOT_ATTACHED}`
  ];
  return lines.join('\n');
}

/**
 * Build confirmation message with complaint ID
 * @param {string} complaintCode 
 * @returns {string}
 */
function buildConfirmationMessage(complaintCode) {
  const lines = [
    STRINGS.CONFIRMATION_SUCCESS,
    '',
    `${STRINGS.COMPLAINT_ID_LABEL} ${complaintCode}`,
    `${STRINGS.STATUS_LABEL} ${STRINGS.STATUS_PENDING}`,
    '',
    STRINGS.CONFIRMATION_FOOTER
  ];
  return lines.join('\n');
}

module.exports = {
  STRINGS,
  maskCnic,
  buildReviewSummary,
  buildConfirmationMessage
};
