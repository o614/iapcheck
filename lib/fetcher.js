// lib/fetcher.js
const { REGIONS, CURRENCY_RATES } = require('./config');
const { extractIAPFromHTML, parsePrice } = require('./parser');

async function fetchRegionData(appId, region) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const rawIaps = extractIAPFromHTML(html);
    
    const cleanIaps = rawIaps.map(item => {
      // 使用智能解析
      const { number, currency } = parsePrice(item.priceStr);
      
      // 动态匹配汇率：先找货币符号，找不到就用USD兜底（防止算错变成0）
      const rate = CURRENCY_RATES[currency] || CURRENCY_RATES['USD'];
      
      return {
        name: item.name.replace(/&nbsp;/g, ' ').trim(), // 深度清洗空格
        originalPrice: item.priceStr,
        cnyPrice: parseFloat((number * rate).toFixed(2))
      };
    });

    return { region: region.code, data: cleanIaps };
  } catch (error) {
    return { region: region.code, data: [] }; // 失败返回空数据，防止中断
  }
}

async function fetchAllRegions(appId) {
  const promises = REGIONS.map(region => fetchRegionData(appId, region));
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
