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

  let targetApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  // 🌟 去掉联想，直接通过美区定位唯一 ID
  if (!targetApp) {
    try {
      const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryApp)}&limit=1&country=us&entity=software`);
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results.length > 0) {
        const item = searchData.results[0];
        targetApp = {
          id: item.trackId.toString(),
          name: item.trackName,
          developer: item.artistName,
          icon: item.artworkUrl512 || item.artworkUrl100.replace('100x100bb', '512x512bb')
        };
      }
    } catch (e) { console.error("US Search API Failed", e); }
  }

  if (!targetApp) return res.status(404).json({ error: '未找到该应用，请检查名称或 ID' });

  const cacheKey = `compare:v10:${targetApp.id}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '正在安全抓取全球数据，请稍后刷新...' });

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
    await setCache(cacheKey, finalResult, 86400);
    return res.status(200).json({ status: 'success', data: finalResult });

  } catch (error) {
    return res.status(500).json({ error: '服务器错误' });
  } finally {
    await releaseLock(cacheKey);
  }
}
