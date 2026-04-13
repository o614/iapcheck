// scripts/sync.js
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {} // 本地测试时加载环境变量
const { kv } = require('@vercel/kv');
const { REGIONS, SUPPORTED_APPS, FALLBACK_RATES } = require('../lib/config');
const { fetchRegionData } = require('../lib/fetcher');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('🚀 开始执行全局后台慢加载抓取任务...\n');

    // 1. 获取最新大盘汇率
    let liveRates = FALLBACK_RATES;
    try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/CNY');
        liveRates = (await rateRes.json()).rates;
        console.log('✅ 实时汇率获取成功');
    } catch(e) {
        console.log('⚠️ 实时汇率获取失败，使用备用汇率');
    }

    // 2. 遍历所有白名单 App
    for (let app of SUPPORTED_APPS) {
        console.log(`\n📦 正在处理: ${app.name}`);
        
        // 获取最新高清图标
        try {
            const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${app.id}&country=us`);
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
                const r = itunesData.results[0];
                app.icon = r.artworkUrl512 || (r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '512x512bb') : null);
                app.priceStr = r.formattedPrice || (r.price === 0 ? '免费' : `¥${r.price}`);
            }
        } catch(e) {}

        const allRegionData = {};
        let dataChanged = false;

        // 🌟 核心：一个国家一个国家的查
        for (const region of REGIONS) {
            console.log(`   📍 爬取 ${region.name}...`);
            const newData = await fetchRegionData(app.id, region);
            const rawCacheKey = `raw:${app.id}:${region.code}`;

            if (!newData) {
                console.log(`      -> 异常，使用历史缓存兜底`);
                allRegionData[region.code] = await kv.get(rawCacheKey) || [];
            } else {
                const oldData = await kv.get(rawCacheKey);
                // 🌟 核心：对比数据，没变化就不写入，节省 KV 额度
                if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
                    console.log(`      -> ✨ 数据有更新，写入缓存！`);
                    await kv.set(rawCacheKey, newData);
                    dataChanged = true;
                } else {
                    console.log(`      -> ⏸️ 数据无变化，跳过`);
                }
                allRegionData[region.code] = newData;
            }
            
            // 查完一个国家，强制休息 1.5 秒，这辈子都不可能被苹果封禁
            await sleep(1500);
        }

        // 3. 组装最终供前台读取的 JSON (不管数据变没变，因为汇率每天在变，都要重新算一遍人民币价格)
        console.log(`   ⚙️ 组装比价表与汇率转换...`);
        const byItem = {};
        const byRegion = {};

        Object.keys(allRegionData).forEach(regionCode => {
            const iapList = allRegionData[regionCode];
            const regionObj = REGIONS.find(r => r.code === regionCode);
            
            const processedIaps = iapList.map(iap => {
                let cnyPrice = 0;
                if (iap.currency === 'CNY') { cnyPrice = iap.rawNumber; } 
                else if (liveRates[iap.currency]) { cnyPrice = iap.rawNumber / liveRates[iap.currency]; }
                return { ...iap, cnyPrice: parseFloat(cnyPrice.toFixed(2)) };
            }).filter(iap => iap.cnyPrice > 0);

            processedIaps.sort((a, b) => a.cnyPrice - b.cnyPrice);

            const nameCountMap = {};
            const finalIaps = processedIaps.map(iap => {
                const count = (nameCountMap[iap.name] || 0) + 1;
                nameCountMap[iap.name] = count;
                const uniqueName = count > 1 ? `${iap.name} #${count}` : iap.name;
                return { ...iap, uniqueName };
            });

            byRegion[regionCode] = { name: regionObj.name, iaps: finalIaps };

            finalIaps.forEach(iap => {
                if (!byItem[iap.uniqueName]) byItem[iap.uniqueName] = [];
                byItem[iap.uniqueName].push({
                    regionCode: regionCode, regionName: regionObj.name,
                    originalPrice: iap.originalPrice, cnyPrice: iap.cnyPrice
                });
            });
        });

        Object.keys(byItem).forEach(key => byItem[key].sort((a, b) => a.cnyPrice - b.cnyPrice));

        // 覆盖最终供前台读取的缓存
        await kv.set(`compare:final:${app.id}`, { app, compareData: { byItem, byRegion } });
        console.log(`✅ ${app.name} 处理完毕！\n`);
    }

    console.log('🎉 所有白名单应用后台更新完成！');
}

main().catch(console.error);
