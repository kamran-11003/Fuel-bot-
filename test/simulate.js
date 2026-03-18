'use strict';

/**
 * FSM Conversation Simulator
 * 
 * Runs the full complaint flow without needing Redis, WhatsApp credentials,
 * or any external services. All outbound calls are intercepted and logged.
 * 
 * Usage:  node test/simulate.js
 *         node test/simulate.js --lang ur     (Urdu flow)
 *         node test/simulate.js --skip-image  (skip image step)
 */

// ── Argument parsing ──────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const LANG      = args.includes('--lang') ? args[args.indexOf('--lang') + 1].toUpperCase() : 'EN';
const SKIP_IMG  = args.includes('--skip-image');

// ── Minimal .env shim (no real credentials needed for simulation) ─────────────
process.env.WHATSAPP_PHONE_NUMBER_ID = 'SIM_PHONE_ID';
process.env.WHATSAPP_ACCESS_TOKEN    = 'SIM_TOKEN';
process.env.WEBHOOK_VERIFY_TOKEN     = 'SIM_VERIFY';
process.env.REDIS_URL                = 'redis://localhost:6379';
process.env.GOVT_API_URL             = 'https://sim.example.com/complaints';

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  magenta:'\x1b[35m',
  blue:   '\x1b[34m'
};

const log = {
  bot:    (msg) => console.log(`${C.green}${C.bold}🤖 BOT  │${C.reset} ${msg}`),
  user:   (msg) => console.log(`${C.cyan}${C.bold}👤 USER │${C.reset} ${C.cyan}${msg}${C.reset}`),
  state:  (s)   => console.log(`${C.yellow}${C.bold}   FSM  │ → ${s}${C.reset}`),
  pass:   (msg) => console.log(`${C.green}${C.bold}   ✅   │ ${msg}${C.reset}`),
  fail:   (msg) => console.log(`${C.red}${C.bold}   ❌   │ ${msg}${C.reset}`),
  sep:    ()    => console.log(`${C.dim}─────────────────────────────────────────${C.reset}`),
  head:   (msg) => console.log(`\n${C.magenta}${C.bold}══ ${msg} ══${C.reset}`)
};

// ── In-memory Redis mock ──────────────────────────────────────────────────────
const store = new Map();
const queued = [];

const redisMock = {
  get:    async (k)       => store.get(k) ?? null,
  setex:  async (k, _t, v) => { store.set(k, v); return 'OK'; },
  del:    async (k)       => { store.delete(k); return 1; },
  rpush:  async (k, v)   => { /* list not needed for sim */ },
  lpush:  async (k, v)   => {
    const parsed = JSON.parse(v);
    queued.push(parsed);
    return 1;
  },
  llen:   async (k)       => queued.length,
  ttl:    async (k)       => 2592000,
  rpop:   async (k)       => null,
  expire: async ()        => 1,
  on:     () => {}         // silence event handlers
};

// Patch ioredis before requiring anything that uses Redis
const Module = require('module');
const _origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'ioredis') {
    // Return a constructor that gives back our mock
    function FakeRedis() { return redisMock; }
    FakeRedis.prototype = redisMock;
    return FakeRedis;
  }
  return _origLoad.apply(this, arguments);
};

// ── WhatsApp API mock ─────────────────────────────────────────────────────────
// We intercept axios to capture all messages sent to WhatsApp
const sentMessages = [];

const axiosMock = {
  post: async (url, payload, config) => {
    // Capture the message
    const msg = extractMessage(payload);
    sentMessages.push(msg);

    // Print it as BOT output
    if (msg.type === 'text') {
      log.bot(msg.text.split('\n').join('\n        │ '));
    } else if (msg.type === 'button') {
      log.bot(msg.text.split('\n').join('\n        │ '));
      console.log(`        │ ${C.blue}Buttons: ${msg.buttons.map(b => `[${b.title}]`).join('  ')}${C.reset}`);
    } else if (msg.type === 'list') {
      log.bot(msg.text);
      console.log(`        │ ${C.blue}List: ${msg.items.map(i => i.title).join(' | ')}${C.reset}`);
    }
    return { data: { messages: [{ id: 'sim-msg-id' }] } };
  },
  get: async (url, config) => {
    // Simulate media download
    return { data: Buffer.from('fake-image-data') };
  }
};

