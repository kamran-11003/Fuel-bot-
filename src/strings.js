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
      `📌 Enter the *nearest landmark* to the pump.\n\nExample: Near Barkat Market, Lahore`,

    LANDMARK_REQUIRED:
      `⚠️ Nearest landmark is required. Please enter the nearest landmark to the pump.`,

    COMPLAINT_TYPE_PROMPT: `Select the *type of complaint*:`,

    DETAILS_PROMPT:
      `📝 Describe your complaint in detail.\n\nThe more detail you provide, the faster we can act.`,

    DETAILS_TOO_SHORT:
      `⚠️ Please write more detail (at least 10 characters).`,

    IMAGE_PROMPT:
      `📷 Upload an image as evidence.\n\nPlease send a photo of the pump, receipt, or issue.`,

    IMAGE_REQUIRED:
      `⚠️ Image is required to file a complaint. Please send a photo.`,

    IMAGE_RECEIVED: `✅ Image received!`,

    REVIEW_HEADER:
      `📋 *Complaint Summary*\n\nPlease review before submitting:`,

    EDIT_PROMPT: `What would you like to edit?`,

    CONFIRM_MSG: (code) =>
      `✅ *Complaint Received!*\n\n🔖 Reference: *${code}*\n\nYour complaint is being submitted to the portal. You will receive a confirmation shortly.`,

    NITB_SUCCESS_MSG: (id) =>
      `🎉 *Complaint Confirmed on Portal!*\n\n✅ Your complaint has been officially registered.\n🔖 Official ID: *${id}*\n\nWe will take action shortly.`,

    NITB_FAIL_MSG: (code) =>
      `⚠️ *Portal Temporarily Unavailable*\n\nWe could not submit your complaint to the portal right now.\n🔖 Your local reference: *${code}*\n\nPlease try again after some time. We apologize for the inconvenience.`,

    NEW_COMPLAINT_PROMPT:
      `Your complaint has been submitted. Would you like to file a new complaint?`,

    GOODBYE:
      `Shukriya! Feel free to message anytime.\n\nAllah Hafiz! 🙏`,

    ERROR:
      `⚠️ Something went wrong. Please try again.\n\nType *Hi* to restart.`,

    MAIN_MENU_PROMPT:
      `What would you like to do?`,

    NEW_COMPLAINT_BTN: 'New Complaint 📝',
    CHECK_STATUS_BTN:  'Check Status 🔍',
    CHANGE_LANG_BTN:   'اردو 🇵🇰',

    STATUS_PHONE_PROMPT:
      `📱 Enter your *phone number* (with country code).\n\n📌 Example: 923001234567`,

    STATUS_PHONE_INVALID:
      `⚠️ Invalid phone number. Please enter 10–12 digits.\n\n📌 Example: 923001234567`,

    STATUS_CNIC_PROMPT:
      `🪪 Enter your *CNIC number* to check your complaint status.\n\n📌 Example: 3520212345678\n\n_Your WhatsApp number will be used for the lookup._`,

    STATUS_RESULT: (data) =>
      `📋 *Complaint Status*\n\n🔖 ID: *${data.complaint_code || data.complaintCode || '—'}*\n📊 Status: *${data.status || '—'}*\n📝 Type: ${data.complaint_type || data.type || '—'}\n\nType *Hi* to go back.`,

    STATUS_NOT_FOUND:
      `❌ No complaint found for the given phone number and CNIC.\n\nType *Hi* to try again.`,

    STATUS_ERROR:
      `⚠️ Unable to check status right now. Please try again later.\n\nType *Hi* to restart.`,

    IMAGE_DOWNLOAD_FAILED:
      `⚠️ We could not process your image. Please send the photo again.`,

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
      `🇵🇰 *فیول شکایت نظام* میں خوش آمدید۔\n\nپاکستان میں فیول پمپ کی شکایات درج کریں۔\n\nزبان منتخب کریں:`,

    CNIC_PROMPT:
      `براہ کرم اپنا *شناختی کارڈ نمبر* درج کریں۔\n\n📝 ۱۳ ہندسے، بغیر ڈیش کے\n📌 مثال: 3520212345678`,

    CNIC_INVALID:
      `⚠️ شناختی کارڈ نمبر غلط ہے۔ براہ کرم بالکل *۱۳ ہندسے* بغیر ڈیش کے درج کریں۔\n\n📌 مثال: 3520212345678`,

    LOCATION_PROMPT:
      `📍 پمپ کی *لوکیشن شیئر* کریں۔\n\nواٹس ایپ میں:\n1. 📎 اٹیچمنٹ آئیکن دبائیں\n2. *لوکیشن* منتخب کریں\n3. پمپ کی لوکیشن نقشے پر شیئر کریں`,

    LOCATION_INVALID:
      `⚠️ لوکیشن موصول نہیں ہوئی۔\n\nبراہ کرم واٹس ایپ *لوکیشن پن* شیئر کریں (متن کا پتہ نہیں)۔`,

    LOCATION_RECEIVED: `✅ لوکیشن موصول ہو گئی!`,

    PUMP_PROMPT: `*فیول پمپ* کا نام منتخب کریں:`,

    LANDMARK_PROMPT:
      `📌 پمپ کے *قریبی نشان* درج کریں۔\n\nمثال: بارکت مارکیٹ کے قریب، لاہور`,

    LANDMARK_REQUIRED:
      `⚠️ قریبی نشان ضروری ہے۔ براہ کرم پمپ کے قریب ترین نشان درج کریں۔`,

    COMPLAINT_TYPE_PROMPT: `*شکایت کی نوعیت* منتخب کریں:`,

    DETAILS_PROMPT:
      `📝 اپنی شکایت کی تفصیل درج کریں۔\n\nجتنی زیادہ تفصیل، اتنی جلد کارروائی۔`,

    DETAILS_TOO_SHORT:
      `⚠️ تھوڑی اور تفصیل درج کریں (کم از کم ۱۰ حروف)۔`,

    IMAGE_PROMPT:
      `📷 ثبوت کے طور پر تصویر اپلوڈ کریں۔\n\nبراہ کرم پمپ، رسید، یا مسئلے کی تصویر بھیجیں۔`,

    IMAGE_REQUIRED:
      `⚠️ شکایت درج کرنے کے لیے تصویر ضروری ہے۔ براہ کرم تصویر بھیجیں۔`,

    IMAGE_RECEIVED: `✅ تصویر موصول ہو گئی!`,

    REVIEW_HEADER:
      `📋 *شکایت کا خلاصہ*\n\nجمع کرنے سے پہلے جائزہ لیں:`,

    EDIT_PROMPT: `آپ کیا تبدیل کرنا چاہتے ہیں؟`,

    CONFIRM_MSG: (code) =>
      `✅ *شکایت موصول ہو گئی!*\n\n🔖 حوالہ نمبر: *${code}*\n\nآپ کی شکایت پورٹل پر بھیجی جا رہی ہے۔ جلد ہی تصدیق موصول ہوگی۔`,

    NITB_SUCCESS_MSG: (id) =>
      `🎉 *شکایت پورٹل پر تصدیق ہو گئی!*\n\n✅ آپ کی شکایت سرکاری طور پر درج ہو گئی۔\n🔖 سرکاری ID: *${id}*\n\nہم جلد کارروائی کریں گے۔`,

    NITB_FAIL_MSG: (code) =>
      `⚠️ *پورٹل عارضی طور پر دستیاب نہیں*\n\nابھی آپ کی شکایت پورٹل پر جمع نہیں ہو سکی۔\n🔖 آپ کا مقامی حوالہ: *${code}*\n\nکچھ دیر بعد دوبارہ کوشش کریں۔ معذرت خواہ ہیں۔`,

    NEW_COMPLAINT_PROMPT:
      `آپ کی شکایت جمع ہو گئی۔ کیا آپ نئی شکایت درج کرنا چاہتے ہیں؟`,

    GOODBYE:
      `شکریہ! ضرورت پر دوبارہ رابطہ کریں۔\n\nاللہ حافظ! 🙏`,

    ERROR:
      `⚠️ کچھ غلط ہوا۔ براہ کرم دوبارہ کوشش کریں۔\n\nدوبارہ شروع کرنے کے لیے *Hi* لکھیں۔`,

    MAIN_MENU_PROMPT:
      `آپ کیا کرنا چاہتے ہیں؟`,

    NEW_COMPLAINT_BTN: 'نئی شکایت 📝',
    CHECK_STATUS_BTN:  'حیثیت چیک کریں 🔍',
    CHANGE_LANG_BTN:   'English 🇬🇧',

    STATUS_PHONE_PROMPT:
      `📱 اپنا *فون نمبر* درج کریں (ملکی کوڈ کے ساتھ)۔\n\n📌 مثال: 923001234567`,

    STATUS_PHONE_INVALID:
      `⚠️ فون نمبر غلط ہے۔ براہ کرم ۱۰ سے ۱۲ ہندسے درج کریں۔\n\n📌 مثال: 923001234567`,

    STATUS_CNIC_PROMPT:
      `🪪 شکایت کی حیثیت چیک کرنے کے لیے اپنا *شناختی کارڈ نمبر* درج کریں۔\n\n📌 مثال: 3520212345678\n\n_آپ کا واٹس ایپ نمبر تلاش کے لیے استعمال ہوگا۔_`,

    STATUS_RESULT: (data) =>
      `📋 *شکایت کی حیثیت*\n\n🔖 ID: *${data.complaint_code || data.complaintCode || '—'}*\n📊 حیثیت: *${data.status || '—'}*\n📝 نوعیت: ${data.complaint_type || data.type || '—'}\n\nواپس جانے کے لیے *Hi* لکھیں۔`,

    STATUS_NOT_FOUND:
      `❌ دیئے گئے فون نمبر اور شناختی کارڈ سے کوئی شکایت نہیں ملی۔\n\nدوبارہ کوشش کے لیے *Hi* لکھیں۔`,

    STATUS_ERROR:
      `⚠️ ابھی حیثیت چیک نہیں ہو سکتی۔ براہ کرم بعد میں کوشش کریں۔\n\nدوبارہ شروع کے لیے *Hi* لکھیں۔`,

    IMAGE_DOWNLOAD_FAILED:
      `⚠️ آپ کی تصویر پراسیس نہیں ہو سکی۔ براہ کرم دوبارہ تصویر بھیجیں۔`,

    SUBMIT_BTN:   'جمع کریں ✅',
    EDIT_BTN:     'تبدیل کریں ✏️',
    SKIP_BTN:     'آگے بڑھیں ⏭️',
    YES_BTN:      'ہاں ✅',
    NO_BTN:       'نہیں ❌',
    START_BTN:    'نئی شکایت 🚀',
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
 * Resolves enum keys (pump, complaint_type) to human-readable labels.
 * All field labels switch to Urdu (Arabic script) when lang === 'ur'.
 */
