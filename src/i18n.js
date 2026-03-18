'use strict';

/**
 * i18n (internationalisation) layer — bilingual EN/UR message dictionary.
 *
 * Rules:
 *  - NEVER hardcode display text outside this file.
 *  - Always fetch via getMessage(lang, key).
 *  - Option arrays (PROVINCES, PUMPS, COMPLAINT_TYPES, EDIT_FIELDS) live here
 *    because their display text is language-specific.
 *
 * WhatsApp limits (enforced at send site, but keep in mind when adding keys):
 *   Button title    : max 20 chars
 *   List row title  : max 24 chars
 *   List row desc   : max 72 chars
 */

// ── Option arrays (bilingual) ─────────────────────────────────────────────────

const PROVINCES = {
  EN: [
    { id: 'PUNJAB',      title: 'Punjab' },
    { id: 'SINDH',       title: 'Sindh' },
    { id: 'KPK',         title: 'Khyber Pakhtunkhwa', description: 'KPK' },
    { id: 'BALOCHISTAN', title: 'Balochistan' },
    { id: 'ISLAMABAD',   title: 'Islamabad (ICT)' }
  ],
  UR: [
    { id: 'PUNJAB',      title: 'پنجاب' },
    { id: 'SINDH',       title: 'سندھ' },
    { id: 'KPK',         title: 'خیبر پختونخوا', description: 'KPK' },
    { id: 'BALOCHISTAN', title: 'بلوچستان' },
    { id: 'ISLAMABAD',   title: 'اسلام آباد (ICT)' }
  ]
};

const PUMPS = {
  EN: [
    { id: 'PSO',         title: 'PSO',          description: 'Pakistan State Oil' },
    { id: 'SHELL_PK',    title: 'Shell Pakistan' },
    { id: 'TOTAL_PARCO', title: 'Total PARCO' },
    { id: 'APL',         title: 'APL',           description: 'Attock Petroleum' },
    { id: 'CNERGYICO',   title: 'Cnergyico',     description: 'formerly Byco' },
    { id: 'GO',          title: 'GO',            description: 'Gas & Oil Pakistan' },
    { id: 'ARAMCO',      title: 'Aramco' },
    { id: 'HASCOL',      title: 'Hascol' },
    { id: 'PUMA',        title: 'Puma Energy' },
    { id: 'FLOW',        title: 'Flow Petroleum' }
  ],
  UR: [
    { id: 'PSO',         title: 'PSO',          description: 'پاکستان اسٹیٹ آئل' },
    { id: 'SHELL_PK',    title: 'Shell Pakistan' },
    { id: 'TOTAL_PARCO', title: 'Total PARCO' },
    { id: 'APL',         title: 'APL',           description: 'اٹاک پیٹرولیم' },
    { id: 'CNERGYICO',   title: 'Cnergyico',     description: 'سابقہ Byco' },
    { id: 'GO',          title: 'GO',            description: 'گیس اینڈ آئل پاکستان' },
    { id: 'ARAMCO',      title: 'Aramco' },
    { id: 'HASCOL',      title: 'Hascol' },
    { id: 'PUMA',        title: 'Puma Energy' },
    { id: 'FLOW',        title: 'Flow Petroleum' }
  ]
};

const COMPLAINT_TYPES = {
  EN: [
    { id: 'SHORT_MEASUREMENT', title: 'Short Measurement', description: 'کم تول' },
    { id: 'FUEL_QUALITY',      title: 'Fuel Quality Issue' },
    { id: 'OVERCHARGING',      title: 'Overcharging/Wrong Rate' },
    { id: 'REFUSED_SERVICE',   title: 'Pump Refused Service' },
    { id: 'OTHER',             title: 'Other' }
  ],
  UR: [
    { id: 'SHORT_MEASUREMENT', title: 'کم تول', description: 'Short Measurement' },
    { id: 'FUEL_QUALITY',      title: 'ایندھن کا معیار خراب' },
    { id: 'OVERCHARGING',      title: 'زیادہ قیمت / غلط ریٹ' },
    { id: 'REFUSED_SERVICE',   title: 'سروس دینے سے انکار' },
    { id: 'OTHER',             title: 'دیگر' }
  ]
};

