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

const { getSession, updateSession, resetSession, saveComplaint, findComplaintsByPhoneAndCnic } = require('./session');

const {
  sendTextMessage, sendButtonMessage, sendListMessage,
  getUserInput, isStartTrigger
} = require('./whatsapp');

const {
  getMediaUrl, downloadMedia, validateImage,
  saveTempFile, cleanupTempFile, buildFormData
} = require('./media');

// Browser-like headers required to bypass WAF in front of icta.nitb.gov.pk
const NITB_HEADERS = {
  'Accept':      'application/json',
  'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Origin':      'https://icta.nitb.gov.pk',
  'Referer':     'https://icta.nitb.gov.pk/'
};

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
      // Use the caller's own WhatsApp number — no need to ask for it
      updateSession(phone, { status_phone: phone, state: STATES.STATUS_CNIC_INPUT });
      await sendTextMessage(phone, S(session, 'STATUS_CNIC_PROMPT'));
      return;
    }
    if (input.value === 'change_language') {
      updateSession(phone, { state: STATES.LANGUAGE });
      await sendLanguagePrompt(phone, session);
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
  // After confirmation, move to main menu to allow new complaint or status check
  updateSession(phone, { state: STATES.MAIN_MENU });
  await sendMainMenu(phone, session);
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

  // Look up complaints locally (in-memory store)
  const matches = findComplaintsByPhoneAndCnic(session.status_phone, cnic);

  if (matches.length > 0) {
    const latest = matches[matches.length - 1];
    await sendTextMessage(phone, S(session, 'STATUS_RESULT', latest));
  } else {
    // If an external STATUS_API_URL is configured, try that as fallback
    const statusUrl = process.env.STATUS_API_URL;
    if (statusUrl) {
      try {
        console.log('\n🔍 STATUS API REQUEST');
        console.log(`   URL: ${statusUrl}`);
        console.log(`   Phone: ${session.status_phone}, CNIC: ${cnic}`);
        console.log(`   Timeout: 8000ms`);
        
        const startTime = Date.now();
        const resp = await axios.get(statusUrl, {
          params: { phone: session.status_phone, cnic },
          headers: { ...NITB_HEADERS, 'X-WhatsApp-Secret': process.env.NITB_WHATSAPP_SECRET },
          timeout: 8000,
          validateStatus: () => true // Don't throw on any status
        });
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ STATUS API RESPONSE (${duration}ms)`);
        console.log(`   Status: ${resp.status}`);
        console.log(`   Headers:`, JSON.stringify(resp.headers, null, 2).slice(0, 200));
        console.log(`   Body:`, JSON.stringify(resp.data, null, 2));
        
        if (resp.status >= 400) {
          console.log(`⚠️  Status API returned HTTP ${resp.status}`);
          await sendTextMessage(phone, S(session, 'STATUS_ERROR'));
        } else {
          const data = resp.data;
          // NITB returns { success, data: [...], pagination }
          const complaints = data?.data || [];
          const complaint = complaints[0] || data?.complaint || data?.complaints?.[0];
          if (complaint && (complaint.status || complaint.complaint_code || complaint.id)) {
            console.log('✅ Complaint found in response');
            await sendTextMessage(phone, S(session, 'STATUS_RESULT', complaint));
          } else if (data?.success && complaints.length === 0) {
            console.log('⚠️  No complaints found for this phone');
            await sendTextMessage(phone, S(session, 'STATUS_NOT_FOUND'));
          } else {
            console.log('⚠️  No complaint data found in response');
            await sendTextMessage(phone, S(session, 'STATUS_NOT_FOUND'));
          }
        }
      } catch (e) {
        console.error('\n❌ STATUS API ERROR');
        console.error(`   Code: ${e.code}`);
        console.error(`   Message: ${e.message}`);
        if (e.response) {
          console.error(`   Status: ${e.response.status}`);
          console.error(`   Headers:`, JSON.stringify(e.response.headers).slice(0, 200));
          console.error(`   Body:`, JSON.stringify(e.response.data, null, 2));
        }
        await sendTextMessage(phone, S(session, 'STATUS_ERROR'));
      }
    } else {
      console.warn('⚠️  STATUS_API_URL not configured');
      await sendTextMessage(phone, S(session, 'STATUS_NOT_FOUND'));
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

      // Step 5: Generate local code immediately, confirm user, then submit to NITB in background
      const complaintCode = generateComplaintCode();
      saveComplaint(session, complaintCode);
      updateSession(phone, { state: STATES.CONFIRMATION });
      await sendTextMessage(phone, S(session, 'CONFIRM_MSG'));
      console.log(`ℹ️  Local complaint code assigned: ${complaintCode}`);

      // Fire-and-forget: submit to NITB API without blocking the user
      const apiUrl = process.env.COMPLAINT_API_URL;
      if (apiUrl) {
        // Read image buffer before temp file gets cleaned up in finally block
        const imageBuffer = require('fs').readFileSync(tempFilePath);
        const imageMime   = mime;
        const sessionLang = session.lang; // capture language for background notification

        setImmediate(async () => {
          try {
            console.log('\n📤 COMPLAINT API REQUEST (Multipart/FormData) [background]');
            console.log(`   URL: ${apiUrl}`);
            console.log(`   Local Code: ${complaintCode}`);
            console.log(`   Image size: ${imageBuffer.length} bytes`);

            const { buildFormData: _buildFormData } = require('./media');
            const FormData = require('form-data');
            const form = new FormData();
            form.append('complaint[images][]', imageBuffer, { filename: 'evidence.jpg', contentType: imageMime });
            form.append('user[phoneNumber]', payload.user.phoneNumber);
            form.append('user[cnic]',        payload.user.cnic);
            form.append('location[lat]',             String(payload.location.lat));
            form.append('location[lng]',             String(payload.location.lng));
            if (payload.location.city)            form.append('location[city]',            payload.location.city);
            if (payload.location.province)        form.append('location[province]',        payload.location.province);
            if (payload.location.nearestLandmark) form.append('location[nearestLandmark]', payload.location.nearestLandmark);
            form.append('complaint[type]',        payload.complaint.type);
            form.append('complaint[pumpBrand]',   payload.complaint.pumpBrand);
            form.append('complaint[description]', payload.complaint.description);

            const startTime = Date.now();
            const resp = await axios.post(apiUrl, form, {
              headers: { ...form.getHeaders(), ...NITB_HEADERS, 'X-WhatsApp-Secret': process.env.NITB_WHATSAPP_SECRET },
              timeout: 60000,
              maxContentLength: 10 * 1024 * 1024,
              validateStatus: () => true
            });
            const duration = Date.now() - startTime;

            console.log(`\n✅ COMPLAINT API RESPONSE (${duration}ms)`);
            console.log(`   Status: ${resp.status}`);
            console.log(`   Body:`, JSON.stringify(resp.data, null, 2));

            // Notify user of NITB submission result
            const nitbData = resp.data || {};
            const nitbId   = nitbData.id || nitbData.complaint_code || nitbData.complaintId || nitbData.code || null;
            if ((resp.status === 200 || resp.status === 201) && nitbId) {
              await sendTextMessage(phone, S({ lang: sessionLang }, 'NITB_SUCCESS_MSG', nitbId));
            } else if (resp.status >= 400) {
              await sendTextMessage(phone, S({ lang: sessionLang }, 'NITB_FAIL_MSG'));
            }
          } catch (e) {
            console.error('\n❌ COMPLAINT API ERROR [background]');
            console.error(`   Code: ${e.code}`);
            console.error(`   Message: ${e.message}`);
            if (e.response) {
              console.error(`   Status: ${e.response.status}`);
              console.error(`   Body:`, JSON.stringify(e.response.data, null, 2).slice(0, 500));
            }
            await sendTextMessage(phone, S({ lang: sessionLang }, 'NITB_FAIL_MSG'));
          }
        });
      }

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
      console.log('\n📨 COMPLAINT API REQUEST (JSON/Fallback)');
      console.log(`   URL: ${apiUrl}`);
      console.log(`   Method: POST`);
      console.log(`   Timeout: 8000ms`);
      console.log(`   Payload:`, JSON.stringify(payload, null, 2).slice(0, 300) + '...');

      const startTime = Date.now();
      const resp = await axios.post(apiUrl, payload, {
        timeout: 8000,
        headers: { 'Content-Type': 'application/json', ...NITB_HEADERS, 'X-WhatsApp-Secret': process.env.NITB_WHATSAPP_SECRET },
        validateStatus: () => true
      });
      const duration = Date.now() - startTime;

      console.log(`\n✅ COMPLAINT API RESPONSE (${duration}ms)`);
      console.log(`   Status: ${resp.status}`);
      console.log(`   ContentType: ${resp.headers['content-type']}`);
      console.log(`   Body:`, JSON.stringify(resp.data, null, 2));

      const data = resp.data || {};
      complaintCode = data.complaintId || data.complaint_code || data.id || data.code || null;
      if (complaintCode) {
        console.log(`✅ API accepted complaint. ID from backend: ${complaintCode}`);
      } else {
        console.warn('⚠️  No complaint ID in response, will use local fallback');
      }
    } catch (e) {
      console.error('\n❌ COMPLAINT API ERROR (JSON/Fallback)');
      console.error(`   Code: ${e.code}`);
      console.error(`   Message: ${e.message}`);
      if (e.response) {
        console.error(`   Status: ${e.response.status}`);
        console.error(`   Headers:`, JSON.stringify(e.response.headers).slice(0, 300));
        console.error(`   Body:`, JSON.stringify(e.response.data, null, 2).slice(0, 500));
      }
      console.warn('⚠️  Using local fallback ID');
    }
  } else {
    console.warn('⚠️  COMPLAINT_API_URL not configured');
  }

  if (!complaintCode) {
    complaintCode = generateComplaintCode();
    console.log(`ℹ️  Using local complaint code: ${complaintCode}`);
  }

  saveComplaint(session, complaintCode);
  updateSession(phone, { state: STATES.CONFIRMATION });
  await sendTextMessage(phone, S(session, 'CONFIRM_MSG'));
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
    { id: 'new_complaint',   title: S(session, 'NEW_COMPLAINT_BTN') },
    { id: 'check_status',    title: S(session, 'CHECK_STATUS_BTN') }
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
