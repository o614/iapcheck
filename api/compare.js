// api/compare.js
const { getCache } = require('../lib/storage');
const { SUPPORTED_APPS } = require('../lib/config');

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
      message: `「${queryApp}」暂未收录。本系统为纯净私有版，仅展示开发者录入的 App 数据。`
    });
  }

  // 🌟 纯粹的读取逻辑：坚决不在前台发网络请求，彻底杜绝 Vercel 10秒超时！
  const cacheKey = `compare:final:${targetApp.id}`;
  const cachedData = await getCache(cacheKey);
  
  if (cachedData) {
      return res.status(200).json({ status: 'success', source: 'cache', data: cachedData });
  } else {
      return res.status(404).json({ 
          error: '数据尚未初始化', 
          message: '后台爬虫首次抓取中，请等待后台运行完毕。' 
      });
  }
}
