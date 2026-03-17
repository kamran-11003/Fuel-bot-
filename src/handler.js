/**
 * State machine and conversation routing for Fuel Complaint Bot
 */

const { STRINGS, buildReviewSummary, buildConfirmationMessage } = require('./strings');
const {
  STATES,
  REGIONS,
  COMPLAINT_TYPES,
  EDIT_FIELDS,
  isValidCnic,
  cleanCnic,
  isValidDetails,
  canSubmitComplaint,
  getRegionTitle,
  getComplaintTypeTitle
} = require('./seed');
const {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  downloadMedia,
  getUserInput,
  isStartTrigger
} = require('./whatsapp');
const {
  getSession,
  updateSession,
  resetSession,
  saveComplaint,
  getLastComplaintByCnic,
  uploadImage
} = require('./session');

/**
 * Main handler - routes message to appropriate state handler
 * @param {string} phoneNumber - User's phone number
 * @param {object} message - WhatsApp message object
 * @returns {Promise<void>}
 */
async function handleMessage(phoneNumber, message) {
  try {
    // Get or create session
    let session = await getSession(phoneNumber);
    
    // Parse user input
    const input = getUserInput(message);
    
    // Check for restart trigger
    if (input.type === 'text' && isStartTrigger(input.value)) {
      session = await resetSession(phoneNumber);
      await handleGreeting(phoneNumber, session, input);
      return;
    }
    
    // Route based on current state
    switch (session.state) {
      case STATES.GREETING:
        await handleGreeting(phoneNumber, session, input);
        break;
        
      case STATES.CNIC_INPUT:
        await handleCnicInput(phoneNumber, session, input);
        break;
        
      case STATES.REGION_SELECTION:
        await handleRegionSelection(phoneNumber, session, input);
        break;
        
      case STATES.COMPLAINT_TYPE:
        await handleComplaintType(phoneNumber, session, input);
        break;
        
      case STATES.DETAILS_INPUT:
        await handleDetailsInput(phoneNumber, session, input);
        break;
        
      case STATES.LOCATION_INPUT:
        await handleLocationInput(phoneNumber, session, input);
        break;
        
      case STATES.IMAGE_UPLOAD:
        await handleImageUpload(phoneNumber, session, input);
        break;
        
      case STATES.REVIEW:
        await handleReview(phoneNumber, session, input);
        break;
        
      case STATES.EDIT_SELECT:
        await handleEditSelect(phoneNumber, session, input);
        break;
        
      case STATES.CONFIRMATION:
        await handleConfirmation(phoneNumber, session, input);
        break;
        
      default:
        // Unknown state - reset to greeting
        await resetSession(phoneNumber);
        await sendGreetingMessage(phoneNumber);
        break;
    }
  } catch (error) {
    console.error('Handler error:', error);
    await sendTextMessage(phoneNumber, STRINGS.ERROR_GENERIC);
  }
}

// ============ State Handlers ============

/**
 * Handle GREETING state
 */
async function handleGreeting(phoneNumber, session, input) {
  // If fresh session, send welcome message
  if (!input.value || (input.type === 'text' && isStartTrigger(input.value))) {
    await sendGreetingMessage(phoneNumber);
    return;
  }
  
  // Handle button response
  if (input.type === 'button') {
    if (input.value === 'yes') {
      // Move to CNIC input
      await updateSession(phoneNumber, { state: STATES.CNIC_INPUT });
      await sendTextMessage(phoneNumber, STRINGS.ASK_CNIC);
    } else if (input.value === 'no') {
      // Send goodbye
      await sendTextMessage(phoneNumber, STRINGS.GOODBYE);
      await resetSession(phoneNumber);
    }
    return;
  }
  
  // Handle text "yes" or "no"
  if (input.type === 'text') {
    const text = input.value.toLowerCase().trim();
    if (['yes', 'haan', 'han', 'ji', 'ok', 'okay'].includes(text)) {
      await updateSession(phoneNumber, { state: STATES.CNIC_INPUT });
      await sendTextMessage(phoneNumber, STRINGS.ASK_CNIC);
    } else if (['no', 'nahi', 'nhi', 'na'].includes(text)) {
      await sendTextMessage(phoneNumber, STRINGS.GOODBYE);
      await resetSession(phoneNumber);
    } else {
      // Re-send greeting
      await sendGreetingMessage(phoneNumber);
    }
  }
}

