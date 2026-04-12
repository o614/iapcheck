// api/compare.js
const { getCache, setCache, acquireLock, releaseLock } = require('../lib/storage');
const { fetchAllRegions } = require('../lib/fetcher');
const { REGIONS } = require('../lib/config');

module.exports = async function(req, res) {
  // 1. CORS 配置 (允许你的前端域名跨域调用)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  if (req.method === 'OPTIONS') return res.status(200).end();

  const appName = req.query.app;
  if (!appName) return res.status(400).json({ error: '请提供应用名称' });

  const cacheKey = `compare:v1:${appName.toLowerCase().replace(/\s/g, '')}`;

  // 2. 查缓存
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });
  }

  // 3. 抢锁防并发击穿
  const gotLock = await acquireLock(cacheKey);
  if (!gotLock) {
    return res.status(429).json({ status: 'processing', message: '系统正在后台为您拉取全球数据，请等待 10 秒后刷新重试' });
  }

  try {
    // 4. 先调 Apple Search API 拿到真实 AppId (以美区为基准查)
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(appName)}&entity=software&country=us&limit=1`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ error: '未找到该应用' });
    }

    const appInfo = searchData.results[0];
    const appId = appInfo.trackId;

    // 5. 🚀 触发 10 国并发爬取
    const rawRegionData = await fetchAllRegions(appId);

    // ... 之前的代码到步骤 5 结束 ...

    // 6. 数据聚合 (Data Pivot)
    const byItem = {};   // 横向：内购名 -> 各国价格
    const byRegion = {}; // 纵向：国家 -> 所有内购

    Object.keys(rawRegionData).forEach(regionCode => {
      const iapList = rawRegionData[regionCode];
      const regionObj = REGIONS.find(r => r.code === regionCode);
      
      // 填充纵向数据
      byRegion[regionCode] = {
        name: regionObj.name,
        flag: regionObj.flag,
        iaps: iapList // 该国家下的所有内购
      };

      // 填充横向数据
      iapList.forEach(iap => {
        if (!byItem[iap.name]) byItem[iap.name] = [];
        byItem[iap.name].push({
          regionCode: regionCode,
          regionName: regionObj.name,
          originalPrice: iap.originalPrice,
          cnyPrice: iap.cnyPrice
        });
      });
    });

    // 7. 排序
    Object.keys(byItem).forEach(itemName => {
      byItem[itemName].sort((a, b) => a.cnyPrice - b.cnyPrice);
    });

    // 8. 组装结果
    const finalResult = {
      app: {
        id: appId,
        name: appInfo.trackName,
        icon: appInfo.artworkUrl100,
        developer: appInfo.artistName
      },
      compareData: {
        byItem,   // 用于“项目比价”
        byRegion  // 用于“地区对比”
      }
    };
// ... 后续写入缓存并返回 ...

    // 9. 写入缓存 (缓存 24 小时)
    await setCache(cacheKey, finalResult, 86400);

    // 10. 返回成功数据
    return res.status(200).json({ status: 'success', source: 'live', data: finalResult });

  } catch (error) {
    console.error('API 处理异常:', error);
    return res.status(500).json({ error: '服务器内部错误，请稍后再试' });
  } finally {
    // 无论成功失败，释放锁
    await releaseLock(cacheKey);
  }
}
