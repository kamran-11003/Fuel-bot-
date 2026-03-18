'use strict';

/**
 * Conversation FSM (Finite State Machine) for the Fuel Complaint Bot.
 *
 * Flow:
 *   LANGUAGE_SELECTION → GREETING → CNIC_INPUT → PROVINCE_SELECTION
 *   → COMPLAINT_TYPE → DETAILS_INPUT → PUMP_NAME → LOCATION_INPUT
 *   → LANDMARK_INPUT → IMAGE_UPLOAD → REVIEW ⇄ EDIT_SELECT → CONFIRMATION
 *
 * All display text comes from i18n.js — never hardcoded here.
 * All state is stored in Redis via session.js.
 */

const { STATES, getSession, updateSession, resetSession } = require('./session');
const {
  getMessage,
  PROVINCES, PUMPS, COMPLAINT_TYPES, EDIT_FIELDS,
  buildReviewSummary, buildConfirmationMessage
} = require('./i18n');
const {
  sendTextMessage, sendButtonMessage, sendListMessage,
  downloadMedia, getUserInput, isStartTrigger
} = require('./whatsapp');
const {
  getCooldown, setCooldown,
  saveComplaintRecord, pushToQueue
} = require('./redis');

// ── Validators ────────────────────────────────────────────────────────────────

function isValidCnic(str)    { return /^\d{13}$/.test(str); }
function cleanCnic(str)      { return (str || '').replace(/\D/g, ''); }
function isValidDetails(str) { return str && str.trim().length >= 20; }

function generateComplaintCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FC-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── i18n shorthand ────────────────────────────────────────────────────────────

function M(session, key) {
  return getMessage(session.language || 'EN', key);
}

// ── Main entry point ──────────────────────────────────────────────────────────

async function handleMessage(phoneNumber, message) {
  try {
    let session = await getSession(phoneNumber);
    const input  = getUserInput(message);

    // Global restart (except when already at LANGUAGE_SELECTION)
    if (session.state !== STATES.LANGUAGE_SELECTION &&
        input.type === 'text' && isStartTrigger(input.value)) {
      session = await resetSession(phoneNumber);
      await sendTextMessage(phoneNumber, M(session, 'RESTART_MSG'));
      await sendLanguageSelection(phoneNumber);
      return;
    }

    switch (session.state) {
      case STATES.LANGUAGE_SELECTION: await handleLanguageSelection(phoneNumber, session, input); break;
      case STATES.GREETING:           await handleGreeting(phoneNumber, session, input);           break;
      case STATES.CNIC_INPUT:         await handleCnicInput(phoneNumber, session, input);          break;
      case STATES.PROVINCE_SELECTION: await handleProvinceSelection(phoneNumber, session, input);  break;
      case STATES.COMPLAINT_TYPE:     await handleComplaintType(phoneNumber, session, input);      break;
      case STATES.DETAILS_INPUT:      await handleDetailsInput(phoneNumber, session, input);       break;
      case STATES.PUMP_NAME:          await handlePumpName(phoneNumber, session, input);           break;
      case STATES.LOCATION_INPUT:     await handleLocationInput(phoneNumber, session, input);      break;
      case STATES.LANDMARK_INPUT:     await handleLandmarkInput(phoneNumber, session, input);      break;
      case STATES.IMAGE_UPLOAD:       await handleImageUpload(phoneNumber, session, input);        break;
      case STATES.REVIEW:             await handleReview(phoneNumber, session, input);             break;
      case STATES.EDIT_SELECT:        await handleEditSelect(phoneNumber, session, input);         break;
      case STATES.CONFIRMATION:       await handleConfirmation(phoneNumber, session, input);       break;
      default:
        session = await resetSession(phoneNumber);
        await sendLanguageSelection(phoneNumber);
    }
  } catch (err) {
    console.error('[handler] Error:', err);
    try {
      const s = await getSession(phoneNumber);
      await sendTextMessage(phoneNumber, M(s, 'ERROR_GENERIC'));
    } catch (_) { /* ignore */ }
  }
}

// ── State handlers ────────────────────────────────────────────────────────────

async function handleLanguageSelection(phoneNumber, session, input) {
  let lang = null;
  if (input.type === 'button') {
    if (input.value === 'lang_en') lang = 'EN';
    if (input.value === 'lang_ur') lang = 'UR';
  } else if (input.type === 'text') {
    const v = (input.value || '').toLowerCase().trim();
    if (['1', 'en', 'english'].includes(v))            lang = 'EN';
    if (['2', 'ur', 'urdu', 'اردو'].includes(v))       lang = 'UR';
  }
  if (!lang) { await sendLanguageSelection(phoneNumber); return; }

  session = await updateSession(phoneNumber, { language: lang, state: STATES.GREETING });
  await sendGreeting(phoneNumber, session);
}

