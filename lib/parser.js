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
  
  // ?l=en 绝对生效，直接锁定 In-App Purchases
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

function parsePrice(priceStr, defaultCurrency) {
  if (!priceStr) return { number: 0, currency: defaultCurrency };
  
  const numMatch = priceStr.match(/[\d.,]+/);
  if (!numMatch) return { number: 0, currency: defaultCurrency };
  
  let rawNum = numMatch[0];
  
  // 🌟 修复逻辑：通过最后一位标点符号后面的数字长度，来判断它的真实身份
  const lastPuncIdx = Math.max(rawNum.lastIndexOf('.'), rawNum.lastIndexOf(','));
  
  if (lastPuncIdx !== -1) {
    const afterPunc = rawNum.substring(lastPuncIdx + 1);
    if (afterPunc.length === 3) {
      // 后面有3位数字，它一定是千位分隔符 (例如：1,500 或 1.500)
      rawNum = rawNum.replace(/[,.]/g, '');
    } else {
      // 后面只有1或2位数字，它是小数点 (例如：499,99 或 499.99)
      const beforePunc = rawNum.substring(0, lastPuncIdx).replace(/[,.]/g, '');
      rawNum = beforePunc + '.' + afterPunc;
    }
  }

  const number = parseFloat(rawNum) || 0;

  let currency = defaultCurrency;
  if (priceStr.toUpperCase().includes('USD')) {
    currency = 'USD';
  }
  
  return { number, currency };
}

module.exports = { extractIAPFromHTML, parsePrice };
