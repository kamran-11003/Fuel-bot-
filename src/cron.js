'use strict';

/**
 * Cron-based complaint dispatch worker.
 *
 * Schedule: every 4 hours (0 *\/4 * * *)
 *
 * Worker logic:
 *  1. Snapshot queue length
 *  2. RPOP up to `length` items
 *  3. Call Government API for each
 *  4. On success  → done (complaint record already saved in Redis)
 *  5. On failure  → RPUSH back to queue with incremented _retryCount
 *  6. After MAX_RETRIES failures → log permanently failed, discard
 */

const cron = require('node-cron');
const { popFromQueue, pushToQueue, queueLength } = require('./redis');
const { submitComplaint } = require('./govApi');

const MAX_RETRIES = 3;

async function processBatch() {
  let length;
  try {
    length = await queueLength();
  } catch (err) {
    console.error('[cron] Could not reach Redis:', err.message);
    return;
  }

  if (length === 0) {
    console.log('[cron] Queue empty — nothing to dispatch');
    return;
  }

  console.log(`[cron] Dispatching ${length} complaint(s) — ${new Date().toISOString()}`);

  for (let i = 0; i < length; i++) {
    const draft = await popFromQueue();
    if (!draft) break;

    const retryCount = draft._retryCount || 0;
    console.log(`[cron] Processing ${draft.complaintCode} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    const result = await submitComplaint(draft);

    if (result.success) {
      console.log(`[cron] ✅ ${draft.complaintCode} dispatched — ref: ${result.reference || 'n/a'}`);
    } else {
      if (retryCount < MAX_RETRIES) {
        console.warn(`[cron] ⚠️  ${draft.complaintCode} failed — requeueing (retry ${retryCount + 1}/${MAX_RETRIES})`);
        await pushToQueue({ ...draft, _retryCount: retryCount + 1 });
      } else {
        console.error(`[cron] ❌ ${draft.complaintCode} permanently failed after ${MAX_RETRIES} retries`);
      }
    }
  }

  console.log('[cron] Batch complete');
}

/**
 * Register the cron job.  Call once at server startup.
 */
function startCronWorker() {
  // Every 4 hours: minute 0, every 4th hour
  cron.schedule('0 */4 * * *', async () => {
    try {
      await processBatch();
    } catch (err) {
      console.error('[cron] Unhandled batch error:', err);
    }
  });

  console.log('⏰ Cron worker registered — dispatches every 4 hours');
}

module.exports = { startCronWorker, processBatch };
