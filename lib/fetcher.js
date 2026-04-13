// lib/fetcher.js
const { REGIONS } = require('./config');
const { extractIAPFromHTML, parsePrice } = require('./parser');

async function fetchRegionData(appId, region, liveRates) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    const controller = new AbortController();
    // 🌟 单个国家最高只允许等 3.5 秒，绝不能拖累全局
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
  
  // 🌟 核心修复：分组并发 (Batching)。4 个一组去查，完美平衡苹果限流和 Vercel 10秒超时！
  const BATCH_SIZE = 4; 
  
  for (let i = 0; i < REGIONS.length; i += BATCH_SIZE) {
    const batch = REGIONS.slice(i, i + BATCH_SIZE);
    
    // 同时发起这 4 个国家的请求
    const promises = batch.map(region => fetchRegionData(appId, region, liveRates));
    const results = await Promise.allSettled(promises);
    
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value && res.value.data.length > 0) {
        successfulData[res.value.region] = res.value.data;
      }
    });
    
    // 如果还没查完，这批查完后稍微歇息 200 毫秒
    if (i + BATCH_SIZE < REGIONS.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return successfulData;
}

module.exports = { fetchAllRegions };
