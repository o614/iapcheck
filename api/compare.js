// api/compare.js
const { getCache, setCache, acquireLock, releaseLock } = require('../lib/storage');
const { fetchAllRegions } = require('../lib/fetcher');
const { REGIONS, SUPPORTED_APPS } = require('../lib/config');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  if (req.method === 'OPTIONS') return res.status(200).end();

  const queryApp = req.query.app;
  if (!queryApp) return res.status(400).json({ error: '请提供应用名称或ID' });

  // 1. 本地库极速比对（核心变更点）
  const targetApp = SUPPORTED_APPS.find(
    a => a.id === queryApp || a.name.toLowerCase() === queryApp.toLowerCase()
  );

  // 💰 VIP 商业转化钩子：如果没搜到，不报错，而是引导升级
  if (!targetApp) {
    return res.status(403).json({ 
      error: '应用未收录', 
      isVipPrompt: true, // 告诉前端这是一个可以变现的场景
      message: `「${queryApp}」暂未收录。普通用户仅支持查询 Top 10 核心应用。解锁全网千万级 App 自助抓取与搜索权限，请升级 VIP 会员。`
    });
  }

  const cacheKey = `compare:v2:${targetApp.id}`;

  const cachedData = await getCache(cacheKey);
  if (cachedData) return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });

  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) return res.status(429).json({ status: 'processing', message: '正在全网火速拉取数据，请5秒后刷新...' });

  try {
    // 2. 直接拿 ID 去抓 10 个国家，彻底跳过慢吞吞的 iTunes Search 接口！
    const rawRegionData = await fetchAllRegions(targetApp.id);

    const byItem = {};
    const byRegion = {};

    Object.keys(rawRegionData).forEach(regionCode => {
      const iapList = rawRegionData[regionCode];
      const regionObj = REGIONS.find(r => r.code === regionCode);
      
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
      app: targetApp, // 直接使用本地高质量信息
      compareData: { byItem, byRegion }
    };

    await setCache(cacheKey, finalResult, 86400); // 缓存一天
    return res.status(200).json({ status: 'success', source: 'live', data: finalResult });

  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误，请稍后再试' });
  } finally {
    await releaseLock(cacheKey);
  }
}
