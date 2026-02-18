const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const readline = require('readline'); 
const fs = require('fs');

// --- 🛡️ GLOBAL HATA KALKANI (ÇÖKMEYİ ÖNLER) ---
process.on('uncaughtException', (err) => {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.message.includes('socketClosed')) return; 
    console.log(`\x1b[31m[SİSTEM HATASI]\x1b[0m Beklenmeyen bir hata: ${err.message}`);
});

// --- ⚙️ AYARLARI YÜKLE (CONFIG.JSON) ---
let config;
try {
    config = require('./config.json');
    console.log(`\x1b[32m[SİSTEM]\x1b[0m Ayarlar config.json dosyasından yüklendi.`);
    console.log(`\x1b[36m[BİLGİ]\x1b[0m Toplam ${config.bots.length} bot başlatılacak.`);
} catch (error) {
    console.error(`\x1b[41m[HATA]\x1b[0m 'config.json' dosyası bulunamadı!`);
    process.exit(1);
}

// --- SABİT AYARLAR ---
const serverConfig = config.server;
const anaHesap = config.auth.owner; 
const botArmy = [];

// --- YARDIMCI: AKILLI ŞİFRE SEÇİCİ ---
function getBotPassword(username) {
    // 1. Özel şifre var mı bak
    if (config.auth.specific_passwords && config.auth.specific_passwords[username]) {
        return config.auth.specific_passwords[username];
    }
    // 2. Yoksa genel şifreyi kullan
    return config.auth.global_password;
}

// --- YARDIMCI: RASTGELE GECİKME (Anti-Ban) ---
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const safeDelay = () => randomDelay(4000, 5000); // Çok güvenli mod (4-5 saniye)

function formatMoney(num) {
    if (num >= 1e15) return (num / 1e15).toFixed(1) + ' Katrilyon'; 
    if (num >= 1e12) return (num / 1e12).toFixed(1) + ' Trilyon'; 
    if (num >= 1e9) return (num / 1e9).toFixed(1) + ' Milyar'; 
    if (num >= 1e6) return (num / 1e6).toFixed(1) + ' Milyon'; 
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' Bin'; 
    return num.toString();
}

function ozelKickMesajCozucu(reason) {
    if (!reason) return "Sebep Belirtilmedi";
    if (typeof reason === 'string') {
        try { const parsed = JSON.parse(reason); return ozelKickMesajCozucu(parsed); } catch (e) { return reason; }
    }
    let message = "";
    if (reason.text) message += reason.text;
    if (reason.extra && Array.isArray(reason.extra)) {
        reason.extra.forEach(part => {
            if (typeof part === 'string') message += part;
            else if (part.text) message += part.text;
        });
    }
    if (reason.translate) message += reason.translate;
    return message || JSON.stringify(reason);
}

function getInventoryStatus(bot) {
    let occupied = 0;
    for (let i = 9; i <= 44; i++) { if (bot.inventory.slots[i] !== null) occupied++; }
    const percent = Math.round((occupied / 36) * 100);
    return { count: occupied, percent: percent };
}