const EDIT_FIELDS = {
  EN: [
    { id: 'province',      title: 'Province' },
    { id: 'complaintType', title: 'Complaint Type' },
    { id: 'details',       title: 'Details' },
    { id: 'pumpName',      title: 'Pump Name' },
    { id: 'location',      title: 'Location' },
    { id: 'landmark',      title: 'Nearest Landmark' },
    { id: 'image',         title: 'Image' }
  ],
  UR: [
    { id: 'province',      title: 'صوبہ' },
    { id: 'complaintType', title: 'شکایت کی قسم' },
    { id: 'details',       title: 'تفصیلات' },
    { id: 'pumpName',      title: 'پمپ کا نام' },
    { id: 'location',      title: 'مقام' },
    { id: 'landmark',      title: 'قریبی نشانی' },
    { id: 'image',         title: 'تصویر' }
  ]
};

// ── Display label maps (for review screen) ────────────────────────────────────

const PROVINCE_LABELS = {
  PUNJAB:      { EN: 'Punjab',                   UR: 'پنجاب' },
  SINDH:       { EN: 'Sindh',                    UR: 'سندھ' },
  KPK:         { EN: 'Khyber Pakhtunkhwa (KPK)', UR: 'خیبر پختونخوا (KPK)' },
  BALOCHISTAN: { EN: 'Balochistan',              UR: 'بلوچستان' },
  ISLAMABAD:   { EN: 'Islamabad (ICT)',           UR: 'اسلام آباد (ICT)' }
};

const PUMP_LABELS = {
  PSO:         { EN: 'PSO (Pakistan State Oil)',      UR: 'PSO (پاکستان اسٹیٹ آئل)' },
  SHELL_PK:    { EN: 'Shell Pakistan',                UR: 'Shell Pakistan' },
  TOTAL_PARCO: { EN: 'Total PARCO',                   UR: 'Total PARCO' },
  APL:         { EN: 'APL (Attock Petroleum)',         UR: 'APL (اٹاک پیٹرولیم)' },
  CNERGYICO:   { EN: 'Cnergyico (formerly Byco)',     UR: 'Cnergyico (سابقہ Byco)' },
  GO:          { EN: 'GO (Gas & Oil Pakistan)',        UR: 'GO (گیس اینڈ آئل پاکستان)' },
  ARAMCO:      { EN: 'Aramco',                        UR: 'Aramco' },
  HASCOL:      { EN: 'Hascol Petroleum',              UR: 'Hascol Petroleum' },
  PUMA:        { EN: 'Puma Energy',                   UR: 'Puma Energy' },
  FLOW:        { EN: 'Flow Petroleum',                UR: 'Flow Petroleum' }
};

const COMPLAINT_TYPE_LABELS = {
  SHORT_MEASUREMENT: { EN: 'Short Measurement (کم تول)', UR: 'کم تول (Short Measurement)' },
  FUEL_QUALITY:      { EN: 'Fuel Quality Issue',         UR: 'ایندھن کا معیار خراب' },
  OVERCHARGING:      { EN: 'Overcharging / Wrong Rate',  UR: 'زیادہ قیمت / غلط ریٹ' },
  REFUSED_SERVICE:   { EN: 'Pump Refused to Serve',      UR: 'پمپ نے سروس دینے سے انکار' },
  OTHER:             { EN: 'Other',                      UR: 'دیگر' }
};

// ── Message dictionary ────────────────────────────────────────────────────────

