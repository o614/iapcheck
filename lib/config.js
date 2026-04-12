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
  'ARS': 0.0085
};

// 🌟 全新升级：我们自己维护的 App 核心数据库（精确到 ID，彻底告别盲搜）
const SUPPORTED_APPS = [
  { id: '6448311069', name: 'ChatGPT', developer: 'OpenAI', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/95/9b/a6/959ba6d5-4523-bd77-0d92-ec7f3ca69db0/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/100x100bb.jpg' },
  { id: '1645009083', name: 'Claude', developer: 'Anthropic PBC', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/c1/9f/fa/c19ffaf2-0fcb-8fde-e1cb-56f9f3032549/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/100x100bb.jpg' },
  { id: '324684580', name: 'Spotify', developer: 'Spotify', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/21/ee/ff/21eeffb0-bd5b-5942-5fba-03619ea019a8/AppIcon-0-0-1x_U007emarketing-0-10-0-85-220.png/100x100bb.jpg' },
  { id: '686449807', name: 'Telegram', developer: 'Telegram FZ-LLC', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/a4/09/b3/a409b30c-2559-994c-8bb2-f8cce06c9a93/AppIcon-1x_U007emarketing-0-7-0-85-220.png/100x100bb.jpg' },
  { id: '364709193', name: 'Netflix', developer: 'Netflix, Inc.', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/80/7e/ab/807eab79-11ba-b2cb-4235-ef6daeeb8e86/AppIcon-0-0-1x_U007emarketing-0-10-0-85-220.png/100x100bb.jpg' },
  { id: '544007664', name: 'YouTube', developer: 'Google LLC', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/e5/22/0f/e5220fa6-7df5-8ed5-4309-808fbca4ed37/AppIcon-0-0-1x_U007emarketing-0-10-0-85-220.png/100x100bb.jpg' },
  { id: '897362505', name: 'Canva', developer: 'Canva', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/cd/66/ec/cd66ecc9-e6ce-4680-e837-a169b1227091/AppIcon-1x_U007emarketing-0-7-0-85-220.png/100x100bb.jpg' },
  { id: '570060128', name: 'Duolingo', developer: 'Duolingo', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4a/c3/82/4ac38206-8d18-df8d-e5ee-1bd61b5897c4/AppIcon-1x_U007emarketing-0-7-0-85-220.png/100x100bb.jpg' },
  { id: '1640280227', name: 'Poe', developer: 'Quora, Inc.', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/21/df/23/21df2302-d961-0b5c-42c2-8dfd0e6ba0ec/AppIcon-1x_U007emarketing-0-7-0-85-220.png/100x100bb.jpg' },
  { id: '985746746', name: 'Discord', developer: 'Discord, Inc.', icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/10/7c/de/107cdeeb-2f08-30ad-29de-b2302a5015ff/AppIcon-0-0-1x_U007emarketing-0-10-0-85-220.png/100x100bb.jpg' }
];

module.exports = { REGIONS, CURRENCY_RATES, SUPPORTED_APPS };
