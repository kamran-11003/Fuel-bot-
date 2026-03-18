/**
 * State machine — routes every incoming WhatsApp message through the complaint flow
 *
 * Flow:
 *   LANGUAGE → CNIC_INPUT → LOCATION_INPUT → PUMP_SELECTION
 *   → LANDMARK_INPUT → COMPLAINT_TYPE → DETAILS_INPUT
 *   → IMAGE_UPLOAD → REVIEW → CONFIRMATION
 */

const axios = require('axios');

const {
  STATES, PUMPS, isValidCnic, cleanCnic, isValidDetails,
  generateComplaintCode, getComplaintTypesForList, getEditFieldsForList,
  normalizeProvince
} = require('./seed');

const { S, buildReviewSummary } = require('./strings');

const { getSession, updateSession, resetSession, saveComplaint } = require('./session');

const {
  sendTextMessage, sendButtonMessage, sendListMessage,
  getUserInput, isStartTrigger
} = require('./whatsapp');

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

async function handleMessage(phoneNumber, message) {
  try {
    let session = getSession(phoneNumber);
    const input  = getUserInput(message);

    // Global restart trigger
    if (input.type === 'text' && isStartTrigger(input.value)) {
      session = resetSession(phoneNumber);
      await sendLanguagePrompt(phoneNumber, session);
      return;
    }

    switch (session.state) {
      case STATES.LANGUAGE:       return await onLanguage(phoneNumber, session, input);
      case STATES.CNIC_INPUT:     return await onCnic(phoneNumber, session, input);
      case STATES.LOCATION_INPUT: return await onLocation(phoneNumber, session, input);
      case STATES.PUMP_SELECTION: return await onPump(phoneNumber, session, input);
      case STATES.LANDMARK_INPUT: return await onLandmark(phoneNumber, session, input);
      case STATES.COMPLAINT_TYPE: return await onComplaintType(phoneNumber, session, input);
      case STATES.DETAILS_INPUT:  return await onDetails(phoneNumber, session, input);
      case STATES.IMAGE_UPLOAD:   return await onImage(phoneNumber, session, input);
      case STATES.REVIEW:         return await onReview(phoneNumber, session, input);
      case STATES.EDIT_SELECT:    return await onEditSelect(phoneNumber, session, input);
      case STATES.CONFIRMATION:   return await onConfirmation(phoneNumber, session, input);
      default:
        session = resetSession(phoneNumber);
        await sendLanguagePrompt(phoneNumber, session);
    }
  } catch (err) {
    console.error('Handler error:', err);
    const session = getSession(phoneNumber);
    await sendTextMessage(phoneNumber, S(session, 'ERROR'));
  }
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

async function onLanguage(phone, session, input) {
  if (!input.value) {
    await sendLanguagePrompt(phone, session);
    return;
  }

  const val = (input.value || '').toLowerCase();
  let lang = null;
  if (val === 'en' || val === 'english') lang = 'en';
  if (val === 'ur' || val === 'urdu' || val === 'اردو') lang = 'ur';

  if (!lang) {
    await sendLanguagePrompt(phone, session);
    return;
  }

  updateSession(phone, { lang, state: STATES.CNIC_INPUT });
  await sendTextMessage(phone, S({ lang }, 'CNIC_PROMPT'));
}

async function onCnic(phone, session, input) {
  if (input.type !== 'text') {
    await sendTextMessage(phone, S(session, 'CNIC_PROMPT'));
    return;
  }

  const cnic = cleanCnic(input.value);

  if (!isValidCnic(cnic)) {
    await sendTextMessage(phone, S(session, 'CNIC_INVALID'));
    return;
  }

  updateSession(phone, { cnic, state: STATES.LOCATION_INPUT });
  await sendTextMessage(phone, S(session, 'LOCATION_PROMPT'));
}

async function onLocation(phone, session, input) {
  if (input.type === 'location') {
    const { latitude, longitude } = input.value;

    // Pass language so city/area names come back in the user's chosen script
    const geo = await reverseGeocode(latitude, longitude, session.lang);

    updateSession(phone, {
      latitude,
      longitude,
      province: geo.province,
      city:     geo.city,
      area:     geo.area,
      state:    STATES.PUMP_SELECTION
    });

    await sendTextMessage(phone, S(session, 'LOCATION_RECEIVED'));
    await sendPumpList(phone, session);
    return;
  }

  await sendTextMessage(phone, S(session, 'LOCATION_INVALID'));
}

async function onPump(phone, session, input) {
  const pumpId = resolveListOrButton(input, PUMPS);

  if (!pumpId) {
    await sendPumpList(phone, session);
    return;
  }

  // Store the enum key — used directly in the API payload
  updateSession(phone, { pump: pumpId, state: STATES.LANDMARK_INPUT });
  await sendButtonMessage(phone, S(session, 'LANDMARK_PROMPT'), [
    { id: 'skip', title: S(session, 'SKIP_BTN') }
  ]);
}

async function onLandmark(phone, session, input) {
  if (isSkip(input)) {
    updateSession(phone, { landmark: null, state: STATES.COMPLAINT_TYPE });
    await sendComplaintTypeList(phone, session);
    return;
  }

  if (input.type === 'text' && input.value.trim().length > 0) {
    updateSession(phone, { landmark: input.value.trim(), state: STATES.COMPLAINT_TYPE });
    await sendComplaintTypeList(phone, session);
    return;
  }

  await sendButtonMessage(phone, S(session, 'LANDMARK_PROMPT'), [
    { id: 'skip', title: S(session, 'SKIP_BTN') }
  ]);
}

async function onComplaintType(phone, session, input) {
  const types  = getComplaintTypesForList(session.lang);
  const typeId = resolveListOrButton(input, types);

  if (!typeId) {
    await sendComplaintTypeList(phone, session);
    return;
  }

  // Store the enum key — used directly in the API payload
  updateSession(phone, { complaint_type: typeId, state: STATES.DETAILS_INPUT });
  await sendTextMessage(phone, S(session, 'DETAILS_PROMPT'));
}

async function onDetails(phone, session, input) {
  if (input.type !== 'text' || !isValidDetails(input.value)) {
    await sendTextMessage(phone, S(session, 'DETAILS_TOO_SHORT'));
    return;
  }

  updateSession(phone, { details: input.value.trim(), state: STATES.IMAGE_UPLOAD });
  await sendButtonMessage(phone, S(session, 'IMAGE_PROMPT'), [
    { id: 'skip', title: S(session, 'SKIP_BTN') }
  ]);
}

async function onImage(phone, session, input) {
  if (isSkip(input)) {
    updateSession(phone, { state: STATES.REVIEW });
    await sendReview(phone, getSession(phone));
    return;
  }

  if (input.type === 'image') {
    updateSession(phone, {
      has_image: true,
      image_id:  input.value.id,
      state:     STATES.REVIEW
    });
    await sendTextMessage(phone, S(session, 'IMAGE_RECEIVED'));
    await sendReview(phone, getSession(phone));
    return;
  }

  await sendButtonMessage(phone, S(session, 'IMAGE_PROMPT'), [
    { id: 'skip', title: S(session, 'SKIP_BTN') }
  ]);
}

async function onReview(phone, session, input) {
  if (input.type === 'button') {
    if (input.value === 'submit') {
      await doSubmit(phone, session);
      return;
    }
    if (input.value === 'edit') {
      updateSession(phone, { state: STATES.EDIT_SELECT });
      await sendEditSelectList(phone, session);
      return;
    }
  }

  await sendReview(phone, session);
}

async function onEditSelect(phone, session, input) {
  const fields  = getEditFieldsForList(session.lang);
  const fieldId = resolveListOrButton(input, fields);

  if (!fieldId) {
    await sendEditSelectList(phone, session);
    return;
  }

  switch (fieldId) {
    case 'pump':
      updateSession(phone, { state: STATES.PUMP_SELECTION });
      await sendPumpList(phone, session);
      break;
    case 'landmark':
      updateSession(phone, { state: STATES.LANDMARK_INPUT });
      await sendButtonMessage(phone, S(session, 'LANDMARK_PROMPT'), [
        { id: 'skip', title: S(session, 'SKIP_BTN') }
      ]);
      break;
    case 'complaint_type':
      updateSession(phone, { state: STATES.COMPLAINT_TYPE });
      await sendComplaintTypeList(phone, session);
      break;
    case 'details':
      updateSession(phone, { state: STATES.DETAILS_INPUT });
      await sendTextMessage(phone, S(session, 'DETAILS_PROMPT'));
      break;
    case 'image':
      updateSession(phone, { state: STATES.IMAGE_UPLOAD });
      await sendButtonMessage(phone, S(session, 'IMAGE_PROMPT'), [
        { id: 'skip', title: S(session, 'SKIP_BTN') }
      ]);
      break;
    default:
      await sendEditSelectList(phone, session);
  }
}

async function onConfirmation(phone, session, input) {
  if (input.type === 'button' && input.value === 'start') {
    const fresh = resetSession(phone);
    await sendLanguagePrompt(phone, fresh);
    return;
  }
  await sendButtonMessage(phone, S(session, 'NEW_COMPLAINT_PROMPT'), [
    { id: 'start', title: S(session, 'START_BTN') }
  ]);
}

// ---------------------------------------------------------------------------
// Submit complaint
// ---------------------------------------------------------------------------

async function doSubmit(phone, session) {
  // Build the API payload — matches the backend contract exactly
  const payload = {
    user: {
      phoneNumber: session.phone,
      cnic:        session.cnic
    },
    location: {
      lat:             session.latitude,
      lng:             session.longitude,
      city:            session.city     || null,
      province:        session.province || null,
      nearestLandmark: session.landmark || null
    },
    complaint: {
      type:        session.complaint_type,   // enum key e.g. "FUEL_QUALITY"
      pumpBrand:   session.pump,             // enum key e.g. "PSO"
      description: session.details,
      images:      session.has_image ? [{ mediaId: session.image_id }] : []
    }
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║        COMPLAINT SUBMITTED           ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(JSON.stringify(payload, null, 2));
  console.log('═══════════════════════════════════════\n');

  // Try to POST to backend and use the complaint ID from the response
  let complaintCode = null;
  const apiUrl = process.env.COMPLAINT_API_URL;

  if (apiUrl) {
    try {
      const resp = await axios.post(apiUrl, payload, { timeout: 8000 });
      const data = resp.data || {};
      // Accept any of these common ID fields from the backend response
      complaintCode = data.complaintId || data.complaint_code || data.id || data.code || null;
      console.log(`✅ API accepted complaint. ID from backend: ${complaintCode}`);
    } catch (e) {
      console.warn('⚠️  API call failed, using local fallback ID:', e.message);
    }
  }

  // Fall back to a local ID if backend didn't return one or API is not configured
  if (!complaintCode) {
    complaintCode = generateComplaintCode();
    console.log(`ℹ️  Using local complaint code: ${complaintCode}`);
  }

  saveComplaint(session, complaintCode);
  updateSession(phone, { state: STATES.CONFIRMATION });
  await sendTextMessage(phone, S(session, 'CONFIRM_MSG', complaintCode));
}

// ---------------------------------------------------------------------------
// Message senders
// ---------------------------------------------------------------------------

async function sendLanguagePrompt(phone, session) {
  await sendButtonMessage(phone, S(session, 'LANGUAGE_PROMPT'), [
    { id: 'en', title: S(session, 'LANG_EN_BTN') },
    { id: 'ur', title: S(session, 'LANG_UR_BTN') }
  ]);
}

async function sendPumpList(phone, session) {
  const ur  = session.lang === 'ur';
  const btn = ur ? 'منتخب کریں' : 'Select Pump';
  const sec = ur ? 'فیول پمپس' : 'Fuel Pumps';
  await sendListMessage(phone, S(session, 'PUMP_PROMPT'), btn, PUMPS, sec);
}

async function sendComplaintTypeList(phone, session) {
  const ur    = session.lang === 'ur';
  const types = getComplaintTypesForList(session.lang);
  const btn   = ur ? 'منتخب کریں' : 'Select Type';
  const sec   = ur ? 'شکایت کی نوعیت' : 'Complaint Types';
  await sendListMessage(phone, S(session, 'COMPLAINT_TYPE_PROMPT'), btn, types, sec);
}

async function sendEditSelectList(phone, session) {
  const ur     = session.lang === 'ur';
  const fields = getEditFieldsForList(session.lang);
  const btn    = ur ? 'منتخب کریں' : 'Select Field';
  const sec    = ur ? 'تبدیلی کے اختیارات' : 'Edit Options';
  await sendListMessage(phone, S(session, 'EDIT_PROMPT'), btn, fields, sec);
}

async function sendReview(phone, session) {
  const summary = buildReviewSummary(session);
  await sendButtonMessage(phone, summary, [
    { id: 'submit', title: S(session, 'SUBMIT_BTN') },
    { id: 'edit',   title: S(session, 'EDIT_BTN') }
  ]);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function resolveListOrButton(input, items) {
  if (input.type === 'list' || input.type === 'button') {
    return items.find(i => i.id === input.value) ? input.value : null;
  }
  if (input.type === 'text') {
    const text  = input.value.toLowerCase().trim();
    const match = items.find(i =>
      i.id.toLowerCase() === text || i.title.toLowerCase() === text
    );
    return match ? match.id : null;
  }
  return null;
}

function isSkip(input) {
  if (input.type === 'button' && input.value === 'skip') return true;
  if (input.type === 'text') {
    const t = input.value.toLowerCase().trim();
    return ['skip', 'no', 'nahi', 'nhi', 'na', 'aage'].includes(t);
  }
  return false;
}

/**
 * Reverse geocode lat/lng using OpenStreetMap Nominatim
 * @param {string} lang - 'en' or 'ur'; controls the language of returned city/area names
 * Returns { province, city, area }
 *   - province is always normalised to the API enum (English key)
 *   - city/area are in the requested language
 */
async function reverseGeocode(lat, lon, lang = 'en') {
  try {
    const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format:          'json',
        'accept-language': lang === 'ur' ? 'ur' : 'en'
      },
      headers: { 'User-Agent': 'FuelComplaintBot/1.0 (Pakistan)' },
      timeout: 5000
    });

    const a = resp.data?.address || {};

    return {
      // Province is normalised to English API enum regardless of display language
      province: normalizeProvince(a.state || a.state_district || null),
      city:     a.city || a.town || a.village || a.county || null,
      area:     a.suburb || a.neighbourhood || a.quarter || a.road || null
    };
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    return { province: null, city: null, area: null };
  }
}

module.exports = { handleMessage };
