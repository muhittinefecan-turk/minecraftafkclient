const mineflayer = require('mineflayer');
const readline = require('readline'); // Konsol okumak için gerekli modül
let config;

// --- AYARLARI YÜKLE ---
try {
    config = require('./config.json');
    console.log(`\x1b[32m[SİSTEM]\x1b[0m Ayarlar başarıyla yüklendi: ${config.bot_ismi}`);
} catch (e) {
    console.log(`\x1b[41m[HATA]\x1b[0m config.json dosyası bulunamadı!`);
    process.exit(1);
}

// Bot değişkenini dışarıda tanımlıyoruz ki konsol erişebilsin
let bot;

// --- KONSOL OKUMA SİSTEMİ (!sohbet İÇİN) ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    // Gelen komut !sohbet ile başlıyor mu?
    if (input.startsWith('!sohbet ')) {
        const mesaj = input.replace('!sohbet ', ''); // Komutu sil, sadece mesajı al
        
        if (bot && bot.entity) { // Bot oyunda mı kontrol et
            bot.chat(mesaj);
            console.log(`\x1b[35m[KONSOL -> OYUN]\x1b[0m ${mesaj}`);
        } else {
            console.log(`\x1b[31m[HATA]\x1b[0m Bot henüz oyuna girmedi, mesaj gönderilemedi.`);
        }
    }
});

function startBot() {
    bot = mineflayer.createBot({
        host: config.ip,
        port: config.port,
        version: config.version,
        username: config.bot_ismi
    });

    // --- GİRİŞ & KAYIT SİSTEMİ ---
    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString();
        // Şifre isteyince girer
        if (msg.includes('/login') || msg.toLowerCase().includes('giriş yap')) {
            console.log(`\x1b[36m[BOT]\x1b[0m Şifre giriliyor...`);
            bot.chat(`/login ${config.sifre}`);
        }
        // Kayıtlı değilse kayıt olur
        if (msg.includes('/register') || msg.toLowerCase().includes('kayıt ol')) {
            console.log(`\x1b[36m[BOT]\x1b[0m Kayıt olunuyor...`);
            bot.chat(`/register ${config.sifre} ${config.sifre}`);
        }
    });

    // --- OYUNA GİRİNCE YAPILACAKLAR ---
    let isSpawned = false;
    bot.on('spawn', async () => {
        if (isSpawned) return;
        isSpawned = true;

        console.log(`\x1b[32m[BAĞLANTI]\x1b[0m Sunucuya girildi!`);
        console.log(`\x1b[90m[BİLGİ]\x1b[0m Sohbet etmek için konsola: !sohbet Mesajınız yazın.`);

        // 1. Adım: 5 saniye bekle -> /opskyblock yaz
        setTimeout(() => {
            console.log(`\x1b[33m[İŞLEM]\x1b[0m /opskyblock komutu gönderiliyor...`);
            bot.chat('/opskyblock');
        }, 5000);

        // 2. Adım: 10 saniye bekle -> Sahibine TPA at
        setTimeout(() => {
            console.log(`\x1b[35m[TPA]\x1b[0m Sahibim (${config.sahip})'e ışınlanma isteği atılıyor...`);
            bot.chat(`/tpa ${config.sahip}`);
        }, 10000);
        
        // 3. Adım: Anti-AFK
        setInterval(() => {
            if(bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        }, 30000);
    });

    // --- DÜŞERSE TEKRAR BAĞLAN ---
    bot.on('end', (reason) => {
        console.log(`\x1b[31m[KOPMA]\x1b[0m Bağlantı koptu: ${reason}. 10 saniye sonra tekrar deneniyor...`);
        setTimeout(startBot, 10000);
    });

    bot.on('error', (err) => console.log(`[HATA] ${err.message}`));
}

startBot();
