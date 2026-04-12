// lib/parser.js

function extractIAPFromHTML(html) {
  const startTag = '<script type="application/json" id="serialized-server-data">';
  const endTag = '</script>';
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) return [];

  const contentStart = startIdx + startTag.length;
  const endIdx = html.indexOf(endTag, contentStart);
  if (endIdx === -1) return [];

  try {
    const jsonStr = html.substring(contentStart, endIdx);
    const jsonData = JSON.parse(jsonStr);
    return findIAP(jsonData) || [];
  } catch (err) {
    return [];
  }
}

function findIAP(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.title === 'In-App Purchases') {
    if (obj.items && obj.items[0] && obj.items[0].textPairs) {
      return obj.items[0].textPairs.map(pair => ({ name: pair[0], priceStr: pair[1] }));
    }
    if (obj.items_V3 && Array.isArray(obj.items_V3)) {
      return obj.items_V3
        .filter(item => item.$kind === 'textPair')
        .map(item => ({ name: item.leadingText, priceStr: item.trailingText }));
    }
  }
  for (const key in obj) {
    const result = findIAP(obj[key]);
    if (result) return result;
  }
  return null;
}

// 智能数字与货币符号提取器
function parsePrice(priceStr) {
  if (!priceStr) return { number: 0, currency: 'USD' }; // 默认兜底
  
  // 1. 提取出数字部分 (保留数字、点、逗号)
  const numMatch = priceStr.match(/[\d.,]+/);
  if (!numMatch) return { number: 0, currency: 'USD' };
  
  let numStr = numMatch[0];
  
  // 2. 修复欧洲格式 (如 8.999,99 -> 8999.99)
  if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else {
    // 正常格式 (如 8,999.99 -> 8999.99)
    numStr = numStr.replace(/,/g, '');
  }

  const number = parseFloat(numStr) || 0;

  // 3. 提取货币符号 (把数字和空格去掉，剩下的就是货币符号)
  let currency = priceStr.replace(/[\d.,\s]/g, '').trim();
  // 特殊处理美元符号和USD
  if (priceStr.includes('USD')) currency = 'USD';
  
  return { number, currency };
}

module.exports = { extractIAPFromHTML, parsePrice };
