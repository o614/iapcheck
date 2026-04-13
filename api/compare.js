// api/compare.js
const { getCache, setCache, acquireLock, releaseLock } = require('../lib/storage');
const { fetchAllRegions } = require('../lib/fetcher');
const { REGIONS, SUPPORTED_APPS, FALLBACK_RATES } = require('../lib/config');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  if (req.method === 'OPTIONS') return res.status(200).end();

  const queryApp = req.query.app;
  if (!queryApp) return res.status(400).json({ error: '请提供应用名称或ID' });

  // 🌟 严格白名单模式：只允许查询 config.js 里配置好的 App
  const targetApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  if (!targetApp) {
    return res.status(403).json({ 
      error: '应用未收录', 
      isVipPrompt: true,
      message: `「${queryApp}」暂未收录。本比价系统为纯净私有版，仅展示开发者精选录入的 App 数据。如需比价新应用，请前往微信公众号留言提交需求。`
    });
  }

  // 接收 Cron 传来的强制刷新指令
  const isCron = req.query.cron === process.env.CRON_SECRET && process.env.CRON_SECRET;
  
  const cacheKey = `compare:v11:${targetApp.id}`;
  const cachedData = await getCache(cacheKey);
  
  // 如果有缓存且不是定时任务强制刷新，直接秒回
  if (cachedData && !isCron) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '后台数据更新中，请稍后刷新...' });

  try {
    const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${targetApp.id}&country=us`);
    const itunesData = await itunesRes.json();
    if (itunesData.results && itunesData.results.length > 0) {
        const r = itunesData.results[0];
        targetApp.icon = r.artworkUrl512 || (r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '512x512bb') : null);
        targetApp.priceStr = r.formattedPrice || (r.price === 0 ? '免费' : `¥${r.price}`);
    }

    let liveRates = await getCache('exchange_rates_cny');
    if (!liveRates) {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/CNY').catch(() => null);
      liveRates = rateRes ? (await rateRes.json()).rates : FALLBACK_RATES;
      await setCache('exchange_rates_cny', liveRates, 43200);
    }

    const rawRegionData = await fetchAllRegions(targetApp.id, liveRates);
    const byItem = {};
    const byRegion = {};

    Object.keys(rawRegionData).forEach(regionCode => {
      const iapList = rawRegionData[regionCode];
      const regionObj = REGIONS.find(r => r.code === regionCode);
      iapList.sort((a, b) => a.cnyPrice - b.cnyPrice);
      const nameCountMap = {};
      const processedIaps = iapList.map(iap => {
          const count = (nameCountMap[iap.name] || 0) + 1;
          nameCountMap[iap.name] = count;
          const uniqueName = count > 1 ? `${iap.name} #${count}` : iap.name;
          return { ...iap, uniqueName };
      });
      byRegion[regionCode] = { name: regionObj.name, iaps: processedIaps };
      processedIaps.forEach(iap => {
        if (!byItem[iap.uniqueName]) byItem[iap.uniqueName] = [];
        byItem[iap.uniqueName].push({
          regionCode: regionCode, regionName: regionObj.name,
          originalPrice: iap.originalPrice, cnyPrice: iap.cnyPrice
        });
      });
    });

    Object.keys(byItem).forEach(key => byItem[key].sort((a, b) => a.cnyPrice - b.cnyPrice));
    const finalResult = { app: targetApp, compareData: { byItem, byRegion } };

    await setCache(cacheKey, finalResult, 86400); // 缓存 24 小时
    return res.status(200).json({ status: 'success', data: finalResult });
  } catch (error) {
    return res.status(500).json({ error: '服务器错误' });
  } finally {
    await releaseLock(cacheKey);
  }
}
