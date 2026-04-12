// lib/config.js

const REGIONS = [
  { code: 'cn', currency: 'CNY', symbol: '¥', name: '中国', rate: 1.0000 },
  { code: 'us', currency: 'USD', symbol: '$', name: '美国', rate: 7.2300 },
  { code: 'jp', currency: 'JPY', symbol: '¥', name: '日本', rate: 0.0475 },
  { code: 'tr', currency: 'TRY', symbol: '₺', name: '土耳其', rate: 0.2250 },
  { code: 'ng', currency: 'NGN', symbol: '₦', name: '尼日利亚', rate: 0.0062 },
  { code: 'eg', currency: 'EGP', symbol: 'E£', name: '埃及', rate: 0.1520 },
  { code: 'pk', currency: 'PKR', symbol: '₨', name: '巴基斯坦', rate: 0.0260 },
  { code: 'in', currency: 'INR', symbol: '₹', name: '印度', rate: 0.0860 },
  { code: 'br', currency: 'BRL', symbol: 'R$', name: '巴西', rate: 1.4200 },
  { code: 'ar', currency: 'ARS', symbol: '$', name: '阿根廷', rate: 0.0085 }
];

const HOT_APPS = [
  'ChatGPT', 'Claude', 'Poe', 'Telegram Messenger', 'Discord', 
  'Spotify', 'YouTube', 'Netflix', 'Canva', 'Duolingo'
];

module.exports = { REGIONS, HOT_APPS };
