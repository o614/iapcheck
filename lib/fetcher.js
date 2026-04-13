// lib/fetcher.js
const { REGIONS } = require('./config');
const { extractIAPFromHTML, parsePrice } = require('./parser');

async function fetchRegionData(appId, region, liveRates) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    const controller = new AbortController();
    // 超时时间缩短到 3.5 秒，防止单个国家卡死导致 Vercel 整体 10 秒超时崩溃
    const timeoutId = setTimeout(() => controller.abort(), 3500); 
    const response = await fetch(url, { 
        signal: controller.signal, 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 
            'Accept-Language': 'en-US,en;q=0.9' 
        } 
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const rawIaps = extractIAPFromHTML(html);
    
    const cleanIaps = rawIaps.map(item => {
      const { number, currency } = parsePrice(item.priceStr, region.defaultCurrency);
      
      let cnyPrice = 0;
      if (currency === 'CNY') {
          cnyPrice = number;
      } else if (liveRates && liveRates[currency]) {
          cnyPrice = number / liveRates[currency];
      }
      
      return {
        // 🌟 核心修复：坚决不删减括号和内容，原汁原味保留内购真实名字！
        name: item.name.replace(/&nbsp;/g, ' ').trim(), 
        originalPrice: item.priceStr.trim(),
        cnyPrice: parseFloat(cnyPrice.toFixed(2))
      };
    });

    const validIaps = cleanIaps.filter(iap => iap.cnyPrice > 0);
    return { region: region.code, data: validIaps };
  } catch (error) {
    return { region: region.code, data: [] }; 
  }
}

async function fetchAllRegions(appId, liveRates) {
  const successfulData = {};
  
  // 🌟 核心修复：废除 Promise.all，改为慢加载排队抓取，彻底避免触发防火墙
  for (const region of REGIONS) {
    const res = await fetchRegionData(appId, region, liveRates);
    if (res.data && res.data.length > 0) {
      successfulData[res.region] = res.data;
    }
    // 每次抓取后休息 100 毫秒，对苹果服务器温柔一点
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return successfulData;
}

module.exports = { fetchAllRegions };
