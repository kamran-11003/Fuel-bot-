/**
 * Constants, validators, and helpers for the Fuel Complaint System
 * All enum keys match the API contract exactly — do not rename them.
 */

const STATES = {
  LANGUAGE:           'LANGUAGE',
  MAIN_MENU:          'MAIN_MENU',
  CNIC_INPUT:         'CNIC_INPUT',
  LOCATION_INPUT:     'LOCATION_INPUT',
  PUMP_SELECTION:     'PUMP_SELECTION',
  LANDMARK_INPUT:     'LANDMARK_INPUT',
  COMPLAINT_TYPE:     'COMPLAINT_TYPE',
  DETAILS_INPUT:      'DETAILS_INPUT',
  IMAGE_UPLOAD:       'IMAGE_UPLOAD',
  REVIEW:             'REVIEW',
  EDIT_SELECT:        'EDIT_SELECT',
  CONFIRMATION:       'CONFIRMATION',
  STATUS_PHONE_INPUT: 'STATUS_PHONE_INPUT',
  STATUS_CNIC_INPUT:  'STATUS_CNIC_INPUT'
};

// ---------------------------------------------------------------------------
// Petrol pump brands shown in the WhatsApp list (max 10 rows allowed by API)
// id    = API enum key (sent to backend exactly as-is)
// title = shown in WhatsApp interactive list (max 24 chars)
// label = full display name used in review summary
// ---------------------------------------------------------------------------
const PUMPS = [
  { id: 'PSO',      title: 'Pakistan State Oil', label: 'Pakistan State Oil (PSO)' },
  { id: 'SHELL',    title: 'Shell Pakistan',     label: 'Shell Pakistan' },
  { id: 'TOTAL',    title: 'Total PARCO',        label: 'Total PARCO' },
  { id: 'HASCOL',   title: 'Hascol Petroleum',   label: 'Hascol Petroleum' },
  { id: 'GO',       title: 'GO Pakistan',        label: 'Gas & Oil Pakistan (GO)' },
  { id: 'APL',      title: 'Attock (APL)',        label: 'Attock Petroleum (APL)' },
  { id: 'BYCO',     title: 'Byco Petroleum',     label: 'Byco Petroleum' },
  { id: 'ARAMCO',   title: 'Saudi ARAMCO',       label: 'Saudi Arabian Oil Company (ARAMCO)' },
  { id: 'EURO_OIL', title: 'Euro Oil',           label: 'Euro Oil' },
  { id: 'OTHER',    title: 'Other / Unknown',    label: 'Other / Unknown' }
];
// WhatsApp hard-limits list messages to 10 rows total.
// OILMAN, PEARL, AL_HABIB are valid API enum values but not shown in the bot list;
// users can select "Other" and the backend maps accordingly.

// ---------------------------------------------------------------------------
// Complaint types
// id   = API enum key (sent to backend exactly as-is)
// en   = English label shown in WhatsApp list
// ur   = Urdu (Roman) label shown in WhatsApp list
// ---------------------------------------------------------------------------
const COMPLAINT_TYPES = [
  { id: 'SHORT_MEASUREMENT', en: 'Short Measurement',   ur: 'کم مقدار' },
  { id: 'FUEL_QUALITY',      en: 'Fuel Quality Issue',  ur: 'پیٹرول خراب' },
  { id: 'OVERCHARGING',      en: 'Overcharging',        ur: 'زیادہ قیمت' },
  { id: 'REFUSED_SERVICE',   en: 'Refused to Serve',    ur: 'سروس سے انکار' },
  { id: 'ADULTERATION',      en: 'Adulteration',        ur: 'ملاوٹ' },
  { id: 'ILLEGAL_STATION',   en: 'Illegal Station',     ur: 'غیر قانونی اسٹیشن' },
  { id: 'MISBEHAVIOR',       en: 'Staff Misbehavior',   ur: 'بدسلوکی' },
  { id: 'OTHER',             en: 'Other',               ur: 'دیگر شکایت' }
];