function buildReviewSummary(session) {
  const lang = session.lang || 'en';
  const ur   = lang === 'ur';

  const sep = ur ? '، ' : ', ';
  const loc = session.latitude
    ? [session.area, session.city, session.province].filter(Boolean).join(sep) || (ur ? 'لوکیشن محفوظ ✓' : 'Location pinned ✓')
    : '—';

  const pumpLabel          = getPumpLabel(session.pump);
  const complaintTypeLabel = getComplaintTypeTitle(session.complaint_type, lang);

  const L = ur
    ? { cnic: 'شناختی کارڈ', location: 'مقام', pump: 'پمپ',
        landmark: 'قریبی نشان', type: 'نوعیت', details: 'تفصیل',
        image: 'تصویر', attached: 'منسلک ✓', none: 'منسلک نہیں' }
    : { cnic: 'CNIC', location: 'Location', pump: 'Pump',
        landmark: 'Landmark', type: 'Type', details: 'Details',
        image: 'Image', attached: 'Attached ✓', none: 'Not attached' };

  const lines = [
    S(session, 'REVIEW_HEADER'),
    '',
    `🪪 *${L.cnic}:* ${maskCnic(session.cnic)}`,
    `📍 *${L.location}:* ${loc}`,
    `🏪 *${L.pump}:* ${pumpLabel}`,
    session.landmark ? `📌 *${L.landmark}:* ${session.landmark}` : null,
    `📝 *${L.type}:* ${complaintTypeLabel}`,
    `📄 *${L.details}:* ${session.details || '—'}`,
    `📷 *${L.image}:* ${session.has_image ? L.attached : L.none}`
  ].filter(l => l !== null);

  return lines.join('\n');
}

module.exports = { STRINGS, S, maskCnic, buildReviewSummary };
