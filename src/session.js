/**
 * In-memory session and complaint storage
 * No database required — sessions live in process memory
 */

const { STATES } = require('./seed');

// phone → session object
const sessions = new Map();

// Submitted complaints (in-memory)
const complaints = [];

function freshSession(phone) {
  return {
    phone,
    state: STATES.LANGUAGE,
    lang: 'en',
    cnic: null,
    province: null,
    city: null,
    area: null,
    latitude: null,
    longitude: null,
    pump: null,
    landmark: null,
    complaint_type: null,
    details: null,
    has_image: false,
    image_id: null,
    created_at: new Date().toISOString()
  };
}

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, freshSession(phone));
  }
  return sessions.get(phone);
}

function updateSession(phone, updates) {
  const session = getSession(phone);
  Object.assign(session, updates);
  return session;
}

function resetSession(phone) {
  const fresh = freshSession(phone);
  sessions.set(phone, fresh);
  return fresh;
}

function saveComplaint(session, code) {
  const complaint = {
    id: complaints.length + 1,
    complaint_code: code,
    phone: session.phone,
    cnic: session.cnic,
    province: session.province,
    city: session.city,
    area: session.area,
    latitude: session.latitude,
    longitude: session.longitude,
    pump: session.pump,
    landmark: session.landmark || null,
    complaint_type: session.complaint_type,
    details: session.details,
    has_image: session.has_image,
    image_id: session.image_id || null,
    status: 'pending',
    submitted_at: new Date().toISOString()
  };
  complaints.push(complaint);
  return complaint;
}

function getComplaints() {
  return [...complaints].reverse();
}

module.exports = { getSession, updateSession, resetSession, saveComplaint, getComplaints };
