'use strict';

/**
 * Redis client and key-namespaced helpers
 * All session, cooldown, draft, complaint record, and queue operations go here.
 *
 * Key namespaces:
 *   session:{phone}       TTL 30 min
 *   cooldown:{cnic}       TTL 24 hrs
 *   draft:{token}         TTL 1 hr
 *   complaint:{code}      TTL 30 days
 *   queue:complaints      List (LPUSH / RPOP)
 */

const Redis = require('ioredis');

const SESSION_TTL   = 1800;      // 30 minutes
const COOLDOWN_TTL  = 86400;     // 24 hours
const DRAFT_TTL     = 3600;      // 1 hour
const COMPLAINT_TTL = 2592000;   // 30 days

let client = null;

/**
 * Get (or lazily create) the shared ioredis client.
 * @returns {Redis}
 */
function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
    client.on('error',   (err) => console.error('[redis] Error:', err.message));
    client.on('connect', ()    => console.log('✅ Redis connected'));
  }
  return client;
}

// ── Session helpers ───────────────────────────────────────────────────────────

async function getSession(phone) {
  const raw = await getRedis().get(`session:${phone}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveSession(phone, session) {
  await getRedis().setex(`session:${phone}`, SESSION_TTL, JSON.stringify(session));
}

async function deleteSession(phone) {
  await getRedis().del(`session:${phone}`);
}

// ── CNIC cooldown helpers ─────────────────────────────────────────────────────

async function getCooldown(cnic) {
  const val = await getRedis().get(`cooldown:${cnic}`);
  return val !== null;
}

async function setCooldown(cnic) {
  await getRedis().setex(`cooldown:${cnic}`, COOLDOWN_TTL, '1');
}

// ── Complaint draft helpers ───────────────────────────────────────────────────

async function getDraft(token) {
  const raw = await getRedis().get(`draft:${token}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveDraft(token, draft) {
  await getRedis().setex(`draft:${token}`, DRAFT_TTL, JSON.stringify(draft));
}

async function deleteDraft(token) {
  await getRedis().del(`draft:${token}`);
}

// ── Complaint record helpers (long-lived, for status notifications) ───────────

async function saveComplaintRecord(code, data) {
  await getRedis().setex(`complaint:${code}`, COMPLAINT_TTL, JSON.stringify(data));
}

async function getComplaintRecord(code) {
  const raw = await getRedis().get(`complaint:${code}`);
  return raw ? JSON.parse(raw) : null;
}

async function updateComplaintRecord(code, updates) {
  const existing = await getComplaintRecord(code);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  const r = getRedis();
  const ttl = await r.ttl(`complaint:${code}`);
  await r.setex(`complaint:${code}`, ttl > 0 ? ttl : COMPLAINT_TTL, JSON.stringify(updated));
  return updated;
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

async function pushToQueue(complaint) {
  await getRedis().lpush('queue:complaints', JSON.stringify(complaint));
}

async function popFromQueue() {
  const raw = await getRedis().rpop('queue:complaints');
  return raw ? JSON.parse(raw) : null;
}

async function queueLength() {
  return getRedis().llen('queue:complaints');
}

module.exports = {
  getRedis,
  getSession,
  saveSession,
  deleteSession,
  getCooldown,
  setCooldown,
  getDraft,
  saveDraft,
  deleteDraft,
  saveComplaintRecord,
  getComplaintRecord,
  updateComplaintRecord,
  pushToQueue,
  popFromQueue,
  queueLength
};
