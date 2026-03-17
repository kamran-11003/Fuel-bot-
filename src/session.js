/**
 * Session management with Supabase persistence
 */

const { createClient } = require('@supabase/supabase-js');
const { getInitialSessionData, STATES } = require('./seed');

let supabase = null;

/**
 * Initialize Supabase client
 */
function initSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Get Supabase client instance
 * @returns {object}
 */
function getSupabase() {
  return initSupabase();
}

/**
 * Get or create session for a phone number
 * @param {string} phoneNumber 
 * @returns {Promise<object>}
 */
async function getSession(phoneNumber) {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('user_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching session:', error);
    throw error;
  }
  
  if (data) {
    return data;
  }
  
  // Create new session
  const newSession = {
    phone_number: phoneNumber,
    ...getInitialSessionData(),
    last_interaction_at: new Date().toISOString()
  };
  
  const { data: created, error: createError } = await db
    .from('user_sessions')
    .insert(newSession)
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating session:', createError);
    throw createError;
  }
  
  return created;
}

/**
 * Update session data
 * @param {string} phoneNumber 
 * @param {object} updates 
 * @returns {Promise<object>}
 */
async function updateSession(phoneNumber, updates) {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('user_sessions')
    .update({
      ...updates,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('phone_number', phoneNumber)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating session:', error);
    throw error;
  }
  
  return data;
}

/**
 * Reset session to initial state
 * @param {string} phoneNumber 
 * @returns {Promise<object>}
 */
async function resetSession(phoneNumber) {
  return updateSession(phoneNumber, getInitialSessionData());
}

/**
 * Update session state
 * @param {string} phoneNumber 
 * @param {string} state 
 * @returns {Promise<object>}
 */
async function setSessionState(phoneNumber, state) {
  return updateSession(phoneNumber, { state });
}

/**
 * Save complaint to database
 * @param {object} session 
 * @returns {Promise<object>}
 */
async function saveComplaint(session) {
  const db = getSupabase();
  
  const complaint = {
    phone_number: session.phone_number,
    cnic: session.cnic,
    region: session.region,
    complaint_type: session.complaint_type,
    details: session.details,
    latitude: session.latitude,
    longitude: session.longitude,
    location_text: session.location_text,
    image_url: session.image_url,
    status: 'pending'
  };
  
  const { data, error } = await db
    .from('complaints')
    .insert(complaint)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving complaint:', error);
    throw error;
  }
  
  // Update complaint with generated code
  const complaintCode = `FC-${String(data.id).padStart(5, '0')}`;
  
  const { data: updated, error: updateError } = await db
    .from('complaints')
    .update({ complaint_code: complaintCode })
    .eq('id', data.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error updating complaint code:', updateError);
    throw updateError;
  }
  
  return updated;
}

/**
 * Get last complaint by CNIC to check for duplicates
 * @param {string} cnic 
 * @returns {Promise<object|null>}
 */
async function getLastComplaintByCnic(cnic) {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('cnic', cnic)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching last complaint:', error);
    return null;
  }
  
  return data;
}

/**
 * Upload image to Supabase Storage
 * @param {Buffer} imageBuffer 
 * @param {string} fileName 
 * @param {string} mimeType 
 * @returns {Promise<string>} Public URL
 */
async function uploadImage(imageBuffer, fileName, mimeType) {
  const db = getSupabase();
  
  const filePath = `complaints/${Date.now()}-${fileName}`;
  
  const { data, error } = await db.storage
    .from('complaint-images')
    .upload(filePath, imageBuffer, {
      contentType: mimeType,
      upsert: false
    });
  
  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
  
  // Get public URL
  const { data: urlData } = db.storage
    .from('complaint-images')
    .getPublicUrl(filePath);
  
  return urlData.publicUrl;
}

/**
 * Get complaint by ID
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
async function getComplaintById(id) {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching complaint:', error);
    return null;
  }
  
  return data;
}

/**
 * Get all complaints for a phone number
 * @param {string} phoneNumber 
 * @returns {Promise<array>}
 */
async function getComplaintsByPhone(phoneNumber) {
  const db = getSupabase();
  
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('phone_number', phoneNumber)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching complaints:', error);
    return [];
  }
  
  return data || [];
}

module.exports = {
  initSupabase,
  getSupabase,
  getSession,
  updateSession,
  resetSession,
  setSessionState,
  saveComplaint,
  getLastComplaintByCnic,
  uploadImage,
  getComplaintById,
  getComplaintsByPhone
};