async function handleGreeting(phoneNumber, session, input) {
  const yes = (input.type === 'button' && input.value === 'start') ||
              (input.type === 'text' &&
               ['yes','haan','han','ji','ok','okay','1'].includes((input.value||'').toLowerCase().trim()));
  if (yes) {
    session = await updateSession(phoneNumber, { state: STATES.CNIC_INPUT });
    await sendTextMessage(phoneNumber, M(session, 'ASK_CNIC'));
    return;
  }
  await sendGreeting(phoneNumber, session);
}

async function handleCnicInput(phoneNumber, session, input) {
  if (input.type !== 'text') { await sendTextMessage(phoneNumber, M(session, 'ASK_CNIC')); return; }

  const cnic = cleanCnic(input.value);
  if (!isValidCnic(cnic)) { await sendTextMessage(phoneNumber, M(session, 'INVALID_CNIC')); return; }

  if (await getCooldown(cnic)) {
    await sendTextMessage(phoneNumber, M(session, 'DUPLICATE_WARNING'));
    return;
  }

  session = await updateSession(phoneNumber, { cnic, state: STATES.PROVINCE_SELECTION });
  await sendProvinceList(phoneNumber, session);
}

async function handleProvinceSelection(phoneNumber, session, input) {
  const id = pickOption(input, PROVINCES[session.language || 'EN']);
  if (!id) { await sendProvinceList(phoneNumber, session); return; }

  const nextState = session.editing ? STATES.REVIEW : STATES.COMPLAINT_TYPE;
  session = await updateSession(phoneNumber, { province: id, state: nextState, editing: false });
  if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
  else await sendComplaintTypeList(phoneNumber, session);
}

async function handlePumpName(phoneNumber, session, input) {
  const id = pickOption(input, PUMPS[session.language || 'EN']);
  if (!id) { await sendPumpList(phoneNumber, session); return; }

  const nextState = session.editing ? STATES.REVIEW : STATES.LOCATION_INPUT;
  session = await updateSession(phoneNumber, { pumpName: id, state: nextState, editing: false });
  if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
  else await sendTextMessage(phoneNumber, M(session, 'ASK_LOCATION'));
}

async function handleComplaintType(phoneNumber, session, input) {
  const id = pickOption(input, COMPLAINT_TYPES[session.language || 'EN']);
  if (!id) { await sendComplaintTypeList(phoneNumber, session); return; }

  const nextState = session.editing ? STATES.REVIEW : STATES.DETAILS_INPUT;
  session = await updateSession(phoneNumber, { complaintType: id, state: nextState, editing: false });
  if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
  else await sendDetailsPrompt(phoneNumber, session);
}

async function handleLocationInput(phoneNumber, session, input) {
  if (input.type === 'location') {
    const { latitude, longitude } = input.value;
    if (latitude && longitude) {
      const nextState = session.editing ? STATES.REVIEW : STATES.LANDMARK_INPUT;
      session = await updateSession(phoneNumber, {
        latitude, longitude,
        state: nextState,
        editing: false
      });
      await sendTextMessage(phoneNumber, M(session, 'LOCATION_RECEIVED'));
      if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
      else await sendLandmarkPrompt(phoneNumber, session);
      return;
    }
  }
  await sendTextMessage(phoneNumber, M(session, 'INVALID_LOCATION'));
}

async function handleLandmarkInput(phoneNumber, session, input) {
  if (input.type === 'text' && (input.value || '').trim().length >= 3) {
    const nextState = session.editing ? STATES.REVIEW : STATES.IMAGE_UPLOAD;
    session = await updateSession(phoneNumber, {
      landmark: input.value.trim(),
      state: nextState,
      editing: false
    });
    await sendTextMessage(phoneNumber, M(session, 'LANDMARK_RECEIVED'));
    if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
    else await sendImageUpload(phoneNumber, session);
    return;
  }
  await sendTextMessage(phoneNumber, M(session, 'INVALID_LANDMARK'));
}

