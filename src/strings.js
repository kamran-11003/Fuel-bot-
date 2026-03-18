/**
 * Bilingual message strings — English + Urdu (Roman)
 * All bot copy lives here. Use S(session, 'KEY') to get language-aware string.
 */

const { getPumpLabel, getComplaintTypeTitle } = require('./seed');

const STRINGS = {
  en: {
    LANGUAGE_PROMPT:
      `🇵🇰 Welcome to the *Fuel Complaint System*.\n\nRegister complaints about fuel pumps across Pakistan.\n\nPlease select your language:`,

    CNIC_PROMPT:
      `Please enter your *CNIC number*.\n\n📝 13 digits, no dashes\n📌 Example: 3520212345678`,

    CNIC_INVALID:
      `⚠️ Invalid CNIC. Please enter exactly *13 digits* without dashes.\n\n📌 Example: 3520212345678`,

    LOCATION_PROMPT:
      `📍 Share the *fuel pump location*.\n\nIn WhatsApp:\n1. Tap the 📎 attachment icon\n2. Select *Location*\n3. Choose the pump location on the map`,

    LOCATION_INVALID:
      `⚠️ Location not received.\n\nPlease share a WhatsApp *location pin* (not a text address).`,

    LOCATION_RECEIVED: `✅ Location received!`,

    PUMP_PROMPT: `Select the *fuel pump brand*:`,

    LANDMARK_PROMPT:
      `📌 Enter the *nearest landmark* to the pump (optional).\n\nExample: Near Barkat Market, Lahore\n\nOr tap Skip to continue.`,

    COMPLAINT_TYPE_PROMPT: `Select the *type of complaint*:`,

    DETAILS_PROMPT:
      `📝 Describe your complaint in detail.\n\nThe more detail you provide, the faster we can act.`,

    DETAILS_TOO_SHORT:
      `⚠️ Please write more detail (at least 10 characters).`,

    IMAGE_PROMPT:
      `📷 Upload an image as evidence (optional).\n\nOr tap Skip to continue.`,

    IMAGE_RECEIVED: `✅ Image received!`,

    REVIEW_HEADER:
      `📋 *Complaint Summary*\n\nPlease review before submitting:`,

    EDIT_PROMPT: `What would you like to edit?`,

    CONFIRM_MSG: (code) =>
      `🎉 *Complaint Registered!*\n\n🔖 ID: *${code}*\n📊 Status: Pending\n\nWe will act on your complaint shortly.\n\nType *Hi* to submit another complaint.`,

    NEW_COMPLAINT_PROMPT:
      `Your complaint has been submitted. Would you like to file a new complaint?`,

    GOODBYE:
      `Shukriya! Feel free to message anytime.\n\nAllah Hafiz! 🙏`,

    ERROR:
      `⚠️ Something went wrong. Please try again.\n\nType *Hi* to restart.`,

    SUBMIT_BTN:   'Submit ✅',
    EDIT_BTN:     'Edit ✏️',
    SKIP_BTN:     'Skip ⏭️',
    YES_BTN:      'Yes ✅',
    NO_BTN:       'No ❌',
    START_BTN:    'New Complaint 🚀',
    LANG_EN_BTN:  'English 🇬🇧',
    LANG_UR_BTN:  'اردو 🇵🇰'
  },

  ur: {
    LANGUAGE_PROMPT:
      `🇵🇰 *Fuel Complaint System* mein khush amdeed.\n\nPakistan mein fuel pump shikayat darj karein.\n\nZaban chunein:`,

    CNIC_PROMPT:
      `Baraye meherbani apna *CNIC number* darj karein.\n\n📝 13 ank, bina dash ke\n📌 Misaal: 3520212345678`,

    CNIC_INVALID:
      `⚠️ CNIC ghalat hai. Baraye meherbani *13 ank* darj karein bina dash ke.\n\n📌 Misaal: 3520212345678`,

    LOCATION_PROMPT:
      `📍 Pump ki *location share* karein.\n\nWhatsApp mein:\n1. 📎 attachment icon dabaein\n2. *Location* chunein\n3. Pump ki location map par share karein`,

    LOCATION_INVALID:
      `⚠️ Location nahi mili.\n\nBaraye meherbani WhatsApp *location pin* share karein (text address nahi).`,

    LOCATION_RECEIVED: `✅ Location mil gayi!`,

    PUMP_PROMPT: `*Fuel pump* ka naam chunein:`,

    LANDMARK_PROMPT:
      `📌 Pump ke *qareeb ka landmark* likhein (ikhtiyari).\n\nMisaal: Barkat Market ke pass, Lahore\n\nYa Skip karein.`,

    COMPLAINT_TYPE_PROMPT: `*Shikayat ki nau* chunein:`,

    DETAILS_PROMPT:
      `📝 Apni shikayat ki tafseel likhein.\n\nJitni zyada tafseel, utni jald karyawai.`,

    DETAILS_TOO_SHORT:
      `⚠️ Thori aur tafseel likhein (kam az kam 10 haroof).`,

    IMAGE_PROMPT:
      `📷 Saboot ke taur par tasveer upload karein (ikhtiyari).\n\nYa Skip karein.`,

    IMAGE_RECEIVED: `✅ Tasveer mil gayi!`,

    REVIEW_HEADER:
      `📋 *Shikayat Ka Khulasa*\n\nJama karne se pehle check karein:`,

    EDIT_PROMPT: `Kya tabdeel karna chahte hain?`,

    CONFIRM_MSG: (code) =>
      `🎉 *Shikayat Darj Ho Gayi!*\n\n🔖 ID: *${code}*\n📊 Status: Zair-e-Ghour\n\nHum jald karyawai karein ge.\n\nNai shikayat ke liye *Hi* likhein.`,

    NEW_COMPLAINT_PROMPT:
      `Aap ki shikayat jama ho gayi. Kya aap nai shikayat darj karna chahte hain?`,

    GOODBYE:
      `Shukriya! Zaroorat par dobara rabta karein.\n\nAllah Hafiz! 🙏`,

    ERROR:
      `⚠️ Kuch ghalat hua. Baraye meherbani dobara koshish karein.\n\nDobara shuru karne ke liye *Hi* likhein.`,

    SUBMIT_BTN:   'Jama Karain ✅',
    EDIT_BTN:     'Tabdeel Karain ✏️',
    SKIP_BTN:     'Aage Barho ⏭️',
    YES_BTN:      'Haan ✅',
    NO_BTN:       'Nahi ❌',
    START_BTN:    'Nai Shikayat 🚀',
    LANG_EN_BTN:  'English 🇬🇧',
    LANG_UR_BTN:  'اردو 🇵🇰'
  }
};

