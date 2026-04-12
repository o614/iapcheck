// lib/config.js

const REGIONS = [
  { code: 'cn', name: '中国', flag: '🇨🇳' },
  { code: 'us', name: '美国', flag: '🇺🇸' },
  { code: 'jp', name: '日本', flag: '🇯🇵' },
  { code: 'tr', name: '土耳其', flag: '🇹🇷' },
  { code: 'ng', name: '尼日利亚', flag: '🇳🇬' },
  { code: 'eg', name: '埃及', flag: '🇪🇬' },
  { code: 'pk', name: '巴基斯坦', flag: '🇵🇰' },
  { code: 'in', name: '印度', flag: '🇮🇳' },
  { code: 'br', name: '巴西', flag: '🇧🇷' },
  { code: 'ar', name: '阿根廷', flag: '🇦🇷' }
];

// 核心安全汇率表 (1外币 = 多少人民币)
const CURRENCY_RATES = {
  'USD': 7.23, '$': 7.23,
  'CNY': 1.00, '¥': 1.00, 'RMB': 1.00,
  'JPY': 0.0475,
  'TRY': 0.225, 'TL': 0.225, '₺': 0.225,
  'NGN': 0.0062, '₦': 0.0062,
  'EGP': 0.152, 'E£': 0.152,
  'PKR': 0.026, 'Rs': 0.026,
  'INR': 0.086, '₹': 0.086,
  'BRL': 1.42, 'R$': 1.42,
  'ARS': 0.0085 // 如果阿根廷区罕见地使用了本地货币
};

module.exports = { REGIONS, CURRENCY_RATES };