async function handleImageUpload(phoneNumber, session, input) {
  const isSkip = (input.type === 'button' && input.value === 'skip_image') ||
                 (input.type === 'text' && ['skip','no','0'].includes((input.value||'').toLowerCase().trim()));
  if (isSkip) {
    session = await updateSession(phoneNumber, { imageMediaId: null, state: STATES.REVIEW });
    await sendReview(phoneNumber, session);
    return;
  }
  if (input.type === 'image') {
    const mediaId = input.value?.id;
    if (mediaId) {
      session = await updateSession(phoneNumber, { imageMediaId: mediaId, state: STATES.REVIEW });
      await sendTextMessage(phoneNumber, M(session, 'IMAGE_RECEIVED'));
      await sendReview(phoneNumber, session);
      return;
    }
  }
  await sendImageUpload(phoneNumber, session);
}

async function handleDetailsInput(phoneNumber, session, input) {
  if (input.type === 'text') {
    const details = (input.value || '').trim();
    if (isValidDetails(details)) {
      const nextState = session.editing ? STATES.REVIEW : STATES.PUMP_NAME;
      session = await updateSession(phoneNumber, { details, state: nextState, editing: false });
      if (nextState === STATES.REVIEW) await sendReview(phoneNumber, session);
      else await sendPumpList(phoneNumber, session);
    } else {
      await sendTextMessage(phoneNumber, M(session, 'DETAILS_TOO_SHORT'));
    }
    return;
  }
  await sendDetailsPrompt(phoneNumber, session);
}

async function handleReview(phoneNumber, session, input) {
  if (input.type === 'button') {
    if (input.value === 'submit') { await submitComplaintAndConfirm(phoneNumber, session); return; }
    if (input.value === 'edit')   {
      session = await updateSession(phoneNumber, { state: STATES.EDIT_SELECT });
      await sendEditSelect(phoneNumber, session);
      return;
    }
  }
  await sendReview(phoneNumber, session);
}

async function handleEditSelect(phoneNumber, session, input) {
  let fieldId = (input.type === 'list' || input.type === 'button') ? input.value : null;
  if (!fieldId) { await sendEditSelect(phoneNumber, session); return; }

  switch (fieldId) {
    case 'province':
      session = await updateSession(phoneNumber, { state: STATES.PROVINCE_SELECTION, editing: true });
      await sendProvinceList(phoneNumber, session);
      break;
    case 'complaintType':
      session = await updateSession(phoneNumber, { state: STATES.COMPLAINT_TYPE, editing: true });
      await sendComplaintTypeList(phoneNumber, session);
      break;
    case 'details':
      session = await updateSession(phoneNumber, { state: STATES.DETAILS_INPUT, editing: true });
      await sendDetailsPrompt(phoneNumber, session);
      break;
    case 'pumpName':
      session = await updateSession(phoneNumber, { state: STATES.PUMP_NAME, editing: true });
      await sendPumpList(phoneNumber, session);
      break;
    case 'location':
      session = await updateSession(phoneNumber, { state: STATES.LOCATION_INPUT, editing: true });
      await sendTextMessage(phoneNumber, M(session, 'ASK_LOCATION'));
      break;
    case 'landmark':
      session = await updateSession(phoneNumber, { state: STATES.LANDMARK_INPUT, editing: true });
      await sendLandmarkPrompt(phoneNumber, session);
      break;
    case 'image':
      session = await updateSession(phoneNumber, { state: STATES.IMAGE_UPLOAD, editing: true });
      await sendImageUpload(phoneNumber, session);
      break;
    default:
      await sendEditSelect(phoneNumber, session);
  }
}

async function handleConfirmation(phoneNumber, session, input) {
  const isNew = (input.type === 'button' && input.value === 'new_complaint') ||
                (input.type === 'text'   && isStartTrigger(input.value));
  if (isNew) {
    session = await resetSession(phoneNumber);
    await sendLanguageSelection(phoneNumber);
    return;
  }
  await sendButtonMessage(phoneNumber, M(session, 'CONFIRMATION_FOOTER'),
    [{ id: 'new_complaint', title: M(session, 'NEW_COMPLAINT_BTN').slice(0, 20) }]);
}

// ── Submission ────────────────────────────────────────────────────────────────

