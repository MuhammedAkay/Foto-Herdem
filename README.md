# Foto Herdem — Admin & Müşteri Fotoğraf Seçim Sistemi

Statik siteye eklenen yönetim paneli ve müşteri seçim sayfası. Veriler Supabase'te tutulur,
albümler proje içindeki `Albümler/fotoğraflar` klasöründen okunur.

## Klasör Yapısı

```
admin/               -> Admin paneli (/admin/admin.html)
Albümler/
  albums.json        -> Üretilen albüm manifesti (elle düzenlemeyin)
  fotoğraflar/       -> Albüm klasörleri; her klasör bir albüm
    kina-gecesi-2026/01.jpg
    nisan-seansi-2026/01.jpg
secim.html           -> Müşteri fotoğraf seçim sayfası
supabase/schema.sql  -> Veritabanı şeması (tablolar + RPC fonksiyonları)
scripts/build-albums.js -> Albüm manifestini üretir
js/config.js         -> Supabase bağlantı bilgileri
```

## Veri Nerede Tutuluyor?

| Veri | Nerede |
| --- | --- |
| Fotoğraflar / albüm klasörleri | GitHub'da dosya olarak (`Albümler/fotoğraflar/`), Netlify sunar |
| Albüm indeksi (`albums.json`) | Deploy sırasında otomatik üretilir, GitHub'a commit edilir |
| Admin kullanıcıları ve şifreleri | Supabase (`admins` tablosu, hash'li) |
| Seçim linkleri, kodlar, şifreler | Supabase (`customer_sessions` tablosu, hash'li) |
| Müşteri seçimleri | Supabase (`selections` tablosu) |

## Kurulum

1. [supabase.com](https://supabase.com)'da ücretsiz proje oluşturun.
2. SQL Editor'ı açıp `supabase/schema.sql` içeriğini çalıştırın. Bu işlem tabloları, güvenli
   RPC fonksiyonlarını ve varsayılan admin hesabını oluşturur:
   - Kullanıcı adı: `herdem`
   - Şifre: `herdem123` (ilk girişte değiştirin!)
3. Supabase → Project Settings → API bölümünden `Project URL` ve `anon public` anahtarını
   kopyalayıp `js/config.js` dosyasına yapıştırın.
4. Siteyi deploy edin. Admin paneline `https://siteniz.com/admin/admin.html` adresinden ulaşılır
   (nav barda giriş bağlantısı yoktur; sayfa `noindex`).

## Albüm Ekleme (Netlify + GitHub)

Fotoğraflar yalnızca dosya olarak GitHub'da tutulur; hiçbir albüm verisi Supabase'e yazılmaz.

1. `Albümler/fotoğraflar` altına yeni bir klasör açın (ör. `dugun-ahmet-ayse-2026`).
2. Fotoğrafları klasöre sürükleyip GitHub'a push edin.
3. Netlify deploy'unda `netlify.toml` build komutu (`node scripts/build-albums.js`) çalışır ve
   `Albümler/albums.json` manifestini otomatik yeniden üretir.
4. Admin panelinde "Albümler → Yenile"ye basın. Albüm artık listede görünür.

Lokal test için aynı komutu elinizle de çalıştırabilirsiniz: `node scripts/build-albums.js`

## Link Oluşturma ve Müşteri Akışı

- Admin panelinde albümün yanındaki **Link Oluştur** ile:
  - Müşteri şifresi, seçilebilecek fotoğraf sayısı, koruma seviyesi ve (opsiyonel) bitiş
    tarihi belirlenir.
  - Rastgele 10 haneli kod sunucuda üretilir; şifre veritabanında hash'li tutulur.
  - Oluşan link `https://siteniz.com/secim.html?kod=XXXX&sifre=YYYY` biçimindedir. Şifre
    yalnızca oluşturma anında gösterilir, bir daha görülemez.
- Müşteri linke girer, kod + şifre ile giriş yapar, belirlenen sayıda fotoğrafı seçer ve
  gönderir. **Seçim tek kullanımlıktır:** link bir kez kullanıldıktan sonra (`used`) aynı kodla
  tekrar giriş yapılamaz.
- Seçimler admin panelindeki "Oluşturulan Linkler → Seçimleri Gör"den izlenir.

## Koruma Seviyeleri

| Seviye | Özellikler |
| --- | --- |
| 0 — Yok | Koruma yok |
| 1 — Hafif | Sağ tık/sürükleme engeli, filigran ("Foto Herdem") |
| 2 — Güçlü | 1 + devtools/yazdırma kısayol engeli, yazdırma CSS engeli |
| 3 — Maksimum | 2 + sayfa arka plana alınınca/sekme gizlenince karartma |

> Tarayıcı ekran görüntüsü (SS) teknik olarak tamamen engellenemez; bu katmanlar indirme ve
> kopyalamayı zorlaştırır, caydırıcıdır.

## Güvenlik Notları

- Tüm veri erişimi yalnızca RPC fonksiyonları üzerinden yapılır; tablolara anon/authenticated
  doğrudan erişemez (RLS + revoke).
- Admin oturumları 12 saat geçerlidir; `admin_login` başarısız denemelerde herhangi bir ipucu
  vermez.
- `js/config.js` içindeki anon key herkese açıktır ancak yalnızca yetkili RPC'leri çağırabilir;
  tablolara erişemez.
