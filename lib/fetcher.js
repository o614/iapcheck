// lib/fetcher.js
const { REGIONS } = require('./config');
const { extractIAPFromHTML, extractNumber } = require('./parser');

async function fetchRegionData(appId, region) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    // 强制 6 秒超时，防止 Vercel 整体超时 (10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const rawIaps = extractIAPFromHTML(html);
    
    // 清洗并加入汇率换算
    const cleanIaps = rawIaps.map(item => {
      const originalNum = extractNumber(item.priceStr);
      return {
        name: item.name.trim(), // 去除多余空格，方便后续对齐
        originalPrice: item.priceStr,
        cnyPrice: parseFloat((originalNum * region.rate).toFixed(2)) // 折算人民币
      };
    });

    return { region: region.code, data: cleanIaps };
  } catch (error) {
    // 降级处理：仅打印警告，不中断程序
    console.warn(`[降级] ${region.code} 区获取失败: ${error.message}`);
    throw error; 
  }
}

// 核心并发函数
async function fetchAllRegions(appId) {
  const promises = REGIONS.map(region => fetchRegionData(appId, region));
  const results = await Promise.allSettled(promises);
  
  const successfulData = {};
  
  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value) {
      successfulData[res.value.region] = res.value.data;
    }
  });
  
  return successfulData; // 即使只有 8 个成功，也会返回这 8 个的数据
}

module.exports = { fetchAllRegions };