// ---------------------------------------------------------------------------
// Provinces — allowed enum values for the API
// ---------------------------------------------------------------------------
const PROVINCE_MAP = {
  // English names (from Nominatim en)
  punjab:                        'Punjab',
  sindh:                         'Sindh',
  'khyber pakhtunkhwa':          'KPK',
  kpk:                           'KPK',
  'khyber-pakhtunkhwa':          'KPK',
  balochistan:                   'Balochistan',
  'islamabad capital territory': 'Islamabad',
  islamabad:                     'Islamabad',
  'gilgit-baltistan':            'Gilgit Baltistan',
  'gilgit baltistan':            'Gilgit Baltistan',
  'azad kashmir':                'Azad Kashmir',
  'azad jammu and kashmir':      'Azad Kashmir',
  // Urdu names (from Nominatim ur)
  'پنجاب':                       'Punjab',
  'سندھ':                        'Sindh',
  'خیبر پختونخوا':               'KPK',
  'بلوچستان':                    'Balochistan',
  'اسلام آباد':                  'Islamabad',
  'گلگت بلتستان':                'Gilgit Baltistan',
  'آزاد کشمیر':                  'Azad Kashmir',
  'آزاد جموں و کشمیر':           'Azad Kashmir'
};

/**
 * Normalise a raw Nominatim state string to one of the API enum values.
 * Returns null if unknown.
 */
function normalizeProvince(raw) {
  if (!raw) return null;
  return PROVINCE_MAP[raw.toLowerCase().trim()] || raw;
}

// ---------------------------------------------------------------------------
// Edit fields
// ---------------------------------------------------------------------------
const EDIT_FIELDS = [
  { id: 'pump',           en: 'Pump Brand',     ur: 'پمپ کا نام' },
  { id: 'landmark',       en: 'Landmark',       ur: 'قریبی نشان' },
  { id: 'complaint_type', en: 'Complaint Type', ur: 'شکایت کی نوعیت' },
  { id: 'details',        en: 'Details',        ur: 'تفصیل' },
  { id: 'image',          en: 'Image',          ur: 'تصویر' }
];

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------
function isValidCnic(val) {
  return /^\d{13,14}$/.test((val || '').replace(/[-\s]/g, ''));
}

function cleanCnic(val) {
  return (val || '').replace(/\D/g, '');
}

function isValidDetails(val) {
  return val && val.trim().length >= 10;
}

function isValidPhone(val) {
  const digits = (val || '').replace(/\D/g, '');
  return /^\d{10,12}$/.test(digits);
}

function cleanPhone(val) {
  return (val || '').replace(/\D/g, '');
}

/**
 * Strip HTML tags, control characters, and enforce max length.
 * Used on all free-text user inputs before storage.
 */
function sanitizeText(val, maxLen = 1000) {
  if (!val) return '';
  return val
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars (keep \n, \r, \t)
    .trim()
    .slice(0, maxLen);
}

function generateComplaintCode() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `FC-${num}`;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Returns the full label for a pump id (e.g. "PSO" → "Pakistan State Oil (PSO)") */
function getPumpLabel(id) {
  return PUMPS.find(p => p.id === id)?.label || id || '—';
}

/** Returns the WhatsApp list title for a pump id */
function getPumpTitle(id) {
  return PUMPS.find(p => p.id === id)?.title || id;
}

/** Returns the display label for a complaint type id in the given language */
function getComplaintTypeTitle(id, lang = 'en') {
  const t = COMPLAINT_TYPES.find(c => c.id === id);
  return t ? (t[lang] || t.en) : (id || '—');
}

/** Returns list-ready array of complaint types for the given language */
function getComplaintTypesForList(lang = 'en') {
  return COMPLAINT_TYPES.map(c => ({ id: c.id, title: c[lang] || c.en }));
}

/** Returns list-ready array of edit fields for the given language */
function getEditFieldsForList(lang = 'en') {
  return EDIT_FIELDS.map(f => ({ id: f.id, title: f[lang] || f.en }));
}

module.exports = {
  STATES,
  PUMPS,
  COMPLAINT_TYPES,
  EDIT_FIELDS,
  normalizeProvince,
  isValidCnic,
  cleanCnic,
  isValidDetails,
  isValidPhone,
  cleanPhone,
  sanitizeText,
  generateComplaintCode,
  getPumpLabel,
  getPumpTitle,
  getComplaintTypeTitle,
  getComplaintTypesForList,
  getEditFieldsForList
};
