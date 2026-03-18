/**
 * Constants, options, and validators for the Fuel Complaint System
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

// Fuel pump brands
const PUMPS = [
  { id: 'pso',    title: 'PSO' },
  { id: 'shell',  title: 'Shell' },
  { id: 'attock', title: 'Attock' },
  { id: 'aramco', title: 'Saudi Aramco' },
  { id: 'total',  title: 'Total Parco' },
  { id: 'hascol', title: 'Hascol' },
  { id: 'other',  title: 'Other' }
];

// Complaint types — bilingual labels
const COMPLAINT_TYPES = [
  { id: 'fuel_shortage', en: 'Fuel Shortage ⛽',          ur: 'Petrol Ki Kami ⛽' },
  { id: 'overpricing',   en: 'Overpricing 💰',             ur: 'Zyada Qeemat 💰' },
  { id: 'pump_closed',   en: 'Pump Closed 🚫',             ur: 'Pump Bund 🚫' },
  { id: 'illegal',       en: 'Illegal Practices ⚖️',       ur: 'Ghair Qanooni Harkat ⚖️' },
  { id: 'other',         en: 'Other 📝',                   ur: 'Doosri Shikayat 📝' }
];

// Fields that can be edited from REVIEW
const EDIT_FIELDS = [
  { id: 'pump',           en: 'Pump Brand 🏪',        ur: 'Pump Ka Naam 🏪' },
  { id: 'landmark',       en: 'Landmark 📌',           ur: 'Landmark 📌' },
  { id: 'complaint_type', en: 'Complaint Type 📝',     ur: 'Shikayat Ki Nau 📝' },
  { id: 'details',        en: 'Details 📄',            ur: 'Tafseel 📄' },
  { id: 'image',          en: 'Image 📷',              ur: 'Tasveer 📷' }
];

function isValidCnic(val) {
  return /^\d{13}$/.test((val || '').replace(/[-\s]/g, ''));
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

function getPumpTitle(id) {
  return PUMPS.find(p => p.id === id)?.title || id;
}

function getComplaintTypeTitle(id, lang = 'en') {
  const t = COMPLAINT_TYPES.find(c => c.id === id);
  return t ? (t[lang] || t.en) : id;
}

// Returns list-ready array of complaint types in given language
function getComplaintTypesForList(lang = 'en') {
  return COMPLAINT_TYPES.map(c => ({ id: c.id, title: c[lang] || c.en }));
}

// Returns list-ready array of edit fields in given language
function getEditFieldsForList(lang = 'en') {
  return EDIT_FIELDS.map(f => ({ id: f.id, title: f[lang] || f.en }));
}

module.exports = {
  STATES,
  PUMPS,
  COMPLAINT_TYPES,
  EDIT_FIELDS,
  isValidCnic,
  cleanCnic,
  isValidDetails,
  generateComplaintCode,
  getPumpTitle,
  getComplaintTypeTitle,
  getComplaintTypesForList,
  getEditFieldsForList
};
