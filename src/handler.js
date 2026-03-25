/**
 * State machine — routes every incoming WhatsApp message through the complaint flow
 *
 * Flow:
 *   LANGUAGE → MAIN_MENU → (New Complaint | Check Status)
 *
 *   New Complaint:
 *     CNIC_INPUT → LOCATION_INPUT → PUMP_SELECTION
 *     → LANDMARK_INPUT → COMPLAINT_TYPE → DETAILS_INPUT
 *     → IMAGE_UPLOAD → REVIEW → CONFIRMATION
 *
 *   Check Status:
 *     STATUS_PHONE_INPUT → STATUS_CNIC_INPUT → (result) → MAIN_MENU
 */

const axios = require('axios');

const {
  STATES, PUMPS, isValidCnic, cleanCnic, isValidDetails,
  isValidPhone, cleanPhone, sanitizeText,
  generateComplaintCode, getComplaintTypesForList, getEditFieldsForList,
  normalizeProvince
} = require('./seed');

const { S, buildReviewSummary } = require('./strings');

const { getSession, updateSession, resetSession, saveComplaint } = require('./session');

const {
  sendTextMessage, sendButtonMessage, sendListMessage,
  getUserInput, isStartTrigger
} = require('./whatsapp');

const {
  getMediaUrl, downloadMedia, validateImage,
  saveTempFile, cleanupTempFile, buildFormData
} = require('./media');

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
      case STATES.LANGUAGE:            return await onLanguage(phoneNumber, session, input);
      case STATES.MAIN_MENU:           return await onMainMenu(phoneNumber, session, input);
      case STATES.CNIC_INPUT:          return await onCnic(phoneNumber, session, input);
      case STATES.LOCATION_INPUT:      return await onLocation(phoneNumber, session, input);
      case STATES.PUMP_SELECTION:      return await onPump(phoneNumber, session, input);
      case STATES.LANDMARK_INPUT:      return await onLandmark(phoneNumber, session, input);
      case STATES.COMPLAINT_TYPE:      return await onComplaintType(phoneNumber, session, input);
      case STATES.DETAILS_INPUT:       return await onDetails(phoneNumber, session, input);
      case STATES.IMAGE_UPLOAD:        return await onImage(phoneNumber, session, input);
      case STATES.REVIEW:              return await onReview(phoneNumber, session, input);
      case STATES.EDIT_SELECT:         return await onEditSelect(phoneNumber, session, input);
      case STATES.CONFIRMATION:        return await onConfirmation(phoneNumber, session, input);
      case STATES.STATUS_PHONE_INPUT:  return await onStatusPhone(phoneNumber, session, input);
      case STATES.STATUS_CNIC_INPUT:   return await onStatusCnic(phoneNumber, session, input);
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

  updateSession(phone, { lang, state: STATES.MAIN_MENU });
  await sendMainMenu(phone, { lang });
}

async function onMainMenu(phone, session, input) {
  if (input.type === 'button') {
    if (input.value === 'new_complaint') {
      updateSession(phone, { state: STATES.CNIC_INPUT });
      await sendTextMessage(phone, S(session, 'CNIC_PROMPT'));
      return;
    }
    if (input.value === 'check_status') {
      updateSession(phone, { state: STATES.STATUS_PHONE_INPUT });
      await sendTextMessage(phone, S(session, 'STATUS_PHONE_PROMPT'));
      return;
    }
  }
  await sendMainMenu(phone, session);
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
  await sendTextMessage(phone, S(session, 'LANDMARK_PROMPT'));
}

async function onLandmark(phone, session, input) {
  if (input.type === 'text' && input.value.trim().length > 0) {
    const landmark = sanitizeText(input.value.trim(), 255);
    updateSession(phone, { landmark, state: STATES.COMPLAINT_TYPE });
    await sendComplaintTypeList(phone, session);
    return;
  }

  // If user tries to skip or sends non-text, remind them it's required
  await sendTextMessage(phone, S(session, 'LANDMARK_REQUIRED'));
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

  const details = sanitizeText(input.value.trim(), 1000);
  updateSession(phone, { details, state: STATES.IMAGE_UPLOAD });
  await sendTextMessage(phone, S(session, 'IMAGE_PROMPT'));
}