/**
 * Handle CNIC_INPUT state
 */
async function handleCnicInput(phoneNumber, session, input) {
  if (input.type !== 'text') {
    await sendTextMessage(phoneNumber, STRINGS.ASK_CNIC);
    return;
  }
  
  const cnic = cleanCnic(input.value);
  
  if (!isValidCnic(cnic)) {
    await sendTextMessage(phoneNumber, STRINGS.INVALID_CNIC);
    return;
  }
  
  // Check for duplicate complaints
  const lastComplaint = await getLastComplaintByCnic(cnic);
  if (lastComplaint && !canSubmitComplaint(lastComplaint.created_at)) {
    await sendTextMessage(phoneNumber, STRINGS.DUPLICATE_WARNING);
    return;
  }
  
  // Save CNIC and move to region selection
  await updateSession(phoneNumber, {
    cnic: cnic,
    state: STATES.REGION_SELECTION
  });
  
  await sendListMessage(
    phoneNumber,
    STRINGS.ASK_REGION,
    'Select Region',
    REGIONS,
    'Regions'
  );
}

/**
 * Handle REGION_SELECTION state
 */
async function handleRegionSelection(phoneNumber, session, input) {
  let regionId = null;
  
  if (input.type === 'list' || input.type === 'button') {
    regionId = input.value;
  } else if (input.type === 'text') {
    // Try to match text to region
    const text = input.value.toLowerCase().trim();
    const match = REGIONS.find(r => 
      r.id === text || r.title.toLowerCase() === text
    );
    if (match) regionId = match.id;
  }
  
  if (!regionId) {
    await sendListMessage(
      phoneNumber,
      STRINGS.ASK_REGION,
      'Select Region',
      REGIONS,
      'Regions'
    );
    return;
  }
  
  // Save region and move to complaint type
  await updateSession(phoneNumber, {
    region: getRegionTitle(regionId),
    state: STATES.COMPLAINT_TYPE
  });
  
  await sendListMessage(
    phoneNumber,
    STRINGS.ASK_COMPLAINT_TYPE,
    'Select Type',
    COMPLAINT_TYPES,
    'Complaint Types'
  );
}

/**
 * Handle COMPLAINT_TYPE state
 */
async function handleComplaintType(phoneNumber, session, input) {
  let typeId = null;
  
  if (input.type === 'list' || input.type === 'button') {
    typeId = input.value;
  } else if (input.type === 'text') {
    const text = input.value.toLowerCase().trim();
    const match = COMPLAINT_TYPES.find(t => 
      t.id === text || t.title.toLowerCase().includes(text)
    );
    if (match) typeId = match.id;
  }
  
  if (!typeId) {
    await sendListMessage(
      phoneNumber,
      STRINGS.ASK_COMPLAINT_TYPE,
      'Select Type',
      COMPLAINT_TYPES,
      'Complaint Types'
    );
    return;
  }
  
  // Save complaint type and move to details
  await updateSession(phoneNumber, {
    complaint_type: getComplaintTypeTitle(typeId),
    state: STATES.DETAILS_INPUT
  });
  
  await sendTextMessage(phoneNumber, STRINGS.ASK_DETAILS);
}

/**
 * Handle DETAILS_INPUT state
 */
