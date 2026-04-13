// lib/fetcher.js
const { extractIAPFromHTML, parsePrice } = require('./parser');

async function fetchRegionData(appId, region) {
  const url = `https://apps.apple.com/${region.code}/app/id${appId}?l=en`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 后台运行，给足 10 秒等待
    const response = await fetch(url, { 
        signal: controller.signal, 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 
            'Accept-Language': 'en-US,en;q=0.9' 
        } 
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const rawIaps = extractIAPFromHTML(html);
    
    // 返回未转换汇率的纯净原始数据
    const cleanIaps = rawIaps.map(item => {
      const { number, currency } = parsePrice(item.priceStr, region.defaultCurrency);
      return {
        name: item.name.replace(/&nbsp;/g, ' ').trim(), 
        originalPrice: item.priceStr.trim(),
        rawNumber: number,
        currency: currency
      };
    });

    return cleanIaps;
  } catch (error) {
    console.error(`[抓取失败] ${region.name}(${region.code}): ${error.message}`);
    return null; // 返回 null 代表异常，后续逻辑会调用旧缓存兜底
  }
}

module.exports = { fetchRegionData };