async function onImage(phone, session, input) {
  if (input.type === 'image') {
    updateSession(phone, {
      has_image: true,
      image_id:  input.value.id,
      image_mime: input.value.mimeType || null,
      state:     STATES.REVIEW
    });
    await sendTextMessage(phone, S(session, 'IMAGE_RECEIVED'));
    await sendReview(phone, getSession(phone));
    return;
  }

  // Image is mandatory — no skip allowed
  await sendTextMessage(phone, S(session, 'IMAGE_REQUIRED'));
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
      await sendTextMessage(phone, S(session, 'LANDMARK_PROMPT'));
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
      await sendTextMessage(phone, S(session, 'IMAGE_PROMPT'));
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
// Status check handlers
// ---------------------------------------------------------------------------

async function onStatusPhone(phone, session, input) {
  if (input.type !== 'text') {
    await sendTextMessage(phone, S(session, 'STATUS_PHONE_PROMPT'));
    return;
  }

  const raw = cleanPhone(input.value);
  if (!isValidPhone(raw)) {
    await sendTextMessage(phone, S(session, 'STATUS_PHONE_INVALID'));
    return;
  }

  updateSession(phone, { status_phone: raw, state: STATES.STATUS_CNIC_INPUT });
  await sendTextMessage(phone, S(session, 'STATUS_CNIC_PROMPT'));
}

async function onStatusCnic(phone, session, input) {
  if (input.type !== 'text') {
    await sendTextMessage(phone, S(session, 'STATUS_CNIC_PROMPT'));
    return;
  }

  const cnic = cleanCnic(input.value);
  if (!isValidCnic(cnic)) {
    await sendTextMessage(phone, S(session, 'CNIC_INVALID'));
    return;
  }

  updateSession(phone, { status_cnic: cnic });

  const statusUrl = process.env.STATUS_API_URL;
  if (!statusUrl) {
    await sendTextMessage(phone, S(session, 'STATUS_ERROR'));
    updateSession(phone, { state: STATES.MAIN_MENU });
    await sendMainMenu(phone, session);
    return;
  }

  try {
    const resp = await axios.get(statusUrl, {
      params: { phoneNumber: session.status_phone, cnic },
      timeout: 8000
    });

    const data = resp.data;

    // Handle both single object and array response formats
    const complaint = data?.complaint || data?.complaints?.[0] || data;

    if (!complaint || (!complaint.status && !complaint.complaintCode && !complaint.id)) {
      await sendTextMessage(phone, S(session, 'STATUS_NOT_FOUND'));
    } else {
      await sendTextMessage(phone, S(session, 'STATUS_RESULT', complaint));
    }
  } catch (e) {
    console.error('Status API error:', e.message);
    if (e.response?.status === 404) {
      await sendTextMessage(phone, S(session, 'STATUS_NOT_FOUND'));
    } else {
      await sendTextMessage(phone, S(session, 'STATUS_ERROR'));
    }
  }

  updateSession(phone, { state: STATES.MAIN_MENU });
  await sendMainMenu(phone, session);
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
      images:      []
    }
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║        COMPLAINT SUBMITTED           ║');
  console.log('╚══════════════════════════════════════╝');

  // --- Secure image download + upload ---
  let tempFilePath = null;

  try {
    if (session.has_image && session.image_id) {
      console.log('📥 Downloading image from Meta API...');

      // Step 1: Get media download URL
      const media = await getMediaUrl(session.image_id);

      // Step 2: Download the image (SSRF-safe, size-limited)
      const { buffer, contentType } = await downloadMedia(media.url);
      const mime = media.mimeType || contentType;

      // Step 3: Validate image (MIME + magic bytes + content scan)
      validateImage(buffer, mime);

      // Step 4: Save to temp file
      tempFilePath = saveTempFile(buffer, mime);
      console.log(`✅ Image saved to temp: ${tempFilePath}`);

      // Step 5: Build FormData and POST as multipart
      const apiUrl = process.env.COMPLAINT_API_URL;
      let complaintCode = null;

      if (apiUrl) {
        try {
          const form = buildFormData(tempFilePath, mime, payload);
          const resp = await axios.post(apiUrl, form, {
            headers: form.getHeaders(),
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024
          });
          const data = resp.data || {};
          complaintCode = data.complaintId || data.complaint_code || data.id || data.code || null;
          console.log(`✅ API accepted complaint (multipart). ID: ${complaintCode}`);
        } catch (e) {
          console.warn('⚠️  API call failed, using local fallback ID:', e.message);
        }
      }

      if (!complaintCode) {
        complaintCode = generateComplaintCode();
        console.log(`ℹ️  Using local complaint code: ${complaintCode}`);
      }

      saveComplaint(session, complaintCode);
      updateSession(phone, { state: STATES.CONFIRMATION });
      await sendTextMessage(phone, S(session, 'CONFIRM_MSG', complaintCode));
      return;

    }
  } catch (imgErr) {
    console.error('Image processing error:', imgErr.message);
    // Ask user to re-send the image
    updateSession(phone, { has_image: false, image_id: null, image_mime: null, state: STATES.IMAGE_UPLOAD });
    await sendTextMessage(phone, S(session, 'IMAGE_DOWNLOAD_FAILED'));
    return;
  } finally {
    cleanupTempFile(tempFilePath);
  }

  // Fallback: no image (should not reach here since image is mandatory,
  // but kept for safety in case of edge cases)
  console.log(JSON.stringify(payload, null, 2));
  console.log('═══════════════════════════════════════\n');

  let complaintCode = null;
  const apiUrl = process.env.COMPLAINT_API_URL;

  if (apiUrl) {
    try {
      const resp = await axios.post(apiUrl, payload, { timeout: 8000 });
      const data = resp.data || {};
      complaintCode = data.complaintId || data.complaint_code || data.id || data.code || null;
      console.log(`✅ API accepted complaint. ID from backend: ${complaintCode}`);
    } catch (e) {
      console.warn('⚠️  API call failed, using local fallback ID:', e.message);
    }
  }

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

async function sendMainMenu(phone, session) {
  await sendButtonMessage(phone, S(session, 'MAIN_MENU_PROMPT'), [
    { id: 'new_complaint', title: S(session, 'NEW_COMPLAINT_BTN') },
    { id: 'check_status',  title: S(session, 'CHECK_STATUS_BTN') }
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