async function submitComplaintAndConfirm(phoneNumber, session) {
  // Download image buffer now (WhatsApp media tokens expire in ~5 min)
  let imageBase64 = null;
  if (session.imageMediaId) {
    try {
      const { buffer } = await downloadMedia(session.imageMediaId);
      imageBase64 = buffer.toString('base64');
    } catch (imgErr) {
      console.warn('[handler] Image download failed — submitting without image:', imgErr.message);
    }
  }

  const complaintCode = generateComplaintCode();
  const draft = {
    sessionToken:  session.sessionToken,
    phoneNumber,
    language:      session.language,
    cnic:          session.cnic,
    province:      session.province,
    complaintType: session.complaintType,
    details:       session.details,
    pumpName:      session.pumpName,
    latitude:      session.latitude      || null,
    longitude:     session.longitude     || null,
    landmark:      session.landmark      || null,
    imageBase64,
    complaintCode,
    submittedAt:   new Date().toISOString(),
    status:        'pending',
    _retryCount:   0
  };

  // Persist complaint record (30 days, for status notifications)
  await saveComplaintRecord(complaintCode, draft);

  // Push to dispatch queue
  await pushToQueue(draft);

  // CNIC 24-hour cooldown
  await setCooldown(session.cnic);

  // Advance session state
  session = await updateSession(phoneNumber, { state: STATES.CONFIRMATION });

  // Send confirmation
  const confirmBody = buildConfirmationMessage(session, complaintCode);
  await sendButtonMessage(phoneNumber, confirmBody,
    [{ id: 'new_complaint', title: M(session, 'NEW_COMPLAINT_BTN').slice(0, 20) }]);
}

// ── Message senders ───────────────────────────────────────────────────────────

async function sendLanguageSelection(phoneNumber) {
  await sendButtonMessage(phoneNumber,
    getMessage('EN', 'LANGUAGE_SELECT'),
    [{ id: 'lang_en', title: 'English' }, { id: 'lang_ur', title: 'اردو' }]);
}

async function sendGreeting(phoneNumber, session) {
  await sendButtonMessage(phoneNumber, M(session, 'GREETING'),
    [{ id: 'start', title: M(session, 'START_BTN').slice(0, 20) }]);
}

async function sendProvinceList(phoneNumber, session) {
  const lang = session.language || 'EN';
  await sendListMessage(phoneNumber,
    M(session, 'ASK_PROVINCE'),
    M(session, 'SELECT_PROVINCE_BTN'),
    PROVINCES[lang],
    M(session, 'PROVINCES_SECTION'));
}

async function sendPumpList(phoneNumber, session) {
  const lang = session.language || 'EN';
  await sendListMessage(phoneNumber,
    M(session, 'ASK_PUMP'),
    M(session, 'SELECT_PUMP_BTN'),
    PUMPS[lang],
    M(session, 'PUMPS_SECTION'));
}

async function sendComplaintTypeList(phoneNumber, session) {
  const lang = session.language || 'EN';
  await sendListMessage(phoneNumber,
    M(session, 'ASK_COMPLAINT_TYPE'),
    M(session, 'SELECT_TYPE_BTN'),
    COMPLAINT_TYPES[lang],
    M(session, 'TYPES_SECTION'));
}

async function sendImageUpload(phoneNumber, session) {
  await sendButtonMessage(phoneNumber, M(session, 'ASK_IMAGE'),
    [{ id: 'skip_image', title: M(session, 'SKIP_BTN').slice(0, 20) }]);
}

async function sendLandmarkPrompt(phoneNumber, session) {
  await sendTextMessage(phoneNumber, M(session, 'ASK_LANDMARK'));
}

async function sendDetailsPrompt(phoneNumber, session) {
  await sendTextMessage(phoneNumber, M(session, 'ASK_DETAILS_REQUIRED'));
}

async function sendReview(phoneNumber, session) {
  const summary = buildReviewSummary(session);
  await sendButtonMessage(phoneNumber, summary, [
    { id: 'submit', title: M(session, 'SUBMIT_BTN').slice(0, 20) },
    { id: 'edit',   title: M(session, 'EDIT_BTN').slice(0, 20) }
  ]);
}

async function sendEditSelect(phoneNumber, session) {
  const lang = session.language || 'EN';
  await sendListMessage(phoneNumber,
    M(session, 'ASK_EDIT_FIELD'),
    M(session, 'SELECT_FIELD_BTN'),
    EDIT_FIELDS[lang],
    M(session, 'FIELDS_SECTION'));
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Extract an option ID from a list/button reply or matching text input.
 * Performs a case-insensitive match against option IDs and titles.
 */
function pickOption(input, options) {
  if (input.type === 'list' || input.type === 'button') {
    const val = input.value || '';
    // Exact match (IDs are uppercase)
    if (options.find(o => o.id === val))             return val;
    // Case-insensitive match
    const up = val.toUpperCase();
    const m  = options.find(o => o.id.toUpperCase() === up);
    return m ? m.id : null;
  }
  if (input.type === 'text') {
    const t = (input.value || '').toLowerCase().trim();
    const m = options.find(o => o.id.toLowerCase() === t || o.title.toLowerCase() === t);
    return m ? m.id : null;
  }
  return null;
}

module.exports = { handleMessage };