function extractMessage(payload) {
  if (!payload) return { type: 'unknown' };
  if (payload.type === 'text') {
    return { type: 'text', text: payload.text?.body || '' };
  }
  if (payload.type === 'interactive') {
    const interactive = payload.interactive;
    if (interactive.type === 'button') {
      return {
        type: 'button',
        text: interactive.body?.text || '',
        buttons: interactive.action?.buttons?.map(b => ({ id: b.reply?.id, title: b.reply?.title })) || []
      };
    }
    if (interactive.type === 'list') {
      return {
        type: 'list',
        text: interactive.body?.text || '',
        items: interactive.action?.sections?.[0]?.rows || []
      };
    }
  }
  return { type: 'raw', payload };
}

// Patch axios
Module._load = function(request, parent, isMain) {
  if (request === 'ioredis') {
    function FakeRedis() { Object.assign(this, redisMock); }
    return FakeRedis;
  }
  if (request === 'axios') return axiosMock;
  return _origLoad.apply(this, arguments);
};

// ── Load the actual handler ───────────────────────────────────────────────────
const { handleMessage } = require('../src/handler');

// ── Test runner ───────────────────────────────────────────────────────────────
const PHONE = '923001234567';
let stepsPassed = 0;
let stepsFailed = 0;
let lastMessageCount = 0;

async function send(label, message) {
  log.sep();
  log.user(label);
  lastMessageCount = sentMessages.length;
  await handleMessage(PHONE, message);
}

function assertBotSent(description, checkFn) {
  const newMessages = sentMessages.slice(lastMessageCount);
  const allText = newMessages.map(m =>
    [m.text || '', ...(m.buttons || []).map(b => b.title || ''), ...(m.items || []).map(i => i.title || '')]
    .join(' ')
  ).join(' ');

  if (newMessages.length > 0 && checkFn(allText, newMessages)) {
    log.pass(description);
    stepsPassed++;
  } else {
    log.fail(`${description} — got: "${allText.slice(0, 120)}"`);
    stepsFailed++;
  }
}

// ── Simulate WhatsApp message shapes ─────────────────────────────────────────
const msg = {
  text:     (body)  => ({ type: 'text',  text: { body } }),
  button:   (id)    => ({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id, title: id } } }),
  list:     (id)    => ({ type: 'interactive', interactive: { type: 'list_reply',   list_reply:   { id, title: id } } }),
  location: (lat, lng) => ({ type: 'location', location: { latitude: lat, longitude: lng } }),
  image:    (id)    => ({ type: 'image', image: { id } })
};

