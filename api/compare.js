// api/compare.js
const { getCache, setCache, acquireLock, releaseLock, getUserScrapeCount, incrUserScrapeCount } = require('../lib/storage');
const { fetchAllRegions } = require('../lib/fetcher');
const { REGIONS, SUPPORTED_APPS, FALLBACK_RATES } = require('../lib/config');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  if (req.method === 'OPTIONS') return res.status(200).end();

  const queryApp = req.query.app;
  const openid = req.query.openid; // 🌟 获取前端传入的 OpenID
  
  if (!queryApp) return res.status(400).json({ error: '请提供应用名称或ID' });

  let targetApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  // 1. 尝试定位 App 基础信息（这步不消耗额度）
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
    } catch (e) {}
  }

  if (!targetApp) return res.status(404).json({ error: '未找到该应用' });

  // 2. 检查缓存
  const cacheKey = `compare:v11:${targetApp.id}`;
  const cachedData = await getCache(cacheKey);
  
  // 🌟 如果缓存命中，所有人都可以看
  if (cachedData) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  // 3. 🌟 缓存未命中逻辑：权限检查
  if (!openid) {
    return res.status(403).json({ 
      error: '游客模式受限', 
      isVipPrompt: true,
      message: `该应用当前无缓存。请输入 OpenID 后可手动启动实时抓取。`
    });
  }

  // 4. 🌟 检查 OpenID 额度
  const usage = await getUserScrapeCount(openid);
  if (usage >= 5) {
    return res.status(403).json({ 
      error: '查询额度用尽', 
      message: `您的 OpenID (限额 5 个新应用) 已耗尽，请查看已收录应用。`
    });
  }

  // 5. 启动抓取流程
  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '数据抓取中，请稍后刷新...' });

  try {
    // 补全高清图
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

    // 🌟 存储缓存并增加用户计数
    await setCache(cacheKey, finalResult, 86400);
    await incrUserScrapeCount(openid);

    return res.status(200).json({ status: 'success', data: finalResult });
  } catch (error) {
    return res.status(500).json({ error: '服务器错误' });
  } finally {
    await releaseLock(cacheKey);
  }
}
