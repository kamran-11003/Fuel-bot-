/**
 * Constants, validators, and helpers for the Fuel Complaint System
 */

// Bot states for the conversation flow
const STATES = {
  GREETING: 'GREETING',
  CNIC_INPUT: 'CNIC_INPUT',
  REGION_SELECTION: 'REGION_SELECTION',
  COMPLAINT_TYPE: 'COMPLAINT_TYPE',
  DETAILS_INPUT: 'DETAILS_INPUT',
  LOCATION_INPUT: 'LOCATION_INPUT',
  IMAGE_UPLOAD: 'IMAGE_UPLOAD',
  REVIEW: 'REVIEW',
  EDIT_SELECT: 'EDIT_SELECT',
  CONFIRMATION: 'CONFIRMATION'
};

// Region options with IDs for buttons/lists
const REGIONS = [
  { id: 'islamabad', title: 'Islamabad' },
  { id: 'rawalpindi', title: 'Rawalpindi' },
  { id: 'lahore', title: 'Lahore' },
  { id: 'karachi', title: 'Karachi' },
  { id: 'other', title: 'Other' }
];

// Complaint type options with IDs
const COMPLAINT_TYPES = [
  { id: 'fuel_shortage', title: 'Fuel shortage ⛽' },
  { id: 'overpricing', title: 'Overpricing 💰' },
  { id: 'pump_closed', title: 'Pump closed 🚫' },
  { id: 'illegal_practices', title: 'Illegal practices ⚖️' },
  { id: 'other', title: 'Other 📝' }
];

// Edit field options
const EDIT_FIELDS = [
  { id: 'complaint_type', title: 'Complaint Type 📝' },
  { id: 'details', title: 'Details 📄' },
  { id: 'location', title: 'Location 📍' },
  { id: 'image', title: 'Image 📷' }
];

// Maps for quick lookup
const REGION_MAP = REGIONS.reduce((acc, r) => {
  acc[r.id] = r.title;
  return acc;
}, {});

const COMPLAINT_TYPE_MAP = COMPLAINT_TYPES.reduce((acc, c) => {
  acc[c.id] = c.title;
  return acc;
}, {});

/**
 * Validate CNIC format (exactly 13 digits)
 * @param {string} cnic 
 * @returns {boolean}
 */
function isValidCnic(cnic) {
  if (!cnic) return false;
  const cleaned = cnic.replace(/\D/g, '');
  return cleaned.length === 13;
}

/**
 * Clean CNIC input (remove non-digits)
 * @param {string} cnic 
 * @returns {string}
 */
function cleanCnic(cnic) {
  if (!cnic) return '';
  return cnic.replace(/\D/g, '');
}

/**
 * Validate complaint details (minimum length)
 * @param {string} details 
 * @param {number} minLength 
 * @returns {boolean}
 */
function isValidDetails(details, minLength = 10) {
  if (!details) return false;
  return details.trim().length >= minLength;
}

/**
 * Generate complaint code in format FC-XXXXX
 * @param {number} id - Database ID
 * @returns {string}
 */
function generateComplaintCode(id) {
  const padded = String(id).padStart(5, '0');
  return `FC-${padded}`;
}

/**
 * Check if location data is valid
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
function isValidLocation(latitude, longitude) {
  if (latitude === null || latitude === undefined) return false;
  if (longitude === null || longitude === undefined) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Calculate hours since a given date
 * @param {Date|string} date 
 * @returns {number}
 */
function hoursSince(date) {
  if (!date) return Infinity;
  const then = new Date(date);
  const now = new Date();
  const diffMs = now - then;
  return diffMs / (1000 * 60 * 60);
}

/**
 * Check if user can submit a new complaint (prevent spam)
 * @param {Date|string} lastComplaintAt 
 * @param {number} cooldownHours 
 * @returns {boolean}
 */
function canSubmitComplaint(lastComplaintAt, cooldownHours = 24) {
  if (!lastComplaintAt) return true;
  return hoursSince(lastComplaintAt) >= cooldownHours;
}

/**
 * Find region title by ID
 * @param {string} id 
 * @returns {string}
 */
function getRegionTitle(id) {
  return REGION_MAP[id] || id;
}

/**
 * Find complaint type title by ID
 * @param {string} id 
 * @returns {string}
 */
function getComplaintTypeTitle(id) {
  return COMPLAINT_TYPE_MAP[id] || id;
}

/**
 * Initial session state
 * @returns {object}
 */
function getInitialSessionData() {
  return {
    state: STATES.GREETING,
    cnic: null,
    region: null,
    complaint_type: null,
    details: null,
    latitude: null,
    longitude: null,
    location_text: null,
    image_url: null
  };
}

module.exports = {
  STATES,
  REGIONS,
  COMPLAINT_TYPES,
  EDIT_FIELDS,
  REGION_MAP,
  COMPLAINT_TYPE_MAP,
  isValidCnic,
  cleanCnic,
  isValidDetails,
  generateComplaintCode,
  isValidLocation,
  hoursSince,
  canSubmitComplaint,
  getRegionTitle,
  getComplaintTypeTitle,
  getInitialSessionData
};