/**
 * Get a string in the session's language
 */
function S(session, key, ...args) {
  const lang = session?.lang || 'en';
  const val  = STRINGS[lang][key] ?? STRINGS.en[key];
  return typeof val === 'function' ? val(...args) : (val ?? `[${key}]`);
}

/**
 * Mask CNIC — show first 5 and last 3 digits
 */
function maskCnic(cnic) {
  if (!cnic || cnic.length < 8) return cnic || '—';
  return `${cnic.slice(0, 5)}*****${cnic.slice(-3)}`;
}

/**
 * Build review summary card
 * Resolves enum keys (pump, complaint_type) to human-readable labels
 */
function buildReviewSummary(session) {
  const lang = session.lang || 'en';

  const loc = session.latitude
    ? [session.area, session.city, session.province].filter(Boolean).join(', ') || 'Location pinned ✓'
    : '—';

  const pumpLabel         = getPumpLabel(session.pump);
  const complaintTypeLabel = getComplaintTypeTitle(session.complaint_type, lang);

  const lines = [
    S(session, 'REVIEW_HEADER'),
    '',
    `🪪 *CNIC:* ${maskCnic(session.cnic)}`,
    `📍 *Location:* ${loc}`,
    `🏪 *Pump:* ${pumpLabel}`,
    session.landmark ? `📌 *Landmark:* ${session.landmark}` : null,
    `📝 *Type:* ${complaintTypeLabel}`,
    `📄 *Details:* ${session.details || '—'}`,
    `📷 *Image:* ${session.has_image ? 'Attached ✓' : (lang === 'ur' ? 'Nahi' : 'Not attached')}`
  ].filter(l => l !== null);

  return lines.join('\n');
}

module.exports = { STRINGS, S, maskCnic, buildReviewSummary };
