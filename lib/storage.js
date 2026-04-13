// lib/storage.js
const { kv } = require('@vercel/kv');

async function getCache(key) {
  try { return await kv.get(key); } catch (e) { return null; }
}

async function setCache(key, value, ttl = 86400) {
  try { await kv.set(key, value, { ex: ttl }); } catch (e) {}
}

async function acquireLock(key, ttl = 60000) {
  const lockKey = `lock:${key}`;
  const success = await kv.set(lockKey, 'locked', { nx: true, px: ttl });
  return success === 'OK';
}

async function releaseLock(key) {
  await kv.del(`lock:${key}`);
}

module.exports = { getCache, setCache, acquireLock, releaseLock };