// --- ANA BOT FONKSİYONU ---
function startBot(botName) {
    const botPassword = getBotPassword(botName);
    
    let currentState = 'bekle'; 
    let isBusy = false;
    let actionInterval = null;
    let checkingMoneyForPay = false; 
    let hasSpawned = false; 
    let autoPvFillActive = true; 
    
    const bot = mineflayer.createBot({ 
        host: serverConfig.host,
        port: serverConfig.port,
        version: serverConfig.version,
        username: botName
    });
    
    bot.loadPlugin(pathfinder);
    bot.currentMoney = 0; 
    bot.username = botName; // Elle atama
    botArmy.push(bot);

    // --- 🧠 BEYİN: KOMUT İŞLEME MERKEZİ ---
    bot.executeCommand = function(cmdPart) {
        if (!hasSpawned) {
            console.log(`\x1b[90m[${bot.username} BEKLİYOR]\x1b[0m Henüz oyuna tam girmedi.`);
            return;
        }

        const args = cmdPart.split(' ');
        const command = args[0].toLowerCase();

        console.log(`\x1b[35m[${bot.username} KOMUT]\x1b[0m İşleniyor: ${cmdPart}`);

        if (command === '!yardım') {
            bot.chat(`/msg ${anaHesap} Komutlar: !dur, !pvbosalt, !pvdoldur, !pvotodoldur, !pvotokapat, !envanterbosalt, !durum, !git, !takipet, !afk, !saldır`);
        }
        else if (command === '!sohbet') { 
            const t = cmdPart.replace('!sohbet', '').trim(); 
            if (t) bot.chat(t); 
        }
        else if (command === '!paragönder') { 
            checkingMoneyForPay = true; bot.chat('/money'); setTimeout(() => checkingMoneyForPay = false, 5000); 
        }
        else if (command === '!durum') {
            bot.chat('/money'); 
            (async () => {
                let pvText = "PV Taranamadı (Meşgul)";
                if (!isBusy) {
                    isBusy = true; 
                    pvText = await scanAllPVs(bot);
                    isBusy = false; 
                }

                const invStats = getInventoryStatus(bot);
                const otoDurum = autoPvFillActive ? "AÇIK" : "KAPALI";
                const rapor = `Mod: ${currentState.toUpperCase()} | Env: %${invStats.percent} | Para: ${formatMoney(bot.currentMoney)} | OtoPV: ${otoDurum}`;
                
                console.log(`\x1b[32m[${bot.username} RAPOR]\x1b[0m ${rapor}`);
                bot.chat(`/msg ${anaHesap} [DURUM] ${rapor}`);
                setTimeout(() => { bot.chat(`/msg ${anaHesap} [PV] ${pvText}`); }, 3000);
            })();
        }
        else if (command === '!pvotodoldur') {
            autoPvFillActive = true;
            console.log(`\x1b[32m[${bot.username} AYAR]\x1b[0m Otomatik PV Doldurma AKTİF.`);
            bot.chat(`/msg ${anaHesap} 15 Dakikada bir otomatik PV doldurma AKTIF!`);
        }
        else if (command === '!pvotokapat') {
            autoPvFillActive = false;
            console.log(`\x1b[31m[${bot.username} AYAR]\x1b[0m Otomatik PV Doldurma KAPATILDI.`);
            bot.chat(`/msg ${anaHesap} Otomatik PV doldurma KAPATILDI!`);
        }
        else if (command === '!pvdoldur') {
            if (!isBusy) { fillPV(bot); }
        }
        else if (command === '!pvbosalt') {
            if (!isBusy) { emptyPVAndDropToBoss(bot); }
        }
        else if (command === '!envanterbosalt') {
            if (!isBusy) { bringItemsToBoss(bot); }
        }
        else if (command === '!afk') {
            currentState = 'afk'; bot.chat('/warp afk');
            setTimeout(() => walkToTarget(bot, -1076, 140, 507), 5000);
        }
        else if (command === '!git') {
            isBusy = false;
            currentState = 'bekle'; goToBossAndWait(bot);
        }
        else if (command === '!dur') {
            console.log(`\x1b[31m[${bot.username} DUR]\x1b[0m Tüm işlemler durduruldu.`);
            bot.chat(`/msg ${anaHesap} Durdum patron!`);
            currentState = 'dur';
            isBusy = false;
            if (actionInterval) clearInterval(actionInterval);
            bot.pathfinder.setGoal(null);
        }
        else if (command === '!takipet' || command === '!takip') {
            isBusy = false; 
            console.log(`\x1b[33m[${bot.username} TAKİP]\x1b[0m Takip modu başlatıldı.`);
            currentState = 'takip'; 
            startFollowing(bot);
        }
        else if (command === '!saldır') {
            currentState = 'saldir'; startCombatLoop(bot);
        }
    };

    bot.on('title', (text) => {
        const titleCaptcha = text.toString().match(/\b\d{4,10}\b/);
        if (titleCaptcha) setTimeout(() => bot.chat(titleCaptcha[0]), 1500);
    });

    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString();
        
        // Şifre Giriş (Config'den çekilen şifre)
        if (msg.includes('/login')) bot.chat(`/login ${botPassword}`);
        if (msg.includes('/register')) bot.chat(`/register ${botPassword} ${botPassword}`);
        
        // Captcha
        const chatCaptcha = msg.match(/\b\d{4,10}\b/); 
        if ((msg.toLowerCase().includes('doğrula') || msg.toLowerCase().includes('kod') || msg.toLowerCase().includes('yaz')) && chatCaptcha) {
            setTimeout(() => bot.chat(chatCaptcha[0]), 1500);
        }

        // Para Okuma
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('bakiye') || lowerMsg.includes('balance') || lowerMsg.includes('tl') || lowerMsg.includes('$') || lowerMsg.includes('coin')) {
            const bakiyeMatch = msg.match(/[\d.,]+/);
            if (bakiyeMatch) {
                const temizBakiye = parseInt(bakiyeMatch[0].replace(/[^0-9]/g, ''));
                if (temizBakiye >= 0) {
                    bot.currentMoney = temizBakiye; 
                    if (checkingMoneyForPay && temizBakiye > 0) {
                        bot.chat(`/pay ${anaHesap} ${temizBakiye}`);
                        checkingMoneyForPay = false; 
                    }
                }
            }
        }

        // Fısıltı Komutları (Sadece Patron'dan gelenler)
        const isWhisper = msg.includes('->') || msg.includes('fısıldıyor') || msg.includes('From') || msg.includes('Mesaj');
        if (msg.includes(anaHesap) && msg.includes('!') && isWhisper) {
            const cmdPart = msg.substring(msg.indexOf('!')).trim();
            const myIndex = botArmy.findIndex(b => b.username === botName);
            const delay = (myIndex > -1 ? myIndex : 0) * 2000; 
            setTimeout(() => { bot.executeCommand(cmdPart); }, delay);
        }
    });

    bot.on('spawn', async () => {
        if (hasSpawned) {
            if (currentState === 'afk') walkToTarget(bot, -1076, 140, 507);
            return; 
        }
        hasSpawned = true; 

        console.log(`\x1b[32m[${bot.username} BAĞLANTI]\x1b[0m Sunucuya girdi.`);
        await new Promise(r => setTimeout(r, 6000));
        bot.chat('/opskyblock');

        // KEEP-ALIVE
        setInterval(() => {
            if (!isBusy) { bot.look(bot.entity.yaw, bot.entity.pitch + 0.01); }
        }, 45000);

        // OTO PV DOLDURMA (15 DK)
        setInterval(() => {
            if (isBusy || !autoPvFillActive) return;
            fillPV(bot);
        }, 900000); 

        // OTO RAPOR VE PARA (10 DK)
        setInterval(() => {
            if (isBusy) return;
            bot.chat('/money'); 
            setTimeout(() => {
                const invStats = getInventoryStatus(bot);
                const rapor = `Mod: ${currentState.toUpperCase()} | Env: %${invStats.percent} (${invStats.count}/36) | Para: ${formatMoney(bot.currentMoney)}`;
                console.log(`\x1b[36m[${bot.username} OTO-RAPOR]\x1b[0m ${rapor}`);
            }, 2000);
        }, 600000); 

        // OTO PARA GÖNDERME (12 SAAT)
        setInterval(() => { bot.chat(`/pay ${anaHesap} 700000000000000`); }, 43200000);
    });

    // --- YETENEK FONKSİYONLARI ---
    async function walkToTarget(bot, x, y, z) {
        if (actionInterval) clearInterval(actionInterval);
        const defaultMove = new Movements(bot);
        defaultMove.canDig = false; 
        bot.pathfinder.setMovements(defaultMove);
        try {
            await bot.pathfinder.goto(new goals.GoalBlock(x, y, z));
            actionInterval = setInterval(() => {
                if (currentState === 'afk' && !isBusy) { bot.setControlState('jump', true); setTimeout(() => bot.setControlState('jump', false), 500); }
                if (currentState === 'kos' && !isBusy) attackNearest(bot);
            }, 45000);
        } catch (err) {}
    }

    async function goToBossAndWait(bot) {
        if (actionInterval) clearInterval(actionInterval);
        bot.pathfinder.setGoal(null); 
        
        const targetPlayer = bot.players[anaHesap]?.entity;
        if (!targetPlayer) {
            bot.chat(`/tpa ${anaHesap}`);
        } else {
            const defaultMove = new Movements(bot);
            defaultMove.canDig = false;
            bot.pathfinder.setMovements(defaultMove);
            try {
                const goal = new goals.GoalNear(targetPlayer.position.x, targetPlayer.position.y, targetPlayer.position.z, 2);
                await bot.pathfinder.goto(goal);
                await bot.lookAt(targetPlayer.position.offset(0, targetPlayer.height, 0));
            } catch (err) {}
        }
    }

    function startFollowing(bot) {
        if (actionInterval) clearInterval(actionInterval);
        const defaultMove = new Movements(bot);
        defaultMove.canDig = false; 
        bot.pathfinder.setMovements(defaultMove);

        actionInterval = setInterval(() => {
            if (currentState !== 'takip' || isBusy) return;
            const player = bot.players[anaHesap]?.entity;
            if (!player) {
                bot.pathfinder.setGoal(null);
                console.log(`\x1b[33m[${bot.username} TAKİP]\x1b[0m Patronu göremiyorum, TPA atıyorum...`);
                bot.chat(`/tpa ${anaHesap}`);
            } else {
                const distance = bot.entity.position.distanceTo(player.position);
                if (distance > 3) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(player, 2), true);
                }
            }
        }, 4000); 
    }

    function startCombatLoop(bot) {
        if (actionInterval) clearInterval(actionInterval);
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        actionInterval = setInterval(async () => {
            if (currentState !== 'saldir' || isBusy) return;
            const mob = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16);
            if (mob) {
                bot.pathfinder.setGoal(new goals.GoalFollow(mob, 1.5), true);
                if (mob.position.distanceTo(bot.entity.position) < 4) bot.attack(mob);
            }
        }, 1000);
    }

    function attackNearest(bot) {
        const mob = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 4);
        if (mob) bot.attack(mob);
    }

    // --- KAPLUMBAĞA MODU: PV FONKSİYONLARI ---
    async function scanAllPVs(bot) {
        let pvReport = "";
        let totalPvItems = 0;
        for (let pvNum = 1; pvNum <= 5; pvNum++) {
            bot.chat(`/pv ${pvNum}`);
            try {
                const window = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { bot.removeListener('windowOpen', onWindowOpen); resolve(null); }, 6000);
                    function onWindowOpen(win) { clearTimeout(timeout); bot.removeListener('windowOpen', onWindowOpen); resolve(win); }
                    bot.on('windowOpen', onWindowOpen);
                });
                if (window) {
                    await new Promise(r => setTimeout(r, 2000));
                    let occupiedSlots = 0;
                    for(let i = 0; i < window.inventoryStart; i++) { if (window.slots[i] !== null) occupiedSlots++; }
                    const percent = Math.round((occupiedSlots / window.inventoryStart) * 100);
                    pvReport += `[PV${pvNum}: %${percent}] `;
                    totalPvItems += occupiedSlots;
                    bot.closeWindow(window);
                } else { pvReport += `[PV${pvNum}: --] `; }
            } catch (err) { pvReport += `[PV${pvNum}: --] `; }
            await new Promise(r => setTimeout(r, 4000)); 
        }
        return `${pvReport.trim()} | Toplam Dolu Slot: ${totalPvItems}`;
    }

    async function fillPV(bot) {
        if (isBusy) return;
        isBusy = true;
        bot.pathfinder.setGoal(null); 
        for (let pvNum = 1; pvNum <= 5; pvNum++) {
            const invStats = getInventoryStatus(bot);
            if (invStats.count === 0) break;

            bot.chat(`/pv ${pvNum}`);
            try {
                const window = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { bot.removeListener('windowOpen', onWindowOpen); resolve(null); }, 8000); 
                    function onWindowOpen(win) { clearTimeout(timeout); bot.removeListener('windowOpen', onWindowOpen); resolve(win); }
                    bot.on('windowOpen', onWindowOpen);
                });
                if (window) {
                    await new Promise(r => setTimeout(r, 3000)); 
                    const itemsToDeposit = window.items().filter(item => item.slot >= window.inventoryStart);
                    for (const item of itemsToDeposit) {
                        try { 
                            await bot.clickWindow(item.slot, 0, 1); 
                            await new Promise(r => setTimeout(r, safeDelay())); 
                        } catch (err) {}
                    }
                    bot.closeWindow(window);
                }
                await new Promise(r => setTimeout(r, 5000)); 
            } catch (err) {}
        }
        isBusy = false;
        if (currentState === 'afk') { bot.chat('/warp afk'); setTimeout(() => walkToTarget(bot, -1076, 140, 507), 6000); }
        else if (currentState === 'takip') { bot.chat(`/tpa ${anaHesap}`); }
    }

    async function emptyPVAndDropToBoss(bot) {
        if (isBusy) return;
        isBusy = true; 
        bot.pathfinder.setGoal(null);
        let targetPlayer = bot.players[anaHesap]?.entity;
        if (!targetPlayer) bot.chat(`/tpa ${anaHesap}`);
        
        let reached = false;
        let followGoalSet = false;
        for (let i = 0; i < 20; i++) {
            targetPlayer = bot.players[anaHesap]?.entity;
            if (targetPlayer) {
                if (bot.entity.position.distanceTo(targetPlayer.position) <= 3) { reached = true; bot.pathfinder.setGoal(null); break; }
                else if (!followGoalSet) { bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, 2), true); followGoalSet = true; }
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (reached && targetPlayer) {
            try { await bot.lookAt(targetPlayer.position.offset(0, targetPlayer.height, 0)); await new Promise(r => setTimeout(r, 1500)); } catch(e) {}
            
            for (let pvNum = 1; pvNum <= 5; pvNum++) {
                const invStatus = getInventoryStatus(bot);
                if (invStatus.percent >= 90) {
                    console.log(`\x1b[33m[${bot.username} PV]\x1b[0m Envanter dolu! Önce eldekiler boşaltılıyor.`);
                } else {
                    bot.chat(`/pv ${pvNum}`);
                    try {
                        const window = await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => { bot.removeListener('windowOpen', onWindowOpen); resolve(null); }, 8000); 
                            function onWindowOpen(win) { clearTimeout(timeout); bot.removeListener('windowOpen', onWindowOpen); resolve(win); }
                            bot.on('windowOpen', onWindowOpen);
                        });

                        if (window) {
                            await new Promise(r => setTimeout(r, 3000)); 
                            const pvItems = window.items().filter(item => item.slot < window.inventoryStart);
                            for (const item of pvItems) {
                                if (getInventoryStatus(bot).percent >= 95) break;
                                try { 
                                    console.log(`\x1b[36m[${bot.username}]\x1b[0m PV'den eşya alınıyor...`);
                                    await bot.clickWindow(item.slot, 0, 1); 
                                    await new Promise(r => setTimeout(r, 4000)); 
                                } catch (err) {}
                            }
                            bot.closeWindow(window);
                            await new Promise(r => setTimeout(r, 3000)); 
                        }
                    } catch (err) {}
                }

                const itemsToToss = bot.inventory.items();
                if (itemsToToss.length > 0) {
                    for (const item of itemsToToss) {
                        try { 
                            await bot.tossStack(item); 
                            await new Promise(r => setTimeout(r, 4000)); 
                        } catch (err) {}
                    }
                }
                await new Promise(r => setTimeout(r, 5000)); 
            }
        } 
        isBusy = false; 
        if (currentState === 'afk') { bot.chat('/warp afk'); setTimeout(() => walkToTarget(bot, -1076, 140, 507), 6000); }
        else if (currentState === 'takip') { bot.chat(`/tpa ${anaHesap}`); }
    }

    async function bringItemsToBoss(bot) {
        if (isBusy) return;
        isBusy = true; 
        bot.pathfinder.setGoal(null);
        let targetPlayer = bot.players[anaHesap]?.entity;
        if (!targetPlayer) bot.chat(`/tpa ${anaHesap}`);
        let reached = false;
        let followGoalSet = false;
        for (let i = 0; i < 20; i++) {
            targetPlayer = bot.players[anaHesap]?.entity;
            if (targetPlayer) {
                if (bot.entity.position.distanceTo(targetPlayer.position) <= 3) { reached = true; bot.pathfinder.setGoal(null); break; } 
                else if (!followGoalSet) { bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, 2), true); followGoalSet = true; }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (reached && targetPlayer) {
            try { await bot.lookAt(targetPlayer.position.offset(0, targetPlayer.height, 0)); await new Promise(r => setTimeout(r, 1200)); } catch(e) {}
            const items = bot.inventory.items();
            for (const item of items) { try { await bot.tossStack(item); await new Promise(r => setTimeout(r, randomDelay(2000, 3000))); } catch (err) {} }
        } 
        isBusy = false; 
        if (currentState === 'afk') { bot.chat('/warp afk'); setTimeout(() => walkToTarget(bot, -1076, 140, 507), 6000); }
        else if (currentState === 'takip') { bot.chat(`/tpa ${anaHesap}`); }
    }

    bot.on('kicked', (reason) => {
        const temizSebep = ozelKickMesajCozucu(reason);
        console.log(`\x1b[41m[${bot.username} KICKED]\x1b[0m Sunucu botu attı! Sebep: ${temizSebep}`);
    });

    bot.on('error', (err) => { 
        if (!err.message.includes('packet_world_particles') && !err.message.includes('ECONNRESET')) {
            console.log(`\x1b[31m[${bot.username} SİSTEM]\x1b[0m Hata: ${err.message}`); 
        }
    });

    bot.on('end', (reason) => {
        console.log(`\x1b[31m[${bot.username} BAĞLANTI]\x1b[0m Sunucudan düştü. (Sebep: ${reason || 'Bilinmiyor'}) 20sn sonra yeniden bağlanacak.`);
        hasSpawned = false; 
        const index = botArmy.indexOf(bot);
        if (index > -1) botArmy.splice(index, 1);
        setTimeout(() => startBot(botName), 20000);
    });
}

