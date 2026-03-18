/**
 * Constants, validators, and helpers for the Fuel Complaint System
 * All enum keys match the API contract exactly — do not rename them.
 */

const STATES = {
  LANGUAGE:       'LANGUAGE',
  CNIC_INPUT:     'CNIC_INPUT',
  LOCATION_INPUT: 'LOCATION_INPUT',
  PUMP_SELECTION: 'PUMP_SELECTION',
  LANDMARK_INPUT: 'LANDMARK_INPUT',
  COMPLAINT_TYPE: 'COMPLAINT_TYPE',
  DETAILS_INPUT:  'DETAILS_INPUT',
  IMAGE_UPLOAD:   'IMAGE_UPLOAD',
  REVIEW:         'REVIEW',
  EDIT_SELECT:    'EDIT_SELECT',
  CONFIRMATION:   'CONFIRMATION'
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
  { id: 'PARCO',    title: 'PARCO',              label: 'Pak-Arab Refinery (PARCO)' },
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
  { id: 'SHORT_MEASUREMENT', en: 'Short Measurement',   ur: 'Kam Miqdar' },
  { id: 'FUEL_QUALITY',      en: 'Fuel Quality Issue',  ur: 'Petrol Kharab' },
  { id: 'OVERCHARGING',      en: 'Overcharging',        ur: 'Zyada Qeemat' },
  { id: 'REFUSED_SERVICE',   en: 'Refused to Serve',    ur: 'Service Se Inkar' },
  { id: 'ADULTERATION',      en: 'Adulteration',        ur: 'Milawat' },
  { id: 'ILLEGAL_STATION',   en: 'Illegal Station',     ur: 'Ghair Qanooni' },
  { id: 'MISBEHAVIOR',       en: 'Staff Misbehavior',   ur: 'Bura Bartao' },
  { id: 'OTHER',             en: 'Other',               ur: 'Doosri Shikayat' }
];

// ---------------------------------------------------------------------------
// Provinces — allowed enum values for the API
// ---------------------------------------------------------------------------
const PROVINCE_MAP = {
  punjab:                      'Punjab',
  sindh:                       'Sindh',
  'khyber pakhtunkhwa':        'KPK',
  kpk:                         'KPK',
  'khyber-pakhtunkhwa':        'KPK',
  balochistan:                 'Balochistan',
  'islamabad capital territory': 'Islamabad',
  islamabad:                   'Islamabad',
  'gilgit-baltistan':          'Gilgit Baltistan',
  'gilgit baltistan':          'Gilgit Baltistan',
  'azad kashmir':              'Azad Kashmir',
  'azad jammu and kashmir':    'Azad Kashmir'
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
  { id: 'pump',           en: 'Pump Brand',       ur: 'Pump Ka Naam' },
  { id: 'landmark',       en: 'Landmark',         ur: 'Landmark' },
  { id: 'complaint_type', en: 'Complaint Type',   ur: 'Shikayat Ki Nau' },
  { id: 'details',        en: 'Details',          ur: 'Tafseel' },
  { id: 'image',          en: 'Image',            ur: 'Tasveer' }
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
  generateComplaintCode,
  getPumpLabel,
  getPumpTitle,
  getComplaintTypeTitle,
  getComplaintTypesForList,
  getEditFieldsForList
};