async function handleDetailsInput(phoneNumber, session, input) {
  if (input.type !== 'text') {
    await sendTextMessage(phoneNumber, STRINGS.ASK_DETAILS);
    return;
  }
  
  const details = input.value.trim();
  
  if (!isValidDetails(details)) {
    await sendTextMessage(phoneNumber, STRINGS.DETAILS_TOO_SHORT);
    return;
  }
  
  // Save details and move to location
  await updateSession(phoneNumber, {
    details: details,
    state: STATES.LOCATION_INPUT
  });
  
  await sendTextMessage(phoneNumber, STRINGS.ASK_LOCATION);
}

/**
 * Handle LOCATION_INPUT state
 */
async function handleLocationInput(phoneNumber, session, input) {
  if (input.type === 'location') {
    // Got location coordinates
    const { latitude, longitude, name, address } = input.value;
    
    await updateSession(phoneNumber, {
      latitude: latitude,
      longitude: longitude,
      location_text: address || name || null,
      state: STATES.IMAGE_UPLOAD
    });
    
    await sendTextMessage(phoneNumber, STRINGS.LOCATION_RECEIVED);
    await sendImageUploadPrompt(phoneNumber);
    return;
  }
  
  if (input.type === 'text') {
    // Accept text address as fallback
    const address = input.value.trim();
    
    if (address.length < 10) {
      await sendTextMessage(phoneNumber, STRINGS.INVALID_LOCATION);
      return;
    }
    
    await updateSession(phoneNumber, {
      location_text: address,
      state: STATES.IMAGE_UPLOAD
    });
    
    await sendImageUploadPrompt(phoneNumber);
    return;
  }
  
  await sendTextMessage(phoneNumber, STRINGS.ASK_LOCATION);
}

/**
 * Handle IMAGE_UPLOAD state
 */
async function handleImageUpload(phoneNumber, session, input) {
  // Check for skip button
  if (input.type === 'button' && input.value === 'skip') {
    await updateSession(phoneNumber, { state: STATES.REVIEW });
    const updatedSession = await getSession(phoneNumber);
    await sendReviewMessage(phoneNumber, updatedSession);
    return;
  }
  
  // Check for skip text
  if (input.type === 'text') {
    const text = input.value.toLowerCase().trim();
    if (['skip', 'no', 'nahi', 'nhi'].includes(text)) {
      await updateSession(phoneNumber, { state: STATES.REVIEW });
      const updatedSession = await getSession(phoneNumber);
      await sendReviewMessage(phoneNumber, updatedSession);
      return;
    }
  }
  
  // Handle image upload
  if (input.type === 'image') {
    try {
      const { id, mimeType } = input.value;
      
      // Download image from WhatsApp
      const { buffer } = await downloadMedia(id);
      
      // Upload to Supabase storage
      const fileName = `${phoneNumber}-${Date.now()}.jpg`;
      const imageUrl = await uploadImage(buffer, fileName, mimeType);
      
      await updateSession(phoneNumber, {
        image_url: imageUrl,
        state: STATES.REVIEW
      });
      
      await sendTextMessage(phoneNumber, STRINGS.IMAGE_RECEIVED);
      const updatedSession = await getSession(phoneNumber);
      await sendReviewMessage(phoneNumber, updatedSession);
    } catch (error) {
      console.error('Image upload error:', error);
      await sendTextMessage(phoneNumber, STRINGS.ERROR_GENERIC);
      await sendImageUploadPrompt(phoneNumber);
    }
    return;
  }
  
  // Invalid input - re-prompt
  await sendImageUploadPrompt(phoneNumber);
}

/**
 * Handle REVIEW state
 */
async function handleReview(phoneNumber, session, input) {
  if (input.type === 'button') {
    if (input.value === 'submit') {
      // Save complaint
      try {
        const complaint = await saveComplaint(session);
        
        // Send confirmation
        await sendTextMessage(
          phoneNumber,
          buildConfirmationMessage(complaint.complaint_code)
        );
        
        // Reset session for next complaint
        await resetSession(phoneNumber);
        await updateSession(phoneNumber, { state: STATES.CONFIRMATION });
      } catch (error) {
        console.error('Error saving complaint:', error);
        await sendTextMessage(phoneNumber, STRINGS.ERROR_GENERIC);
      }
      return;
    }
    
    if (input.value === 'edit') {
      // Move to edit selection
      await updateSession(phoneNumber, { state: STATES.EDIT_SELECT });
      await sendEditSelectMessage(phoneNumber);
      return;
    }
  }
  
  // Re-send review
  await sendReviewMessage(phoneNumber, session);
}

