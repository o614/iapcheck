// lib/fetcher.js
const { REGIONS } = require('./config');
const { extractIAPFromHTML, parsePrice } = require('./parser');

async function fetchRegionData(appId, region, liveRates) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 严格5秒超时
    const response = await fetch(url, { 
        signal: controller.signal, 
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' } 
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const rawIaps = extractIAPFromHTML(html);
    
    const cleanIaps = rawIaps.map(item => {
      const { number, currency } = parsePrice(item.priceStr, region.defaultCurrency);
      
      // 🌟 核心汇率计算：外币 / (外币每人民币的汇率) = 人民币价格
      let cnyPrice = 0;
      if (currency === 'CNY') {
          cnyPrice = number;
      } else if (liveRates && liveRates[currency]) {
          cnyPrice = number / liveRates[currency];
      }
      
      return {
        name: item.name.replace(/&nbsp;/g, ' ').replace(/\(.*\)$/, '').trim(), 
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
  const promises = REGIONS.map(region => fetchRegionData(appId, region, liveRates));
  const results = await Promise.allSettled(promises);
  
  const successfulData = {};
  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value && res.value.data.length > 0) {
      successfulData[res.value.region] = res.value.data;
    }
  });
  return successfulData;
}

module.exports = { fetchAllRegions };
