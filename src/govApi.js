'use strict';

/**
 * Government API abstraction layer.
 *
 * Current implementation posts to a placeholder endpoint.
 * Replace GOVT_API_URL in .env with the real Pakistan Government endpoint
 * when available.
 *
 * Expected complaint payload:
 *   complaintCode, cnic, province, pumpName, complaintType,
 *   details, latitude, longitude, locationText, imageBase64, submittedAt
 */

const axios = require('axios');

const TIMEOUT_MS = 10000;

/**
 * Submit a single complaint to the Government API.
 * @param {object} draft - ComplaintDraft object (from Redis queue)
 * @returns {Promise<{success: boolean, reference: string|null, error: string|null}>}
 */
async function submitComplaint(draft) {
  const govApiUrl = process.env.GOVT_API_URL || 'http://localhost:9999/placeholder-api';

  const payload = {
    complaintCode: draft.complaintCode,
    cnic:          draft.cnic,
    province:      draft.province,
    pumpName:      draft.pumpName,
    complaintType: draft.complaintType,
    details:       draft.details       || null,
    latitude:      draft.latitude      || null,
    longitude:     draft.longitude     || null,
    locationText:  draft.locationText  || null,
    imageBase64:   draft.imageBase64   || null,
    submittedAt:   draft.submittedAt
  };

  try {
    const response = await axios.post(govApiUrl, payload, {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });

    return {
      success:   true,
      reference: response.data?.reference || null,
      error:     null
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    console.error(`[govApi] Failed to submit ${draft.complaintCode}:`, message);
    return { success: false, reference: null, error: message };
  }
}

module.exports = { submitComplaint };
