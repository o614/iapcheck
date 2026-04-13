// api/cron.js
const { SUPPORTED_APPS } = require('../lib/config');

export default async function handler(req, res) {
    // 基础安全校验，防止外人恶意触发你的定时任务
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    const host = req.headers.host || process.env.VERCEL_URL;
    const protocol = host.includes('localhost') ? 'http' : 'https';

    // 遍历所有白名单应用，向我们自己的 compare 接口发送强制刷新指令
    for (const app of SUPPORTED_APPS) {
        try {
            // 发送带有 cron 密钥的请求，触发强制刷新并覆盖旧缓存
            await fetch(`${protocol}://${host}/api/compare?app=${app.id}&cron=${process.env.CRON_SECRET}`);
        } catch (e) {
            console.error(`Failed to trigger cron for ${app.name}`);
        }
        // 慢加载：每个 App 请求间隔 1.5 秒，绝对安全防封禁
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return res.status(200).json({ status: 'success', message: '所有应用缓存已在后台静默更新完毕' });
}
