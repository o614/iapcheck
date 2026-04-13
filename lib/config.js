// lib/config.js

const REGIONS = [
  { code: 'cn', name: '中国', defaultCurrency: 'CNY' },
  { code: 'us', name: '美国', defaultCurrency: 'USD' },
  { code: 'hk', name: '香港', defaultCurrency: 'HKD' },
  { code: 'tw', name: '台湾', defaultCurrency: 'TWD' },
  { code: 'jp', name: '日本', defaultCurrency: 'JPY' },
  { code: 'kr', name: '韩国', defaultCurrency: 'KRW' },
  { code: 'tr', name: '土耳其', defaultCurrency: 'TRY' },
  { code: 'ng', name: '尼日利亚', defaultCurrency: 'NGN' },
  { code: 'eg', name: '埃及', defaultCurrency: 'EGP' },
  { code: 'pk', name: '巴基斯坦', defaultCurrency: 'PKR' },
  { code: 'in', name: '印度', defaultCurrency: 'INR' },
  { code: 'br', name: '巴西', defaultCurrency: 'BRL' },
  { code: 'ar', name: '阿根廷', defaultCurrency: 'ARS' }
];

const FALLBACK_RATES = {
  'CNY': 1.00, 'USD': 0.138, 'HKD': 1.08, 'TWD': 4.45, 'JPY': 21.05,
  'KRW': 188.5, 'TRY': 4.45, 'NGN': 161.2, 'EGP': 6.57, 'PKR': 38.4,
  'INR': 11.5, 'BRL': 0.70, 'ARS': 118.5
};

// 🌟 首页 Today 推荐应用
const SUPPORTED_APPS = [
  { id: '6448311069', name: 'ChatGPT', developer: 'OpenAI', bg: 'from-green-400 to-emerald-600', tag: 'AI TOOL' },
  { id: '1645009083', name: 'Claude', developer: 'Anthropic', bg: 'from-orange-400 to-red-500', tag: 'AI TOOL' },
  { id: '284815942', name: 'Gemini', developer: 'Google', bg: 'from-blue-400 to-purple-600', tag: 'AI TOOL' },
  { id: '1130498044', name: 'iCloud+', developer: 'Apple', bg: 'from-blue-300 to-blue-500', tag: 'STORAGE' },
  { id: '544007664', name: 'YouTube', developer: 'Google', bg: 'from-red-500 to-red-700', tag: 'VIDEO' },
  { id: '364709193', name: 'Netflix', developer: 'Netflix', bg: 'from-gray-800 to-black', tag: 'STREAMING' }
];

module.exports = { REGIONS, FALLBACK_RATES, SUPPORTED_APPS };
