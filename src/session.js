'use strict';

/**
 * Session management — Redis-backed, stateless.
 *
 * Session TTL: 30 minutes per interaction (reset on every write).
 * No database. No sticky sessions. All state lives in Redis.
 */

const { v4: uuidv4 } = require('uuid');
const { getSession: redisGet, saveSession } = require('./redis');

// ── FSM state enum ────────────────────────────────────────────────────────────
const STATES = {
  LANGUAGE_SELECTION: 'LANGUAGE_SELECTION',
  GREETING:           'GREETING',
  CNIC_INPUT:         'CNIC_INPUT',
  PROVINCE_SELECTION: 'PROVINCE_SELECTION',
  PUMP_NAME:          'PUMP_NAME',
  COMPLAINT_TYPE:     'COMPLAINT_TYPE',
  DETAILS_INPUT:      'DETAILS_INPUT',
  LOCATION_INPUT:     'LOCATION_INPUT',
  LANDMARK_INPUT:     'LANDMARK_INPUT',
  IMAGE_UPLOAD:       'IMAGE_UPLOAD',
  REVIEW:             'REVIEW',
  EDIT_SELECT:        'EDIT_SELECT',
  CONFIRMATION:       'CONFIRMATION'
};

// ── Fresh session factory ─────────────────────────────────────────────────────

function createFreshSession() {
  return {
    sessionToken:      uuidv4(),
    language:          null,
    state:             STATES.LANGUAGE_SELECTION,
    cnic:              null,
    province:          null,
    pumpName:          null,
    complaintType:     null,
    details:           null,
    latitude:          null,
    longitude:         null,
    landmark:          null,
    imageMediaId:      null,
    editing:           false,
    lastInteractionAt: new Date().toISOString()
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

async function getSession(phoneNumber) {
  let session = await redisGet(phoneNumber);
  if (!session) {
    session = createFreshSession();
    await saveSession(phoneNumber, session);
  }
  return session;
}

async function updateSession(phoneNumber, updates) {
  const existing = (await redisGet(phoneNumber)) || createFreshSession();
  const updated = { ...existing, ...updates, lastInteractionAt: new Date().toISOString() };
  await saveSession(phoneNumber, updated);
  return updated;
}

async function resetSession(phoneNumber) {
  const fresh = createFreshSession();
  await saveSession(phoneNumber, fresh);
  return fresh;
}

module.exports = { STATES, getSession, updateSession, resetSession };