// --- TÜM BOTLARI SIRAYLA BAŞLAT ---
config.bots.forEach((botName, index) => {
    setTimeout(() => startBot(botName), index * 20000);
});

// --- TERMİNAL KONTROL ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on('line', (input) => {
    const line = input.trim();
    if (line.startsWith('!') && line.length > 1 && !line.includes(' ')) {
        console.log(`\x1b[45m[MERKEZ]\x1b[0m Emir TÜM ORDUYA iletiliyor: ${line}`);
        botArmy.forEach((bot, index) => { setTimeout(() => { if (bot.executeCommand) bot.executeCommand(line); }, index * 2000); });
        
        if (line.toLowerCase() === '!durum') {
            setTimeout(() => {
                let totalMoney = 0;
                botArmy.forEach(b => { if (b.currentMoney) totalMoney += b.currentMoney; });
                const msg = `💰 ORDU TOPLAM KASASI: ${formatMoney(totalMoney)}`;
                console.log(`\x1b[42m[MERKEZ]\x1b[0m ${msg}`);
                if (botArmy.length > 0) botArmy[0].chat(`/msg ${anaHesap} [TOPLAM] ${msg}`);
            }, 30000); 
        }
    } 
    else if (line.includes(' !')) {
        const parts = line.split(' !');
        const targetName = parts[0].trim(); 
        const cmd = '!' + parts[1].trim();  
        const targetBot = botArmy.find(b => b.username === targetName);
        if (targetBot && targetBot.executeCommand) {
            console.log(`\x1b[46m[MERKEZ]\x1b[0m Emir SADECE ${targetName} adlı bota iletiliyor: ${cmd}`);
            targetBot.executeCommand(cmd);
        }
    }
});