const messages = {
  EN: {
    // Language selection (shown in both languages intentionally)
    LANGUAGE_SELECT: 'Please select your language / اپنی زبان منتخب کریں:',

    // Greeting
    GREETING:
      '👋 *Welcome to the Fuel Complaint System!*\n\n' +
      'This service allows you to report fuel-related complaints at petrol pumps across Pakistan.\n\n' +
      'Would you like to file a complaint?',
    START_BTN: 'Start 🚀',

    // CNIC
    ASK_CNIC:
      '🪪 Please enter your *13-digit CNIC* (without dashes):\n\n' +
      'Example: 3520212345679',
    INVALID_CNIC:
      '⚠️ Invalid CNIC. Please enter a valid *13-digit number* without dashes.\n\n' +
      'Example: 3520212345679',
    DUPLICATE_WARNING:
      '⏳ You have already submitted a complaint in the last 24 hours.\n\n' +
      'Please try again after 24 hours.',

    // Province selection
    ASK_PROVINCE: '🗺️ Select your *Province / Region:*',
    SELECT_PROVINCE_BTN: 'Select Province',
    PROVINCES_SECTION: 'Provinces',

    // Pump selection
    ASK_PUMP: '⛽ Select the *Petrol Pump Company:*',
    SELECT_PUMP_BTN: 'Select Pump',
    PUMPS_SECTION: 'Pump Companies',

    // Complaint type
    ASK_COMPLAINT_TYPE: '📋 What is the *nature of your complaint?*',
    SELECT_TYPE_BTN: 'Select Type',
    TYPES_SECTION: 'Complaint Types',

    // Location
    ASK_LOCATION:
      '📍 Please share the *GPS location of the petrol pump:*\n\n' +
      '📌 Tap the attachment icon (📎) → *Location* to share your live GPS pin.\n\n' +
      '⚠️ Only GPS location is accepted — text addresses are not supported.',
    LOCATION_RECEIVED: '✅ GPS location received. Thank you!',
    INVALID_LOCATION:
      '⚠️ Please share a *GPS location* using the attachment icon (📎 → Location).\n' +
      'Text addresses are not accepted for this step.',

    // Landmark
    ASK_LANDMARK:
      '🏫 Please enter the *nearest landmark* to the petrol pump:\n\n' +
      'Example: Near City Hospital, opposite Jinnah Park, next to KFC',
    INVALID_LANDMARK:
      '⚠️ Landmark is required. Please type a recognisable nearby landmark (minimum 3 characters).',
    LANDMARK_RECEIVED: '✅ Landmark noted!',
    REVIEW_LANDMARK:   '🏫 Landmark:',

    // Image upload
    ASK_IMAGE:
      '📸 Do you have *photo evidence?*\n' +
      '(e.g. meter reading, receipt, pump display)\n\n' +
      'Please send an image, or skip.',
    SKIP_BTN: 'Skip ⏭️',
    IMAGE_RECEIVED: '✅ Image received!',
    INVALID_IMAGE: '⚠️ Please send an *image file* only (JPG, PNG).',

    // Details
    ASK_DETAILS_REQUIRED:
      '✍️ Please *describe your complaint* in detail (minimum 20 characters):',
    DETAILS_TOO_SHORT: '⚠️ Details too short. Please provide *at least 20 characters.*',

    // Review
    REVIEW_HEADER:   '📋 *Complaint Review*',
    REVIEW_CNIC:     '🪪 CNIC:',
    REVIEW_PROVINCE: '🗺️ Province:',
    REVIEW_PUMP:     '⛽ Pump:',
    REVIEW_TYPE:     '📝 Type:',
    REVIEW_DETAILS:  '✍️ Details:',
    REVIEW_LOCATION: '📍 Location:',
    REVIEW_LANDMARK: '🏫 Landmark:',
    REVIEW_IMAGE:    '📸 Image:',
    REVIEW_FOOTER:   'Please review your complaint before submitting.',
    GPS_ATTACHED:    '📌 GPS Location Attached',
    IMAGE_ATTACHED:  '✅ Attached',
    NOT_ATTACHED:    '➖ Not Attached',
    NOT_PROVIDED:    '➖ Not Provided',
    SUBMIT_BTN:  '✅ Submit',
    EDIT_BTN:    '✏️ Edit',

    // Edit field select
    ASK_EDIT_FIELD:    '✏️ Which *field* would you like to edit?',
    SELECT_FIELD_BTN:  'Select Field',
    FIELDS_SECTION:    'Fields',

    // Confirmation
    CONFIRMATION_SUCCESS: '✅ *Complaint Submitted Successfully!*',
    COMPLAINT_ID_LABEL:   '🔖 Complaint ID:',
    STATUS_LABEL:         '📊 Status:',
    STATUS_PENDING:       '⏳ Pending',
    CONFIRMATION_FOOTER:
      'Your complaint has been forwarded for review.\n' +
      'You will be notified when it is processed.\n\n' +
      'JazakAllah Khair 🙏',
    NEW_COMPLAINT_BTN: '🔄 New Complaint',

    // Proactive status notifications (functions so they can receive dynamic values)
    STATUS_IN_PROGRESS_MSG: (code) =>
      `📣 *Complaint Status Update*\n\n` +
      `🔖 Complaint ID: ${code}\n` +
      `📊 Status: 🔄 In Progress\n\n` +
      `Your complaint is now being reviewed by our team.\n` +
      `We will notify you once it is resolved.`,

    STATUS_RESOLVED_MSG: (code, remarks) =>
      `✅ *Complaint Resolved!*\n\n` +
      `🔖 Complaint ID: ${code}\n` +
      `📊 Status: ✅ Resolved\n\n` +
      `📝 *Officer Remarks:*\n"${remarks}"\n\n` +
      `Thank you for helping us improve fuel services in Pakistan. 🇵🇰`,

    // Session / errors
    RESTART_MSG:     '🔄 Restarting your session...',
    SESSION_EXPIRED: "⏰ Your session has expired due to inactivity. Let's start fresh!",
    ERROR_GENERIC:   '❌ Something went wrong. Please try again or type "restart".'
  },

  UR: {
    // Language selection (bilingual intentionally)
    LANGUAGE_SELECT: 'Please select your language / اپنی زبان منتخب کریں:',

    // Greeting
    GREETING:
      '👋 *فیول شکایت سسٹم میں خوش آمدید!*\n\n' +
      'یہ سروس آپ کو پاکستان بھر کے پیٹرول پمپس پر فیول سے متعلق شکایات درج کرنے کی سہولت دیتی ہے۔\n\n' +
      'کیا آپ شکایت درج کرنا چاہتے ہیں؟',
    START_BTN: 'شروع کریں 🚀',

    // CNIC
    ASK_CNIC:
      '🪪 براہ کرم اپنا *13 ہندسوں کا قومی شناختی کارڈ نمبر* درج کریں (بغیر ڈیش کے):\n\n' +
      'مثال: 3520212345679',
    INVALID_CNIC:
      '⚠️ غلط CNIC۔ براہ کرم *13 ہندسوں کا درست نمبر* درج کریں۔\n\n' +
      'مثال: 3520212345679',
    DUPLICATE_WARNING:
      '⏳ آپ پچھلے 24 گھنٹوں میں پہلے ہی شکایت درج کر چکے ہیں۔\n\n' +
      'براہ کرم 24 گھنٹے بعد دوبارہ کوشش کریں۔',

    // Province selection
    ASK_PROVINCE: '🗺️ اپنا *صوبہ / خطہ* منتخب کریں:',
    SELECT_PROVINCE_BTN: 'صوبہ منتخب کریں',
    PROVINCES_SECTION: 'صوبے',

    // Pump selection
    ASK_PUMP: '⛽ *پیٹرول پمپ کمپنی* منتخب کریں:',
    SELECT_PUMP_BTN: 'پمپ منتخب کریں',
    PUMPS_SECTION: 'پمپ کمپنیاں',

    // Complaint type
    ASK_COMPLAINT_TYPE: '📋 آپ کی *شکایت کی نوعیت* کیا ہے؟',
    SELECT_TYPE_BTN: 'شکایت منتخب کریں',
    TYPES_SECTION: 'شکایات کی اقسام',

    // Location
    ASK_LOCATION:
      '📍 پیٹرول پمپ کی *GPS لوکیشن شیئر کریں:*\n\n' +
      '📌 اٹیچمنٹ آئیکن (📎) دبائیں → *Location* منتخب کریں۔\n\n' +
      '⚠️ صرف GPS لوکیشن قبول کی جائے گی — متنی پتہ درج نہ کریں۔',
    LOCATION_RECEIVED: '✅ GPS لوکیشن موصول ہو گئی۔ شکریہ!',
    INVALID_LOCATION:
      '⚠️ براہ کرم *GPS لوکیشن* شیئر کریں (📎 → Location)۔\n' +
      'متنی پتہ اس مرحلے میں قبول نہیں ہوتا۔',

    // Landmark
    ASK_LANDMARK:
      '🏫 پیٹرول پمپ کے قریب *کوئی مشہور نشانی* بتائیں:\n\n' +
      'مثال: سٹی ہسپتال کے قریب، جناح پارک کے سامنے، KFC کے ساتھ',
    INVALID_LANDMARK:
      '⚠️ قریبی نشانی ضروری ہے۔ براہ کرم کوئی واضح نشانی ٹائپ کریں (کم از کم 3 حروف)۔',
    LANDMARK_RECEIVED: '✅ نشانی نوٹ کر لی گئی!',
    REVIEW_LANDMARK:   '🏫 قریبی نشانی:',

    // Image upload
    ASK_IMAGE:
      '📸 کیا آپ کے پاس *تصویری ثبوت* ہے؟\n' +
      '(مثلاً میٹر ریڈنگ، رسید، پمپ ڈسپلے)\n\n' +
      'براہ کرم تصویر بھیجیں، یا چھوڑ دیں۔',
    SKIP_BTN: 'چھوڑیں ⏭️',
    IMAGE_RECEIVED: '✅ تصویر موصول ہو گئی!',
    INVALID_IMAGE: '⚠️ براہ کرم صرف *تصویر فائل* بھیجیں (JPG, PNG)۔',

    // Details
    ASK_DETAILS_REQUIRED:
      '✍️ براہ کرم اپنی *شکایت تفصیل سے بیان کریں* (کم از کم 20 حروف):',
    DETAILS_TOO_SHORT: '⚠️ تفصیلات بہت مختصر ہیں۔ براہ کرم *کم از کم 20 حروف* درج کریں۔',

    // Review
    REVIEW_HEADER:   '📋 *شکایت کا جائزہ*',
    REVIEW_CNIC:     '🪪 CNIC:',
    REVIEW_PROVINCE: '🗺️ صوبہ:',
    REVIEW_PUMP:     '⛽ پمپ:',
    REVIEW_TYPE:     '📝 قسم:',
    REVIEW_DETAILS:  '✍️ تفصیلات:',
    REVIEW_LOCATION: '📍 مقام:',
    REVIEW_LANDMARK: '🏫 قریبی نشانی:',
    REVIEW_IMAGE:    '📸 تصویر:',
    REVIEW_FOOTER:   'جمع کرانے سے پہلے اپنی شکایت کا جائزہ لیں۔',
    GPS_ATTACHED:    '📌 GPS لوکیشن منسلک',
    IMAGE_ATTACHED:  '✅ منسلک',
    NOT_ATTACHED:    '➖ منسلک نہیں',
    NOT_PROVIDED:    '➖ فراہم نہیں کیا',
    SUBMIT_BTN:  '✅ جمع کریں',
    EDIT_BTN:    '✏️ ترمیم',

    // Edit field select
    ASK_EDIT_FIELD:   '✏️ آپ کون سا *حصہ* تبدیل کرنا چاہتے ہیں؟',
    SELECT_FIELD_BTN: 'حصہ منتخب کریں',
    FIELDS_SECTION:   'حصے',

    // Confirmation
    CONFIRMATION_SUCCESS: '✅ *شکایت کامیابی سے جمع ہو گئی!*',
    COMPLAINT_ID_LABEL:   '🔖 شکایت نمبر:',
    STATUS_LABEL:         '📊 اسٹیٹس:',
    STATUS_PENDING:       '⏳ زیر التواء',
    CONFIRMATION_FOOTER:
      'آپ کی شکایت جائزے کے لیے بھیج دی گئی ہے۔\n' +
      'کارروائی ہونے پر آپ کو اطلاع دی جائے گی۔\n\n' +
      'جزاک اللہ خیر 🙏',
    NEW_COMPLAINT_BTN: '🔄 نئی شکایت',

    // Proactive status notifications
    STATUS_IN_PROGRESS_MSG: (code) =>
      `📣 *شکایت کی صورتحال میں تبدیلی*\n\n` +
      `🔖 شکایت نمبر: ${code}\n` +
      `📊 اسٹیٹس: 🔄 زیر کارروائی\n\n` +
      `آپ کی شکایت ہماری ٹیم کے زیر جائزہ ہے۔\n` +
      `حل ہونے پر آپ کو اطلاع دی جائے گی۔`,

    STATUS_RESOLVED_MSG: (code, remarks) =>
      `✅ *شکایت حل ہو گئی!*\n\n` +
      `🔖 شکایت نمبر: ${code}\n` +
      `📊 اسٹیٹس: ✅ حل شدہ\n\n` +
      `📝 *افسر کے ریمارکس:*\n"${remarks}"\n\n` +
      `پاکستان میں فیول سروسز کو بہتر بنانے میں مدد کرنے کا شکریہ۔ 🇵🇰`,

    // Session / errors
    RESTART_MSG:     '🔄 آپ کا سیشن دوبارہ شروع ہو رہا ہے...',
    SESSION_EXPIRED: '⏰ غیرفعالیت کی وجہ سے آپ کا سیشن ختم ہو گیا۔ دوبارہ شروع کریں!',
    ERROR_GENERIC:   '❌ کچھ غلط ہو گیا۔ دوبارہ کوشش کریں یا "شروع" لکھیں۔'
  }
};

