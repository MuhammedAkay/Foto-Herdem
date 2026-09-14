# 📸 Foto Herdem

<p align="center">
  <img src="assets/logo.webp" alt="Foto Herdem" width="120">
</p>

<p align="center">
  <strong>Profesyonel fotoğrafçılık sitesi ve müşteri fotoğraf seçim sistemi</strong>
</p>

<p align="center">
  Mardin • Midyat • Düğün • Nişan • Söz • Kına • Dış Çekim • Özel Günler
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  <img src="https://img.shields.io/badge/Wasmer-4946DD?style=for-the-badge&logo=wasmer&logoColor=white" alt="Wasmer">
</p>

---

## ✨ Proje Hakkında

**Foto Herdem**, fotoğrafçılık hizmetlerini modern ve sade bir arayüzle tanıtmak için hazırlanmış web projesidir.

Proje yalnızca klasik bir tanıtım sitesi değildir. Aynı zamanda fotoğrafçı ile müşteri arasındaki **fotoğraf seçme sürecini dijitalleştiren bir müşteri seçim sistemi** içerir.

Müşteri kendisine verilen seçim kodu ve şifre ile özel albümüne giriş yapabilir, fotoğrafları inceleyebilir, belirlenen sayıda fotoğrafı seçebilir ve seçimlerini tek seferde gönderebilir. Yönetici ise bu süreci özel bir admin panelinden yönetir. 🎯

Site statik HTML/CSS/JS olarak çalışır; etkileşim ve veri tarafı **Supabase**, kod ve fotoğraf depolama tarafı **GitHub**, yayın tarafı ise **Wasmer** üzerindedir.

---

## 🚀 Öne Çıkan Özellikler

### 🌐 Ziyaretçi Sitesi

- 🏠 Modern ana sayfa
- 🖼️ Kategorili fotoğraf galerisi (paketlere göre filtreleme + lightbox)
- 📚 Albüm koleksiyonu
- 💍 Düğün, nişan, kına, dış çekim ve özel gün (bride, doğum günü vb.) paketleri
- 📞 İki ayrı iletişim hattı (dış çekim / video çekim) ile iletişim sayfası
- 📱 Mobil uyumlu responsive tasarım ve hamburger menü
- 🌙 Premium karanlık mod (cihaz tercihini takip eder, düğme ile elle de değiştirilebilir)
- 🍪 Çerez onayı ve Google Analytics (GA4) entegrasyonu
- 🔎 SEO: title, description, canonical, Open Graph, Twitter Card, sitemap ve robots
- 🛰️ Sosyal medya önizlemeleri için paylaşım meta etiketleri
- 📸 Animasyonlu 404 hata sayfası (fotoğraf makinesi / flaş efekti)
- 🤖 Yapay zeka botlarının siteyi taramasına izin veren robots.txt yapılandırması
- 🖼️ Tek marka görseli (`logo.webp`) ve kapsamlı favicon seti (`assets/favicon/`)

### 🔐 Müşteri Fotoğraf Seçim Sistemi

Müşterilere özel oluşturulan seçim oturumları sayesinde:

- 🔑 Seçim kodu + şifre ile giriş
- 📸 Albüm fotoğraflarını görüntüleme
- ☑️ Fotoğraf seçme, seçim sırası ve sayaç görünümü
- 🔢 Minimum / maksimum seçim limiti
- 🔍 Büyük fotoğraf görüntüleme (lightbox)
- ⏳ Son kullanma tarihi
- 🚫 İptal edilmiş veya kullanılmış link kontrolü
- 🛡️ Farklı seviyelerde istemci tarafı fotoğraf koruması (sağ tık, sürükleme, yazdırma vb.)
- 👤 Müşteri adı ve telefon bilgisi (zorunlu), not alanı (opsiyonel)
- 📧 Seçim tamamlandığında admin e-posta adresine bildirim ve seçilen dosya adları
- 📤 Seçimleri tek seferde gönderme
- ✅ Başarılı gönderim ekranı

### 🛠️ Admin Paneli

Admin paneli ana siteden bağımsız, ayrı yayınlanabilir bir projeye taşındı
(bu depodaki `admin/` klasöründen ayrı bir alan adına yayınlanabilir). Fotoğraf
yükleme işlemi GitHub token'ı tarayıcıya inmeden **Supabase Edge Function**
üzerinden yapılır.

