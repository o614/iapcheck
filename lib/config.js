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

// 兜底汇率表 (1 CNY = 多少外币) - 仅在实时汇率 API 宕机时使用
const FALLBACK_RATES = {
  'CNY': 1.00,
  'USD': 0.138,
  'HKD': 1.08,
  'TWD': 4.45,
  'JPY': 21.05,
  'KRW': 188.5,
  'TRY': 4.45,
  'NGN': 161.2,
  'EGP': 6.57,
  'PKR': 38.4,
  'INR': 11.5,
  'BRL': 0.70,
  'ARS': 118.5
};

const SUPPORTED_APPS = [
  { id: '6448311069', name: 'ChatGPT', developer: 'OpenAI' },
  { id: '1645009083', name: 'Claude', developer: 'Anthropic PBC' },
  { id: '324684580', name: 'Spotify', developer: 'Spotify' },
  { id: '686449807', name: 'Telegram', developer: 'Telegram FZ-LLC' },
  { id: '364709193', name: 'Netflix', developer: 'Netflix, Inc.' },
  { id: '544007664', name: 'YouTube', developer: 'Google LLC' },
  { id: '897362505', name: 'Canva', developer: 'Canva' },
  { id: '570060128', name: 'Duolingo', developer: 'Duolingo' },
  { id: '1640280227', name: 'Poe', developer: 'Quora, Inc.' },
  { id: '985746746', name: 'Discord', developer: 'Discord, Inc.' }
];

module.exports = { REGIONS, FALLBACK_RATES, SUPPORTED_APPS };