// ── Accessor helpers ──────────────────────────────────────────────────────────

/**
 * Get a message value for the given language and key.
 * Falls back to EN if the key is missing in the requested language.
 * @param {'EN'|'UR'} lang
 * @param {string} key
 * @returns {string|function}
 */
function getMessage(lang, key) {
  const dict = messages[lang] || messages.EN;
  return dict[key] !== undefined ? dict[key] : (messages.EN[key] ?? `[${key}]`);
}

function getProvinceLabel(id, lang) {
  return PROVINCE_LABELS[id]?.[lang] ?? id;
}

function getPumpLabel(id, lang) {
  return PUMP_LABELS[id]?.[lang] ?? id;
}

function getComplaintTypeLabel(id, lang) {
  return COMPLAINT_TYPE_LABELS[id]?.[lang] ?? id;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Mask CNIC for privacy — shows first 6 digits, masks middle, shows last 3.
 * @param {string} cnic
 * @returns {string}
 */
function maskCnic(cnic) {
  if (!cnic || cnic.length !== 13) return cnic || '—';
  return `${cnic.slice(0, 6)}•••${cnic.slice(-3)}`;
}

/**
 * Build the review summary message body (used for REVIEW state).
 * @param {object} session
 * @returns {string}
 */
function buildReviewSummary(session) {
  const lang = session.language || 'EN';
  const M = (key) => getMessage(lang, key);

  const locationLine = session.latitude ? M('GPS_ATTACHED') : M('NOT_PROVIDED');
  const landmarkLine = session.landmark || M('NOT_PROVIDED');
  const imageLine    = session.imageMediaId ? M('IMAGE_ATTACHED') : M('NOT_ATTACHED');
  const detailsLine  = session.details
    ? (session.details.length > 60 ? session.details.slice(0, 57) + '...' : session.details)
    : M('NOT_PROVIDED');

  return [
    M('REVIEW_HEADER'),
    '',
    `${M('REVIEW_CNIC')} ${maskCnic(session.cnic)}`,
    `${M('REVIEW_PROVINCE')} ${getProvinceLabel(session.province, lang)}`,
    `${M('REVIEW_TYPE')} ${getComplaintTypeLabel(session.complaintType, lang)}`,
    `${M('REVIEW_DETAILS')} ${detailsLine}`,
    `${M('REVIEW_PUMP')} ${getPumpLabel(session.pumpName, lang)}`,
    `${M('REVIEW_LOCATION')} ${locationLine}`,
    `${M('REVIEW_LANDMARK')} ${landmarkLine}`,
    `${M('REVIEW_IMAGE')} ${imageLine}`,
    '',
    '──────────────────────────────',
    M('REVIEW_FOOTER')
  ].join('\n');
}

/**
 * Build the confirmation message body.
 * @param {object} session
 * @param {string} complaintCode
 * @returns {string}
 */
function buildConfirmationMessage(session, complaintCode) {
  const lang = session.language || 'EN';
  const M = (key) => getMessage(lang, key);
  return [
    M('CONFIRMATION_SUCCESS'),
    '',
    `${M('COMPLAINT_ID_LABEL')} *${complaintCode}*`,
    `${M('STATUS_LABEL')} ${M('STATUS_PENDING')}`,
    '',
    M('CONFIRMATION_FOOTER')
  ].join('\n');
}

module.exports = {
  messages,
  getMessage,
  PROVINCES,
  PUMPS,
  COMPLAINT_TYPES,
  EDIT_FIELDS,
  PROVINCE_LABELS,
  PUMP_LABELS,
  COMPLAINT_TYPE_LABELS,
  getProvinceLabel,
  getPumpLabel,
  getComplaintTypeLabel,
  maskCnic,
  buildReviewSummary,
  buildConfirmationMessage
};
