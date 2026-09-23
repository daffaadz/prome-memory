---
name: seo-web-vitals
description: Search Engine Optimization (SEO), JSON-LD structured data, and Core Web Vitals (LCP, INP, CLS) optimization
---

# SEO Excellence & Core Web Vitals (CWV) Optimization

Skill komprehensif untuk memastikan aplikasi web memiliki indeks search engine maksimal serta skor Google Core Web Vitals di zona hijau (skor Lighthouse/PageSpeed 90+).

Gunakan skill ini setiap kali:
- Merancang struktur halaman web (landing page, blog, e-commerce, dashboard publik)
- Mengonfigurasi metadata, tag OpenGraph, atau structured data (Schema.org)
- Mengoptimasi kecepatan loading aset (gambar, font, script)
- Mengatasi masalah layout shifting (CLS) atau kelambatan interaksi (INP)

---

## 1. Standar Core Web Vitals (Zona Hijau)

Google mengukur pengalaman pengguna berbasis 3 metrik inti:
1. **LCP (Largest Contentful Paint)**: Harus **<= 2.5 detik**
2. **INP (Interaction to Next Paint)**: Harus **<= 200 ms**
3. **CLS (Cumulative Layout Shift)**: Harus **<= 0.1**

---

## 2. Playbook Optimasi LCP (Largest Contentful Paint)

Elemen LCP biasanya berupa gambar hero banner, video cover, atau blok heading teks besar pertama.

### Aturan Wajib untuk Aset LCP:
1. **Gunakan Priority Hint (`fetchpriority="high"`)**:
   ```html
   <!-- Selalu berikan fetchpriority="high" pada gambar hero utama -->
   <img
     src="/images/hero.webp"
     srcset="/images/hero-mobile.webp 640w, /images/hero.webp 1200w"
     sizes="(max-width: 768px) 100vw, 1200px"
     alt="Deskripsi relevan dan bermakna"
     fetchpriority="high"
     loading="eager"
     decoding="async"
     width="1200"
     height="630"
   />
   ```
2. **Preload Aset Kritis di `<head>`**:
   ```html
   <link rel="preload" as="image" href="/images/hero.webp" type="image/webp" fetchpriority="high" />
   <!-- Preload font utama (maksimal 1-2 varian) -->
   <link rel="preload" href="/fonts/cabinet-grotesk-bold.woff2" as="font" type="font/woff2" crossorigin />
   ```
3. **Konversi Gambar ke Format Modern**:
   - Gunakan format **AVIF** atau **WebP** (kompresi 30-50% lebih efisien dari PNG/JPEG).
   - JANGAN muat gambar mentah berukuran > 200 KB untuk viewport standar.
4. **Hindari Render-Blocking Script**:
   - Selalu gunakan atribut `defer` atau `async` pada tag `<script>`.
   - Pisahkan CSS non-kritis dan inline-kan Critical CSS untuk tampilan *above-the-fold*.

---

## 3. Playbook Optimasi CLS (Cumulative Layout Shift)

Layout shift terjadi saat elemen tiba-tiba bergeser saat halaman dimuat karena ukuran elemen belum diketahui oleh browser.

### Aturan Nol Shift (Zero CLS):
1. **Selalu Tentukan `width` dan `height` atau `aspect-ratio`**:
   ```css
   /* Pertahankan rasio container sebelum media selesai dimuat */
   .media-container {
     aspect-ratio: 16 / 9;
     width: 100%;
     background-color: var(--surface-muted); /* Placeholder visual */
   }
   ```
2. **Reservasi Ruang untuk Konten Dinamis (Iklan, Widget, Banner)**:
   - Sediakan `min-height` tetap untuk banner promosi atau komponen notifikasi dinamis agar tidak mendorong konten di bawahnya ke bawah saat muncul.
3. **Font Display & Metrik Override**:
   - Gunakan `font-display: swap;`.
   - Cocokkan metrik font fallback dengan `size-adjust` untuk mencegah teks meloncat saat font kustom selesai diunduh:
     ```css
     @font-face {
       font-family: 'FallbackFont';
       src: local('Arial');
       size-adjust: 102%;
       ascent-override: 95%;
     }
     ```

---

## 4. Playbook Optimasi INP (Interaction to Next Paint)

INP mengukur responsivitas halaman saat user mengklik tombol, memilih opsi dropdown, atau mengetik di input.

1. **Pecah Long Tasks (> 50ms)**:
   - Manfaatkan `scheduler.yield()` atau `setTimeout(..., 0)` agar browser sempat merender frame sebelum melanjutkan komputasi berat:
     ```typescript
     async function processLargeBatch(items: Item[]) {
       for (const item of items) {
         processItem(item);
         // Beri waktu browser menggambar frame
         if ('scheduler' in window && 'yield' in (window as any).scheduler) {
           await (window as any).scheduler.yield();
         }
       }
     }
     ```
2. **Debounce / Throttle Input Pencarian**:
   - Jangan jalankan query filter berat di setiap ketikan keyboard; beri jeda minimal 200ms - 300ms.
3. **Hindari Layout Thrashing**:
   - Jangan membaca properti layout (`offsetHeight`, `getBoundingClientRect`) lalu langsung menulis style DOM dalam satu loop berulang. Baca semua nilai terlebih dahulu, baru tulis (batch DOM reads/writes).

---

## 5. Semantic Metadata & JSON-LD Structured Data

### Template Standar Metadata Lengkap:
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <title>Judul Halaman Spesifik (50-60 Karakter) | Nama Brand</title>
  <meta name="description" content="Deskripsi ringkas, informatif, dan mengandung kata kunci natural antara 120-155 karakter." />
  <link rel="canonical" href="https://example.com/canonical-url" />
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.com/canonical-url" />
  <meta property="og:title" content="Judul Menarik untuk Media Sosial" />
  <meta property="og:description" content="Deskripsi ringkas yang memancing interaksi di social share preview." />
  <meta property="og:image" content="https://example.com/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Judul Menarik untuk Media Sosial" />
  <meta name="twitter:description" content="Deskripsi ringkas untuk Twitter preview." />
  <meta name="twitter:image" content="https://example.com/og-image.jpg" />
</head>
```

### JSON-LD Structured Data (Schema.org):
Sertakan schema yang relevan agar halaman mendapatkan Rich Snippet di Google Search:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Nama Platform",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
```

---

## 6. Crawlability: Sitemap & Robots.txt

1. **`robots.txt`**:
   ```
   User-agent: *
   Allow: /
   Disallow: /api/
   Disallow: /admin/
   
   Sitemap: https://example.com/sitemap.xml
   ```
2. **`sitemap.xml`**:
   - Pastikan sitemap diperbarui secara dinamis saat konten baru terbit.
   - Cantumkan tag `<lastmod>` yang akurat (ISO 8601).

---

## 7. Checklist Verifikasi SEO & Web Vitals
- [ ] Apakah gambar utama (LCP) memakai `fetchpriority="high"` dan format modern (WebP/AVIF)?
- [ ] Apakah semua media memiliki ukuran `width` & `height` atau `aspect-ratio` (CLS = 0)?
- [ ] Apakah tag `<title>` (50-60 char) dan `<meta name="description">` (120-155 char) terisi dengan tepat?
- [ ] Apakah tag OpenGraph dan Twitter Card menyertakan gambar 1200x630?
- [ ] Apakah JSON-LD schema valid menurut Schema.org validator?
- [ ] Apakah file `robots.txt` dan `sitemap.xml` dapat diakses dengan benar?