- 🔐 Ana admin + ek admin kullanıcıları (ana admin ekler / siler)
- 📚 Albümleri görüntüleme, oluşturma ve silme (GitHub'a senkron)
- 📤 Çoklu fotoğraf yükleme (GitHub deposuna, otomatik webp dönüşümü + boyut kontrolü)
- 🔗 Müşteri seçim linkleri oluşturma (kod + şifre, min/max seçim, süre, koruma seviyesi)
- 📋 Oluşturulan link ve bilgileri tek mesaj halinde kopyalama
- 👀 Müşteri seçimlerini ve seçilen fotoğrafların dosya adlarını görüntüleme
- 🚫 Aktif seçim linkini iptal etme / 🗑️ oturum silme
- 📧 Bildirim e-posta adresini yönetme ve test e-postası gönderme
- 🔐 Admin şifre değiştirme

### 🌙 Karanlık Mod

- Cihaz karanlık mod tercihi otomatik algılanır (`prefers-color-scheme`).
- Üst menüdeki 🌙 / ☀️ düğmesiyle elle değiştirilebilir, tercih `localStorage`'ta saklanır.
- Ana sayfa, tüm alt sayfalar, 404 ve fotoğraf seçim sayfası dahil her yerde tutarlı çalışır.
- Sıcak kahve / toprak tonlarına uygun premium koyu palet (`--brand`, `--surface`, `--text` değişkenleri üzerinden yönetilir).
- Sayfa açılışında yanıp sönmeyi (FOUC) önleyen ön yükleme scripti içerir.

---

## 🧩 Sistem Nasıl Çalışıyor?

```text
                    ┌──────────────────────┐
                    │      Foto Herdem     │
                    │   Web Sitesi (Wasmer)│
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
      ┌───────────────┐                 ┌────────────────┐
      │ Ziyaretçi     │                 │ Admin Paneli   │
      │ Sayfaları     │                 │ (Ayrı site)    │
      └───────┬───────┘                 └───────┬────────┘
              │                                 │
              │                                 ▼
              │                        ┌──────────────────┐
              │                        │  Supabase Edge   │
              │                        │   Function (Git) │
              │                        └────────┬─────────┘
              │                                 │
              │                    ┌────────────▼────────────┐
              │                    │  GitHub Deposu          │
              │                    │  Albümler/fotoğraflar/  │
              │                    └────────────┬────────────┘
              │                                 │
              ▼                                 ▼
      ┌──────────────────┐              ┌──────────────────┐
      │     Supabase     │◄────────────►│  photo_albums    │
      │ DB + RPC         │              │  (albüm listesi) │
      └────────┬─────────┘              └──────────────────┘
               │
               ▼
      Müşteri Seçim Sayfası (secim.html)
               │
               ▼
      📤 Seçimler + 📧 Admin e-posta bildirimi
```

Fotoğraflar doğrudan GitHub deposundaki `Albümler/fotoğraflar/` klasöründen okunur; albüm listesi ise Supabase `photo_albums` tablosundan gelir. Admin panelinde yapılan albüm / fotoğraf işlemleri Supabase Edge Function aracılığıyla GitHub deposuna yazılır ve albüm listesi otomatik güncellenir.

---

## 📁 Proje Yapısı

```text
Foto-Herdem/
│
├── 📁 Albümler/
│   └── 📁 fotoğraflar/
│       ├── 📁 kina-gecesi-2026/
│       ├── 📁 nisan-seansi-2026/
│       └── 📁 nisan-seansı-2026/
│
├── 📁 admin/
│   ├── 📄 index.html
│   ├── 📄 admin.js
│   ├── 📄 admin.css
│   ├── 📄 config.js
│   ├── 📄 style.css
│   ├── 📁 assets/
│   ├── 📁 vendor/
│   ├── 📁 supabase/
│   │   ├── 📄 schema.sql
│   │   └── 📁 functions/github-photos/
│   └── 📄 README.md
│
├── 📁 assets/
│   ├── 🖼️ logo.webp
│   ├── 🖼️ album-*.webp
│   ├── 🖼️ dis-cekim-*.webp
│   ├── 🖼️ site-preview.svg
│   └── 📁 favicon/
│       ├── 📄 favicon.ico
│       ├── 📄 apple-touch-icon.png
│       ├── 📄 android-icon-*.png
│       ├── 📄 apple-icon-*.png
│       ├── 📄 favicon-*.png
│       └── 📄 ms-icon-*.png
│
├── 📁 css/
│   ├── 📄 style.css
│   ├── 📄 secim.css
│   └── 📄 404.css
│
├── 📁 js/
│   ├── 📄 config.js            (canlı Supabase / GitHub yapılandırması)
│   ├── 📄 config.example.js    (örn. yapılandırma şablonu)
│   ├── 📄 main.js              (nav, tema, formlar)
│   ├── 📄 galeri.js            (galeri filtre + lightbox)
│   ├── 📄 secim.js             (müşteri seçim mantığı)
│   ├── 📄 analytics.js         (Google Analytics 4)
│   ├── 📄 cookie-consent.js    (çerez onayı)
│   └── 📁 vendor/
│       └── 📄 supabase.min.js
│
├── 📁 sayfalar/
│   ├── 📄 albumler.html
│   ├── 📄 cerez-politikasi.html
│   ├── 📄 galeri.html
│   ├── 📄 iletisim.html
│   └── 📄 paketler.html
│
├── 📁 supabase/
│   ├── 📄 schema.sql          (tablolar + RPC fonksiyonları)
│   └── 📄 cleanup-github.sql
│
├── 📄 index.html
├── 📄 404.html
├── 📄 secim.html
├── 📄 apple-app-site-association
├── 📄 browserconfig.xml
├── 📄 manifest.json
├── 📄 robots.txt
├── 📄 sitemap.xml
├── 📄 README.md
├── 📄 SECURITY.md
└── 📄 LICENSE
```

---

## 🗂️ Albüm Sistemi

Fotoğraflar `Albümler/fotoğraflar/` klasörü altında albümlere ayrılır. Her
albüm kendi klasöründe durur:

```text
Albümler/
└── fotoğraflar/
    ├── kina-gecesi-2026/
    │   ├── 01.jpg
    │   ├── 02.jpg
    │   └── ...
    └── nisan-seansi-2026/
        ├── 01.webp
        └── ...
```

Albüm listesi (albüm adı, kapak, tarih, seçim limiti vb.) Supabase'teki
`photo_albums` tablosunda tutulur. Admin panelinden fotoğraf yükleme veya
albüm silme yapıldığında liste, Supabase Edge Function tarafından otomatik
güncellenir; ayrı bir `albums.json` dosyası üretmeye gerek yoktur.

### Desteklenen görsel formatları

```text
.jpg
.jpeg
.png
.webp
.gif
.heic
.avif
```

Admin panelinden yüklenen görseller otomatik olarak **webp** formatına çevrilir
ve gerekirse 25 MB altına düşürülür.

---

## 🔐 Supabase Yapısı

Projenin yönetim ve müşteri seçim sistemi **Supabase** üzerinde çalışır.

`supabase/schema.sql` dosyası gerekli veritabanı yapısını kurar.

Temel tablolar:

| Tablo | Görevi |
|---|---|
| `admins` | Yönetici hesapları |
| `admin_sessions` | Admin oturumları |
| `customer_sessions` | Müşteri seçim oturumları |
| `selections` | Gönderilen fotoğraf seçimleri |
| `photo_albums` | Güncel albüm listesi ve meta veriler |
| `admin_settings` | Yönetim ayarları (bildirim e-postası vb.) |

Önemli işlemler güvenli RPC fonksiyonları üzerinden gerçekleştirilir:

- Yönetici: `admin_login`, `admin_me`, `admin_logout`, `admin_change_password`, `admin_create_admin`, `admin_list_admins`, `admin_delete_admin`
- Oturumlar: `admin_create_session`, `admin_list_sessions`, `admin_get_selections`, `admin_revoke_session`, `admin_delete_session`
- Ayarlar: `admin_get_email`, `admin_set_email`
- Müşteri: `customer_login`, `customer_submit_selection`

---

## ⚙️ Kurulum

### 1️⃣ Projeyi klonla

```bash
git clone https://github.com/MuhammedAkay/Foto-Herdem.git
cd Foto-Herdem
```

### 2️⃣ Supabase projesi oluştur

- [supabase.com](https://supabase.com) üzerinden yeni bir proje açın.
- SQL Editor'da `supabase/schema.sql` içeriğini çalıştırın.
- Admin paneli (ayrı site) için `admin/supabase/schema.sql` yapısını da kendi projesine uygulayın.

### 3️⃣ Bağlantıları tanımla

`js/config.example.js` dosyasını `js/config.js` olarak kopyalayıp kendi
Supabase URL / anon key ve GitHub fotoğraf URL değerlerini girin:

```js
window.FH_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
  PHOTO_URL: "https://raw.githubusercontent.com/OWNER/REPO/main/Alb%C3%BCmler/"
};
```

> Gerçek canlı değerler `js/config.js` içindedir; bu dosya herkese açık bir
> projede paylaşılmamalıdır. GitHub token'ı asla `config.js` içinde tutulmaz;
> Supabase Edge Function ortam değişkeni olarak saklanır.

### 4️⃣ Yerel olarak çalıştır

Proje statik HTML/CSS/JS yapısında olduğu için herhangi bir basit HTTP sunucusu kullanılabilir:

```bash
npx serve .
```

veya VS Code üzerinde **Live Server** kullanılabilir.

### 5️⃣ Yayınla

- Kod ve fotoğraflar GitHub deposunda tutulur.
- Site [Wasmer](https://wasmer.io) üzerinden deploy edilir (isteğe bağlı olarak Netlify / statik barındırma da kullanılabilir).
- Admin paneli ayrı bir alan adına (örn. `admin.fotoherdem`) yayınlanabilir.

---

## 🔗 Sayfalar

| Sayfa | Açıklama |
|---|---|
| `/` | 🏠 Ana sayfa |
| `/sayfalar/galeri.html` | 🖼️ Fotoğraf galerisi |
| `/sayfalar/albumler.html` | 📚 Albümler |
| `/sayfalar/paketler.html` | 💍 Paketler |
| `/sayfalar/iletisim.html` | 📞 İletişim |
| `/sayfalar/cerez-politikasi.html` | 🍪 Çerez politikası |
| `/secim.html` | 🔐 Müşteri fotoğraf seçimi |
| `/404.html` | 📸 Animasyonlu hata sayfası |
| `/admin/` | 🛠️ Yönetim paneli (ayrı proje) |

---

## 🛡️ Güvenlik

Proje içerisinde müşteriye özel seçim oturumları için:

- 🔑 Kod + şifre doğrulaması
- ⏳ Süre kontrolü
- 🚫 Kullanılmış link kontrolü
- 🚫 İptal edilmiş link kontrolü
- 🔐 Admin oturum token'ları
- 🧱 Supabase Row Level Security (RLS)
- ⚙️ Security Definer RPC fonksiyonları
- 🕵️ Admin ve seçim sayfalarında `noindex,nofollow`
- 🖱️ Fotoğraf koruma seviyeleri (sağ tık, sürükleme, yazdırma engeli)
- 🔑 GitHub token'ı yalnızca Supabase Edge Function ortam değişkeninde saklanır

### ⚠️ Önemli

Tarayıcı tarafındaki fotoğraf koruması **mutlak bir indirme engelleme sistemi değildir**. Web tarayıcısına gönderilen bir görsel, teknik olarak ekran görüntüsü veya başka yöntemlerle kopyalanabilir.

Bu nedenle yüksek çözünürlüklü orijinal fotoğrafların herkese açık URL'lerde tutulması yerine, üretim ortamında uygun depolama erişim politikaları ve mümkünse thumbnail / düşük çözünürlük önizleme yaklaşımı değerlendirilmelidir.

Ayrıca üretim ortamına geçmeden önce:

- Varsayılan admin şifresi değiştirilmelidir.
- Supabase RLS politikaları test edilmelidir.
- Gereksiz public erişimler kapatılmalıdır.
- Hassas verilerin istemci tarafına gönderilmediğinden emin olunmalıdır.
- E-posta / form entegrasyonlarının production ayarları kontrol edilmelidir.

---

## 🎨 Tasarım

Foto Herdem'in tasarım dili fotoğrafçılık sektörüne uygun şekilde:

- 🤎 Sıcak kahverengi / toprak tonları
- 🤍 Açık ve ferah arka planlar
- 🌙 Koyu modda sıcak zift / kahve tonları
- ✨ Minimal tipografi
- 🖼️ Fotoğrafı öne çıkaran kart yapıları
- 📱 Mobil öncelikli responsive yaklaşım
- 🎯 Sade ve anlaşılır CTA butonları

üzerine kurulmuştur.

Ana marka rengi ve tema paleti CSS tarafında `--brand-*`, `--bg`, `--surface`,
`--text` gibi değişkenler üzerinden yönetilir. Açık / koyu tema,
`html` etiketindeki `data-theme="light|dark"` değeriyle kontrol edilir.

---

## 📱 Responsive Tasarım

Site masaüstü ve mobil cihazlar için uyarlanmıştır.

Mobil cihazlarda:

- 🍔 Hamburger menü
- 📐 Responsive grid yapıları
- 👆 Dokunmatik kullanım
- 🖼️ Mobil uyumlu galeri
- 🔐 Mobil fotoğraf seçim ekranı

kullanılır.

---

## 🔄 Müşteri Seçim Akışı

### 👨‍💼 Fotoğrafçı / Admin

```text
Admin Paneli
    ↓
Albüm seç / oluştur
    ↓
Müşteri şifresi belirle
    ↓
Minimum / maksimum fotoğraf sayısı
    ↓
Süre belirle
    ↓
Koruma seviyesi seç
    ↓
Seçim linkini oluştur ve müşteriye gönder
```

### 👰🤵 Müşteri

```text
Seçim linki
    ↓
Kod + şifre
    ↓
Albüm
    ↓
Fotoğrafları incele
    ↓
Fotoğrafları seç
    ↓
İsim + telefon + not
    ↓
Seçimleri gönder
    ↓
✅ Tamamlandı (+ admin'e e-posta bildirimi)
```

### 📊 Fotoğrafçı / Admin

```text
Admin Paneli
    ↓
Oturumlar
    ↓
Seçimleri görüntüle
    ↓
Müşterinin seçtiği fotoğrafları (dosya adlarıyla) gör
    ↓
Düzenleme / baskı sürecine devam et
```

---

## 🧰 Kullanılan Teknolojiler

| Teknoloji | Kullanım |
|---|---|
| HTML5 | Sayfa yapısı |
| CSS3 | Tasarım, responsive ve karanlık mod |
| JavaScript | Etkileşim ve uygulama mantığı |
| Supabase | Veritabanı, RPC, Edge Function ve kimlik doğrulama |
| PostgreSQL | Supabase veritabanı |
| GitHub | Kod deposu + `Albümler/fotoğraflar/` fotoğraf depolama |
| GitHub API | Admin paneli üzerinden fotoğraf yükleme / silme |
| Wasmer | Statik site yayını |
| Google Analytics 4 | Ziyaretçi istatistikleri |
| Open Graph | Sosyal medya önizlemeleri |
| SEO Meta Tags | Arama motoru optimizasyonu |

---

## 📌 Geliştirme Fikirleri

Proje gelecekte şu özelliklerle daha da geliştirilebilir:

- [ ] ☁️ Supabase Storage ile tam bulut albüm yönetimi
- [ ] 🖼️ Otomatik thumbnail oluşturma
- [ ] 📊 Daha gelişmiş seçim istatistikleri
- [ ] 📄 Müşteri seçimlerini PDF / CSV olarak dışa aktarma
- [ ] 👥 Daha gelişmiş kullanıcı rolleri
- [ ] 🔒 Signed URL / private storage tabanlı fotoğraf erişimi
- [ ] ⚡ Görsel optimizasyonu ve lazy loading geliştirmeleri
- [ ] 🌐 Özel domain ve production CDN yapılandırması

---

<p align="center">
  <strong>📸 Foto Herdem</strong><br>
  <sub>Anıları geleceğe taşıyoruz.</sub>
</p>

---

## 📄 Lisans

Bu proje **tüm hakları saklı** lisansı altındadır.

```
Copyright (c) 2026 Muhammed Akay
Tüm hakları saklıdır. İzin olmadan kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.
Tasarım ve Geliştirme: Muhammed Akay
```

Detaylar için [LICENSE](LICENSE) dosyasına bakınız.
