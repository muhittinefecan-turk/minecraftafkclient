🤖 RoneBot Ordusu (v34) - Gelişmiş Minecraft Bot Altyapısı
RoneBot Ordusu, Minecraft sunucularında (Özellikle 1.20.4 Skyblock/Survival) birden fazla hesabı aynı anda yönetmenizi, güvenli bir şekilde AFK bırakmanızı ve otomatik depolama işlemleri yapmanızı sağlayan, Anti-Cheat (Hile Koruması) dostu bir Node.js bot sistemidir.

✨ Öne Çıkan Özellikler
🛡️ Tickrate & Anti-Ban Koruması: Botlar robot gibi değil, insan gibi davranır. İşlemler arasına Rastgele Gecikme (Random Jitter) ekleyerek sunucu korumalarına yakalanmaz.

🐢 Kaplumbağa Modu (Güvenli Depo): !pvbosalt ve !pvotodoldur komutları, sunucudan atılmamak (Kick yememek) için eşyaları yavaş ve tek tek işler.

🔐 Çift Şifre Sistemi: İster tüm botlar için tek şifre, ister belirli botlar için özel şifre tanımlayabilirsiniz.

🧠 Akıllı Takip & Savaş: Sahibini takip eder, mesafe açılırsa TPA atar. Saldırı modunda etraftaki yaratıkları temizler.

🛑 Heykel Modu: !dur komutu ile botlar tüm işlemleri (yürüme, takip, saldırı) durdurur ve olduğu yerde sabitlenir.

📱 Android & Portable Uyumlu: İster bilgisayarda, ister Termux ile Android telefonda, isterseniz .exe olarak kurulumsuz çalışır.

💬 Konsol Sohbeti: Terminal üzerinden !sohbet yazarak oyuna mesaj gönderebilirsiniz.

⚙️ Kurulum ve Ayarlar
Bu botu çalıştırmak için cihazınızda Node.js yüklü olmalıdır.

1. Gerekli Modülleri Yükleyin
Proje klasöründe terminali açın ve şu komutu girin:
npm install mineflayer mineflayer-pathfinder readline fs


2. Ayar Dosyasını Oluşturun (config.json)
Proje klasörüne config.json adında bir dosya oluşturun ve aşağıdaki şablonu yapıştırıp kendinize göre düzenleyin:

{
  "server": {
    "host": "play.ronemacraft.com",
    "port": 25565,
    "version": "1.20.4"
  },
  "auth": {
    "owner": "SİZİN_OYUN_İSMİNİZ",
    "global_password": "ORTAK_ŞİFRE",
    "specific_passwords": {
        "ozel_bot_adi_1": "bunun_sifresi_farkli123",
        "DepoBotu": "gizli_sifre456"
    }
  },
  "bots": [
    "BotHesap1",
    "BotHesap2",
    "BotHesap3",
    "ozel_bot_adi_1",
    "DepoBotu"
  ]
}
Not: specific_passwords kısmına şifresi farklı olan botları yazın. Listede olmayan botlar otomatik olarak global_password kullanır.


▶️ Başlatma
Bilgisayar (Windows/Mac/Linux)
Terminalden klasöre girip başlatın:
node bot.js


Android (Termux)
F-Droid üzerinden Termux indirin (Play Store sürümü çalışmaz).

Sırasıyla şu komutları girin:

pkg update && pkg upgrade -y
pkg install nodejs -y
termux-setup-storage
cd storage/downloads/BotKlasoru
node bot.js

Önemli: Telefon ekranı kapanınca botun durmaması için bildirim çubuğundan Termux'un "Acquire wakelock" butonuna basın.


🎮 Komut Listesi
Botları yönetmek için oyun içinden sahibin (owner) botlardan birine Özel Mesaj (Fısıltı/MSG) atması gerekir.

Komut,Açıklama
!durum,"Botların parasını, envanter doluluğunu ve PV (Sanal Sandık) durumunu raporlar."
!takip,Sahibini takip etmeye başlar. Mesafe çok açılırsa veya bot sizi göremezse TPA atar.
!git,Sahibinin yanına gider (TPA atar) ve orada bekler. Takip etmez.
!dur,"ACİL DURDURMA. Botlar tüm eylemleri iptal eder, takibi bırakır ve olduğu yerde kalır."
!afk,Botları /warp afk noktasına gönderir ve olduğu yerde zıplatır.
!saldır,Etraftaki düşman yaratıklara (Mob) saldırmaya başlar.
!pvotodoldur,Envanterdeki eşyaları sırasıyla PV'lere doldurur. (Yavaş & Güvenli Mod)
!pvbosalt,PV'lerdeki eşyaları alır ve sahibinin önüne atar. (Yavaş & Güvenli Mod)
!envanterbosalt,Botun üzerindeki eşyaları sahibinin önüne atar.
!paragönder,Bot üzerindeki tüm parayı sahibine (owner) gönderir.
!pvotokapat,Otomatik PV doldurma döngüsünü kapatır.

🖥️ Konsol Komutları
Bot çalışırken siyah ekrana (terminale) yazabileceğiniz komutlar:

!sohbet Merhaba Dünya -> Tüm botlar adına değil, sistem üzerinden oyuna mesaj gönderir (Botun chat fonksiyonunu kullanır).
!durum -> Konsol üzerinden rapor ister.

⚠️ Yasal Uyarı
Bu yazılım eğitim ve test amaçlı geliştirilmiştir. Sunucuların kurallarına uymak kullanıcının sorumluluğundadır. Çoklu hesap (Multi-account) kullanımı bazı sunucularda yasak olabilir. Oluşabilecek engellemelerden (Ban/Mute) geliştirici sorumlu değildir.

Muhittin Efecan Türk.
