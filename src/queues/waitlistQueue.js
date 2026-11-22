// Waitlists are Redis lists (first in, first out) of JSON entries:
//   { scope, patient_id, doctor_id, date, appt_datetime }
// Entries contain no timestamps, so the same request always produces the same
// string; that lets LPOS detect duplicates and LREM remove an exact entry.
//
// To promote a patient the worker never pops them: takeNext() atomically MOVES
// the first entry to WAITLIST_PROCESSING. The entry is then either removed
// (booked, or no longer valid) or moved back to the front of its waitlist,
// so a patient is always in the waitlist, in processing, or in appointments.

const { getRedis } = require('../config/redis');
const { WAITLIST_PROCESSING, waitlistKeyFor } = require('./keys');

const serialize = (entry) =>
  JSON.stringify({
    scope: entry.scope,
    patient_id: entry.patient_id,
    doctor_id: entry.doctor_id,
    date: entry.date,
    appt_datetime: entry.appt_datetime,
  });

/**
 * Adds an entry to the end of its waitlist. The list expires at expiresAt
 * (a Date), when the day is over. Returns the 1-based position, or null if
 * this patient is already waiting for the same thing.
 */
async function join(entry, expiresAt) {
  const redis = getRedis();
  const key = waitlistKeyFor(entry);
  const raw = serialize(entry);

  if ((await redis.lpos(key, raw)) !== null) return null;

  const [[, length]] = await redis
    .multi()
    .rpush(key, raw)
    .expireat(key, Math.floor(expiresAt.getTime() / 1000))
    .exec();
  return length;
}

async function list(key) {
  const raws = await getRedis().lrange(key, 0, -1);
  return raws.map((raw) => JSON.parse(raw));
}

/** Finds waitlist keys matching a pattern, e.g. all slot waitlists of one day. */
async function findKeys(pattern) {
  const keys = [];
  const stream = getRedis().scanStream({ match: pattern, count: 100 });
  for await (const batch of stream) keys.push(...batch);
  return keys.sort();
}

/** Atomically moves the first waiting entry to processing. Returns it or null. */
async function takeNext(key) {
  const raw = await getRedis().lmove(key, WAITLIST_PROCESSING, 'LEFT', 'RIGHT');
  return raw ? { raw, entry: JSON.parse(raw) } : null;
}

/** Removes an entry from processing (it was booked, or is no longer valid). */
async function complete({ raw }) {
  await getRedis().lrem(WAITLIST_PROCESSING, 1, raw);
}

/** Moves an entry from processing back to the FRONT of its waitlist. */
async function returnToFront({ raw, entry }) {
  await getRedis()
    .multi()
    .lrem(WAITLIST_PROCESSING, 1, raw)
    .lpush(waitlistKeyFor(entry), raw)
    .exec();
}

/** After a crash: puts every entry left in processing back at the front. */
async function recoverStalled() {
  const raws = await getRedis().lrange(WAITLIST_PROCESSING, 0, -1);
  for (const raw of raws.reverse()) {
    await returnToFront({ raw, entry: JSON.parse(raw) });
  }
  return raws.length;
}

module.exports = { join, list, findKeys, takeNext, complete, returnToFront, recoverStalled };
