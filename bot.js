const mineflayer = require('mineflayer');
const config = require('./config.json');

// --- BOT OLUŞTURMA FONKSİYONU ---
function baslat(botIsmi) {
    const bot = mineflayer.createBot({
        host: config.server.host,
        port: config.server.port,
        version: config.server.version,
        username: botIsmi
    });

    // --- OYUNA GİRİNCE ---
    bot.on('spawn', () => {
        console.log(`[${botIsmi}] Oyuna girdi!`);

        // 1. Adım: 5 saniye sonra Skyblock'a git
        setTimeout(() => {
            bot.chat('/opskyblock');
            console.log(`[${botIsmi}] Skyblock'a geçiliyor...`);
        }, 5000);

        // 2. Adım: 10 saniye sonra Sana TPA at
        setTimeout(() => {
            bot.chat(`/tpa ${config.auth.owner}`);
            console.log(`[${botIsmi}] Patron'a TPA atıldı.`);
        }, 10000);

        // 3. Adım: Anti-AFK (Sürekli zıpla)
        setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 1000);
        }, 30000);
    });

    // --- GİRİŞ & KAYIT ---
    bot.on('message', (jsonMsg) => {
        const mesaj = jsonMsg.toString().toLowerCase();
        // Şifre: Özel şifre varsa onu, yoksa genel şifreyi kullan
        const sifre = config.auth.specific_passwords[botIsmi] || config.auth.global_password;

        if (mesaj.includes('/login') || mesaj.includes('giriş')) bot.chat(`/login ${sifre}`);
        if (mesaj.includes('/register') || mesaj.includes('kayıt')) bot.chat(`/register ${sifre} ${sifre}`);
    });

    // --- HATA & YENİDEN BAĞLANMA ---
    bot.on('end', () => {
        console.log(`[${botIsmi}] Bağlantı koptu. 10sn sonra tekrar deneniyor...`);
        setTimeout(() => baslat(botIsmi), 10000);
    });
    
    bot.on('error', (err) => console.log(`[HATA] ${err.message}`));
}

// --- TÜM BOTLARI SIRAYLA BAŞLAT ---
console.log('Bot ordusu hazırlanıyor...');
config.bots.forEach((isim, index) => {
    setTimeout(() => baslat(isim), index * 5000); // Her bot arası 5 saniye bekle
});
