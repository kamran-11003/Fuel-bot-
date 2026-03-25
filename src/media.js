/**
 * Secure image download, validation, and upload helpers
 *
 * Flow:
 *   1. getMediaUrl(mediaId)       – fetch download URL from Meta Graph API
 *   2. downloadMedia(url)         – download bytes (SSRF-safe, size-limited)
 *   3. validateImage(buf, mime)   – MIME + magic-byte + content checks
 *   4. saveTempFile(buf, mime)    – write to OS temp dir with random name
 *   5. cleanupTempFile(filePath)  – delete temp file after use
 *   6. buildFormData(filePath, mimeType, payload) – create multipart body
 */

const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const crypto   = require('crypto');
const FormData = require('form-data');

const WA_API = 'https://graph.facebook.com/v18.0';

// ---------------------------------------------------------------------------
// Allowed MIME types and their magic-byte signatures
// ---------------------------------------------------------------------------
const ALLOWED_MIME = {
  'image/jpeg': { ext: '.jpg',  magic: [0xFF, 0xD8, 0xFF] },
  'image/png':  { ext: '.png',  magic: [0x89, 0x50, 0x4E, 0x47] }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Whitelisted Meta CDN domains for SSRF prevention
const ALLOWED_DOMAINS = [
  'lookaside.fbcdn.net',
  'scontent.whatsapp.net',
  'media.fna.whatsapp.net',
  'media.fba.whatsapp.net',
  'mmg.whatsapp.net'
];

// ---------------------------------------------------------------------------
// 1. Fetch the download URL from Meta Graph API
// ---------------------------------------------------------------------------

async function getMediaUrl(mediaId) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const resp  = await axios.get(`${WA_API}/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000
  });
  return {
    url:      resp.data.url,
    mimeType: resp.data.mime_type,
    fileSize: resp.data.file_size
  };
}

// ---------------------------------------------------------------------------
// 2. Download image bytes — SSRF-safe, size-limited
// ---------------------------------------------------------------------------

async function downloadMedia(url) {
  // SSRF prevention: only allow whitelisted Meta CDN domains
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const domainOk = ALLOWED_DOMAINS.some(d =>
    hostname === d || hostname.endsWith('.' + d)
  );
  if (!domainOk) {
    throw new Error(`SSRF blocked: domain "${hostname}" is not whitelisted`);
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed for media download');
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const resp  = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: MAX_FILE_SIZE,
    maxBodyLength:    MAX_FILE_SIZE
  });

  const buffer      = Buffer.from(resp.data);
  const contentType = resp.headers['content-type'] || '';

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`);
  }

  return { buffer, contentType };
}

// ---------------------------------------------------------------------------
// 3. Validate image — MIME type + magic bytes + content scan
// ---------------------------------------------------------------------------

function validateImage(buffer, mimeType) {
  // Normalise MIME
  const mime = (mimeType || '').split(';')[0].trim().toLowerCase();

  // Check against allowed list
  const spec = ALLOWED_MIME[mime];
  if (!spec) {
    throw new Error(`Disallowed MIME type: "${mime}". Only JPEG and PNG are accepted.`);
  }

  // Verify magic bytes
  const headerBytes = [...buffer.slice(0, spec.magic.length)];
  const magicMatch  = spec.magic.every((b, i) => headerBytes[i] === b);
  if (!magicMatch) {
    throw new Error('File content does not match its declared MIME type (magic bytes mismatch)');
  }

  // Size check
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`);
  }

  // Content scan: reject if file starts with script/code signatures
  const head = buffer.slice(0, 256).toString('utf8').toLowerCase();
  const dangerous = ['<script', '<?php', '<%', '#!/', 'function(', 'import '];
  for (const sig of dangerous) {
    if (head.includes(sig)) {
      throw new Error('File content contains suspicious code signatures');
    }
  }

  return { mime, ext: spec.ext };
}

// ---------------------------------------------------------------------------
// 4. Save to OS temp directory with unique name
// ---------------------------------------------------------------------------

function saveTempFile(buffer, mimeType) {
  const { ext } = validateImage(buffer, mimeType);
  const filename = `complaint-${crypto.randomUUID()}${ext}`;
  const filePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ---------------------------------------------------------------------------
// 5. Cleanup
// ---------------------------------------------------------------------------

function cleanupTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('cleanupTempFile error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// 6. Build multipart/form-data payload
// ---------------------------------------------------------------------------

function buildFormData(filePath, mimeType, payload) {
  const form = new FormData();

  // Attach the image file
  const filename = path.basename(filePath);
  form.append('image', fs.createReadStream(filePath), {
    filename,
    contentType: mimeType
  });

  // Attach complaint data as JSON fields
  form.append('user',      JSON.stringify(payload.user));
  form.append('location',  JSON.stringify(payload.location));
  form.append('complaint', JSON.stringify(payload.complaint));

  if (payload.complaintCode) {
    form.append('complaintCode', payload.complaintCode);
  }

  return form;
}

module.exports = {
  getMediaUrl,
  downloadMedia,
  validateImage,
  saveTempFile,
  cleanupTempFile,
  buildFormData
};
