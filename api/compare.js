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

  const targetApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  if (!targetApp) {
    return res.status(403).json({ 
      error: '应用未收录', 
      isVipPrompt: true,
      message: `「${queryApp}」暂未收录。普通用户仅支持查询推荐库应用。解锁全网千万级 App 自助抓取权限，请升级 VIP。`
    });
  }

  const cacheKey = `compare:v3:${targetApp.id}`;

  const cachedData = await getCache(cacheKey);
  if (cachedData) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '正在全网火速拉取数据，请5秒后刷新...' });

  try {
    // 🌟 1. 借鉴开源库：动态拉取全球实时汇率并缓存 12 小时
    let liveRates = await getCache('exchange_rates_cny');
    if (!liveRates) {
      try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/CNY');
        const rateData = await rateRes.json();
        liveRates = rateData.rates;
        await setCache('exchange_rates_cny', liveRates, 43200);
      } catch(e) {
        liveRates = FALLBACK_RATES; // 接口挂了用兜底
      }
    }

    // 2. 传入实时汇率进行抓取
    const rawRegionData = await fetchAllRegions(targetApp.id, liveRates);

    const byItem = {};
    const byRegion = {};

    Object.keys(rawRegionData).forEach(regionCode => {
      const iapList = rawRegionData[regionCode];
      const regionObj = REGIONS.find(r => r.code === regionCode);
      
      // 先按价格升序排序
      iapList.sort((a, b) => a.cnyPrice - b.cnyPrice);

      // 🌟 2. 借鉴开源库：完美处理同名内购防覆盖 (如出现两个 1 Month, 第二个叫 1 Month #2)
      const nameCountMap = {};
      const processedIaps = iapList.map(iap => {
          const count = (nameCountMap[iap.name] || 0) + 1;
          nameCountMap[iap.name] = count;
          const uniqueName = count > 1 ? `${iap.name} #${count}` : iap.name;
          return { ...iap, uniqueName };
      });

      byRegion[regionCode] = { name: regionObj.name, flag: regionObj.flag, iaps: processedIaps };

      processedIaps.forEach(iap => {
        if (!byItem[iap.uniqueName]) byItem[iap.uniqueName] = [];
        byItem[iap.uniqueName].push({
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
