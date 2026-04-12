// lib/parser.js

function extractIAPFromHTML(html) {
  const startTag = '<script type="application/json" id="serialized-server-data">';
  const endTag = '</script>';
  const startIdx = html.indexOf(startTag);
  
  if (startIdx === -1) return [];

  const contentStart = startIdx + startTag.length;
  const endIdx = html.indexOf(endTag, contentStart);
  if (endIdx === -1) return [];

  const jsonStr = html.substring(contentStart, endIdx);
  
  try {
    const jsonData = JSON.parse(jsonStr);
    return findIAP(jsonData) || [];
  } catch (err) {
    console.error('JSON解析失败');
    return [];
  }
}

// 递归查找内购节点
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

// 从价格字符串中提取数字 (例如 "TRY 499.99" -> 499.99)
function extractNumber(priceStr) {
  if (!priceStr) return 0;
  // 去除所有非数字和非小数点的字符
  const numStr = priceStr.replace(/[^\d.,]/g, '').replace(/,/g, ''); 
  return parseFloat(numStr) || 0;
}

module.exports = { extractIAPFromHTML, extractNumber };