// ── The full simulation ───────────────────────────────────────────────────────
(async () => {
  const langLabel = LANG === 'UR' ? 'Urdu' : 'English';
  log.head(`Fuel Complaint Bot — ${langLabel} Flow Simulation`);

  // ─── Step 1: Language Selection ───────────────────────────────────────────
  log.head('Step 1: Language Selection');
  await send('First message (hi)', msg.text('hi'));
  assertBotSent('Bot asks for language selection', (text) =>
    text.toLowerCase().includes('english') || text.includes('language') || text.includes('زبان'));

  log.state('LANGUAGE_SELECTION');
  await send(`Select ${langLabel}`, msg.button(LANG === 'UR' ? 'lang_ur' : 'lang_en'));
  assertBotSent('Bot sends greeting with Start button', (text) =>
    text.toLowerCase().includes('start') || text.includes('شروع') || text.includes('welcome') || text.includes('خوش آمدید'));

  // ─── Step 2: Greeting ─────────────────────────────────────────────────────
  log.head('Step 2: Greeting → CNIC');
  log.state('GREETING');
  await send('Tap Start', msg.button('start'));
  assertBotSent('Bot asks for CNIC', (text) =>
    text.includes('CNIC') || text.includes('13'));

  // ─── Step 3: CNIC — Invalid then Valid ───────────────────────────────────
  log.head('Step 3: CNIC Input');
  log.state('CNIC_INPUT');
  await send('Send invalid CNIC (too short)', msg.text('123'));
  assertBotSent('Bot rejects short CNIC', (text) =>
    text.toLowerCase().includes('invalid') || text.includes('غلط') || text.includes('13'));

  await send('Send valid CNIC', msg.text('3520212345679'));
  assertBotSent('Bot accepts CNIC, asks province', (text) =>
    text.toLowerCase().includes('province') || text.includes('صوبہ') || text.toLowerCase().includes('punjab'));

  // ─── Step 4: Province Selection ──────────────────────────────────────────
  log.head('Step 4: Province Selection');
  log.state('PROVINCE_SELECTION');
  await send('Select Punjab', msg.list('PUNJAB'));
  assertBotSent('Bot accepts province, asks complaint type', (text) =>
    text.toLowerCase().includes('complaint') || text.includes('شکایت'));

  // ─── Step 5: Complaint Type ───────────────────────────────────────────────
  log.head('Step 5: Complaint Type');
  log.state('COMPLAINT_TYPE');
  await send('Select Short Measurement', msg.list('SHORT_MEASUREMENT'));
  assertBotSent('Bot asks for details (min 20 chars)', (text) =>
    text.includes('20') || text.toLowerCase().includes('detail') || text.includes('تفصیل'));

  // ─── Step 6: Details — Too short then valid ───────────────────────────────
  log.head('Step 6: Complaint Details');
  log.state('DETAILS_INPUT');
  await send('Send details < 20 chars', msg.text('short text'));
  assertBotSent('Bot rejects short details', (text) =>
    text.includes('20') || text.toLowerCase().includes('short') || text.includes('مختصر'));

  const detailsText = 'Meter showed 1 litre but only 0.7 litres of fuel was dispensed.';
  await send(`Send valid details (${detailsText.length} chars)`, msg.text(detailsText));
  assertBotSent('Bot accepts details, shows pump list', (text) =>
    text.toLowerCase().includes('pump') || text.includes('PSO') || text.includes('پمپ'));

  // ─── Step 7: Pump Selection ───────────────────────────────────────────────
  log.head('Step 7: Pump Selection');
  log.state('PUMP_NAME');
  await send('Select PSO', msg.list('PSO'));
  assertBotSent('Bot asks for GPS location', (text) =>
    text.includes('GPS') || text.includes('📍') || text.toLowerCase().includes('location'));

  // ─── Step 8: Location — Text rejected, GPS accepted ──────────────────────
  log.head('Step 8: Location Input (GPS only)');
  log.state('LOCATION_INPUT');
  await send('Send text address (should be rejected)', msg.text('Near Islamabad Airport'));
  assertBotSent('Bot rejects text address', (text) =>
    text.toLowerCase().includes('gps') || text.includes('📎') || text.includes('invalid') || text.includes('غلط'));

  await send('Send GPS pin', msg.location(33.6844, 73.0479));
  assertBotSent('Bot accepts GPS, asks for landmark', (text) =>
    text.toLowerCase().includes('landmark') || text.includes('نشانی') || text.includes('near') || text.includes('🏫'));

  // ─── Step 9: Landmark ────────────────────────────────────────────────────
  log.head('Step 9: Nearest Landmark');
  log.state('LANDMARK_INPUT');
  await send('Send landmark too short', msg.text('ok'));
  assertBotSent('Bot rejects landmark < 3 chars', (text) =>
    text.toLowerCase().includes('landmark') || text.includes('نشانی') || text.includes('required') || text.includes('ضروری'));

  await send('Send valid landmark', msg.text('Near City Hospital, Blue Area Islamabad'));
  assertBotSent('Bot accepts landmark, asks for image', (text) =>
    text.toLowerCase().includes('image') || text.toLowerCase().includes('photo') || text.includes('تصویر') || text.includes('📸'));

  // ─── Step 10: Image ───────────────────────────────────────────────────────
  log.head('Step 10: Image Upload');
  log.state('IMAGE_UPLOAD');
  if (SKIP_IMG) {
    await send('Skip image', msg.button('skip_image'));
    assertBotSent('Bot accepts skip, shows review', (text) =>
      text.includes('Review') || text.includes('جائزہ') || text.includes('CNIC') || text.includes('Submit'));
  } else {
    await send('Send image', msg.image('sim-media-id-12345'));
    assertBotSent('Bot accepts image, shows review', (text) =>
      text.includes('Review') || text.includes('جائزہ') || text.includes('CNIC') || text.includes('Submit'));
  }

  // ─── Step 11a: Edit loop test ─────────────────────────────────────────────
  log.head('Step 11a: Edit → Change Landmark → Back to Review');
  log.state('REVIEW');
  await send('Tap Edit', msg.button('edit'));
  assertBotSent('Bot shows edit field list', (text) =>
    text.toLowerCase().includes('field') || text.includes('حصہ') || text.toLowerCase().includes('landmark') || text.includes('Province'));

  log.state('EDIT_SELECT');
  await send('Select Landmark to edit', msg.list('landmark'));
  assertBotSent('Bot re-asks landmark', (text) =>
    text.toLowerCase().includes('landmark') || text.includes('نشانی'));

  log.state('LANDMARK_INPUT');
  await send('Enter updated landmark', msg.text('Opposite Jinnah Park, G-7 Islamabad'));
  assertBotSent('Bot accepts new landmark, shows review again', (text) =>
    text.includes('Review') || text.includes('جائزہ') || text.includes('Submit') || text.includes('CNIC'));

  // ─── Step 11b: Submit ─────────────────────────────────────────────────────
  log.head('Step 11b: Submit Complaint');
  log.state('REVIEW');
  await send('Tap Submit', msg.button('submit'));
  assertBotSent('Bot confirms submission with code FC-', (text) =>
    text.includes('FC-') || text.toLowerCase().includes('submitted') || text.includes('جمع'));

  // ─── Step 12: Cooldown check ──────────────────────────────────────────────
  log.head('Step 12: 24-Hour Cooldown Check');
  // Reset session to simulate fresh start with same CNIC
  await send('Send "restart"', msg.text('restart'));
  await send('Select language again', msg.button(LANG === 'UR' ? 'lang_ur' : 'lang_en'));
  await send('Tap Start', msg.button('start'));
  await send('Re-enter same CNIC (cooldown active)', msg.text('3520212345679'));
  assertBotSent('Bot blocks same CNIC within 24h', (text) =>
    text.includes('24') || text.toLowerCase().includes('already') || text.includes('پہلے ہی'));

  // ─── Step 13: Check queue ─────────────────────────────────────────────────
  log.head('Step 13: Queue Verification');
  if (queued.length > 0) {
    const draft = queued[0];
    log.pass(`Complaint queued. Code: ${C.bold}${draft.complaintCode}${C.reset}`);
    console.log(`\n${C.dim}Complaint Draft:${C.reset}`);
    const display = {
      complaintCode: draft.complaintCode,
      cnic:          draft.cnic,
      province:      draft.province,
      complaintType: draft.complaintType,
      details:       draft.details,
      pumpName:      draft.pumpName,
      latitude:      draft.latitude,
      longitude:     draft.longitude,
      landmark:      draft.landmark,
      hasImage:      !!draft.imageBase64,
      status:        draft.status,
      submittedAt:   draft.submittedAt
    };
    Object.entries(display).forEach(([k, v]) =>
      console.log(`  ${C.dim}${k.padEnd(14)}:${C.reset} ${v}`));
    stepsPassed++;
  } else {
    log.fail('No complaint found in queue');
    stepsFailed++;
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  log.sep();
  log.head('Simulation Results');
  console.log(`  ${C.green}${C.bold}Passed: ${stepsPassed}${C.reset}`);
  if (stepsFailed > 0) {
    console.log(`  ${C.red}${C.bold}Failed: ${stepsFailed}${C.reset}`);
  } else {
    console.log(`  ${C.green}All assertions passed ✅${C.reset}`);
  }
  console.log('');

  process.exit(stepsFailed > 0 ? 1 : 0);
})();