/**
 * Handle EDIT_SELECT state
 */
async function handleEditSelect(phoneNumber, session, input) {
  let fieldId = null;
  
  if (input.type === 'list' || input.type === 'button') {
    fieldId = input.value;
  }
  
  if (!fieldId) {
    await sendEditSelectMessage(phoneNumber);
    return;
  }
  
  // Route to appropriate state for editing
  switch (fieldId) {
    case 'complaint_type':
      await updateSession(phoneNumber, { state: STATES.COMPLAINT_TYPE });
      await sendListMessage(
        phoneNumber,
        STRINGS.ASK_COMPLAINT_TYPE,
        'Select Type',
        COMPLAINT_TYPES,
        'Complaint Types'
      );
      break;
      
    case 'details':
      await updateSession(phoneNumber, { state: STATES.DETAILS_INPUT });
      await sendTextMessage(phoneNumber, STRINGS.ASK_DETAILS);
      break;
      
    case 'location':
      await updateSession(phoneNumber, { state: STATES.LOCATION_INPUT });
      await sendTextMessage(phoneNumber, STRINGS.ASK_LOCATION);
      break;
      
    case 'image':
      await updateSession(phoneNumber, { state: STATES.IMAGE_UPLOAD });
      await sendImageUploadPrompt(phoneNumber);
      break;
      
    default:
      await sendEditSelectMessage(phoneNumber);
  }
}

/**
 * Handle CONFIRMATION state (post-submission)
 */
async function handleConfirmation(phoneNumber, session, input) {
  // Accept text "start" variants OR the Start button reply
  const isRestart =
    (input.type === 'text' && isStartTrigger(input.value)) ||
    (input.type === 'button' && input.value === 'start');

  if (isRestart) {
    await resetSession(phoneNumber);
    await sendGreetingMessage(phoneNumber);
    return;
  }

  // Send restart prompt
  await sendButtonMessage(
    phoneNumber,
    STRINGS.RESTART_PROMPT,
    [{ id: 'start', title: STRINGS.START_BTN }]
  );
}

// ============ Message Helpers ============

/**
 * Send greeting message with buttons
 */
async function sendGreetingMessage(phoneNumber) {
  await sendButtonMessage(
    phoneNumber,
    STRINGS.WELCOME,
    [
      { id: 'yes', title: STRINGS.WELCOME_YES_BTN },
      { id: 'no', title: STRINGS.WELCOME_NO_BTN }
    ]
  );
}

/**
 * Send image upload prompt with skip button
 */
async function sendImageUploadPrompt(phoneNumber) {
  await sendButtonMessage(
    phoneNumber,
    STRINGS.ASK_IMAGE,
    [{ id: 'skip', title: STRINGS.SKIP_BTN }]
  );
}

/**
 * Send review summary with submit/edit buttons
 */
async function sendReviewMessage(phoneNumber, session) {
  const summary = buildReviewSummary(session);
  
  await sendButtonMessage(
    phoneNumber,
    summary,
    [
      { id: 'submit', title: STRINGS.SUBMIT_BTN },
      { id: 'edit', title: STRINGS.EDIT_BTN }
    ]
  );
}

/**
 * Send edit field selection
 */
async function sendEditSelectMessage(phoneNumber) {
  await sendListMessage(
    phoneNumber,
    STRINGS.ASK_EDIT_FIELD,
    'Select Field',
    EDIT_FIELDS,
    'Edit Options'
  );
}

module.exports = {
  handleMessage
};
