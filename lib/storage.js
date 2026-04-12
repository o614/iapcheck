// lib/storage.js
let kv = null;
try { ({ kv } = require('@vercel/kv')); } catch (e) { console.warn('KV 未连接，降级为无缓存模式'); }

async function getCache(key) {
  if (!kv) return null;
  try { return await kv.get(key); } catch (e) { return null; }
}

async function setCache(key, value, ttl = 86400) {
  if (!kv) return false;
  try { await kv.set(key, value, { ex: ttl }); return true; } catch (e) { return false; }
}

async function acquireLock(key, ttl = 15) {
  if (!kv) return true; // 无 KV 时默认放行
  try { 
    const res = await kv.set(`lock:${key}`, '1', { nx: true, ex: ttl }); 
    return !!res;
  } catch (e) { return true; } // 报错时放行，防死锁
}

async function releaseLock(key) {
  if (!kv) return;
  try { await kv.del(`lock:${key}`); } catch (e) {}
}

module.exports = { getCache, setCache, acquireLock, releaseLock };
