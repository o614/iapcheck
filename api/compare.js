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

  const foundApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  if (!foundApp) {
    return res.status(403).json({ 
      error: '应用未收录', 
      isVipPrompt: true,
      message: `「${queryApp}」暂未收录。普通用户仅支持查询推荐库应用。解锁全网千万级 App 自助抓取权限，请升级 VIP。`
    });
  }

  const targetApp = { ...foundApp };

  // 🌟 缓存版本升级到 v8，把之前吃数据的残缺缓存全部炸毁！
  const cacheKey = `compare:v8:${targetApp.id}`;

  const cachedData = await getCache(cacheKey);
  if (cachedData) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '正在为您排队安全抓取全球数据，请 8 秒后刷新...' });

  try {
    try {
      // 🌟 核心修复：强制去美区 (us) 获取基础信息，保证 100% 能拿到图标！
      const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${targetApp.id}&country=us`);
      const itunesData = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const result = itunesData.results[0];
        targetApp.icon = result.artworkUrl512 || (result.artworkUrl100 ? result.artworkUrl100.replace('100x100bb', '512x512bb') : null);
        targetApp.priceStr = result.formattedPrice || (result.price === 0 ? '免费' : `¥${result.price}`);
      }
    } catch(e) {
      console.warn('iTunes Lookup Failed');
    }

    let liveRates = await getCache('exchange_rates_cny');
    if (!liveRates) {
      try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/CNY');
        const rateData = await rateRes.json();
        liveRates = rateData.rates;
        await setCache('exchange_rates_cny', liveRates, 43200);
      } catch(e) {
        liveRates = FALLBACK_RATES;
      }
    }

    const rawRegionData = await fetchAllRegions(targetApp.id, liveRates);

    const byItem = {};
    const byRegion = {};

    Object.keys(rawRegionData).forEach(regionCode => {
      const iapList = rawRegionData[regionCode];
      const regionObj = REGIONS.find(r => r.code === regionCode);
      
      iapList.sort((a, b) => a.cnyPrice - b.cnyPrice);

      // 🌟 废除愚蠢的加后缀逻辑，原原本本存入
      byRegion[regionCode] = { name: regionObj.name, flag: regionObj.flag, iaps: iapList };

      iapList.forEach(iap => {
        if (!byItem[iap.name]) byItem[iap.name] = [];
        byItem[iap.name].push({
          regionCode: regionCode, regionName: regionObj.name,
          originalPrice: iap.originalPrice, cnyPrice: iap.cnyPrice
        });
      });
    });

    Object.keys(byItem).forEach(itemName => {
      byItem[itemName].sort((a, b) => a.cnyPrice - b.cnyPrice);
    });

    const finalResult = {
      app: targetApp, 
      compareData: { byItem, byRegion }
    };

    await setCache(cacheKey, finalResult, 86400);
    return res.status(200).json({ status: 'success', source: 'live', data: finalResult });

  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误，请稍后再试' });
  } finally {
    await releaseLock(cacheKey);
  }
}
