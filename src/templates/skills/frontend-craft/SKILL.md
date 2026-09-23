---
name: frontend-craft
description: Anti-AI-slop frontend design, distinctive typography, and UI/UX craft guidelines
---

# Frontend Craft & Anti-AI-Slop Design System

Panduan implementasi desain frontend modern, berkarakter, dan ergonomis untuk mencegah estetika "AI Slop" yang seragam dan membosankan.

Gunakan skill ini setiap kali:
- Merancang atau mengimplementasikan komponen UI, layout, atau halaman baru
- Menata typography, spacing, padding, dan warna
- Menambahkan animasi atau micro-interactions
- Melakukan review atau refactor kode frontend

---

## 1. Daftar Font AI Slop & Panduan Tipografi

AI generasi kode cenderung memilih 3-4 font yang sama secara repetitif di setiap proyek. Hasilnya adalah tampilan template korporat yang kaku dan tidak bernyawa.

### ❌ Font AI Slop yang HARUS DIHINDARI (Kecuali Diminta Eksplisit)
1. **`Inter`** (Dipakai untuk SEMUA elemen dari h1 sampai footer tanpa kontras bobot — klise paling kentara dari UI buatan AI).
2. **`Roboto`** (Membawa estetika Android era lama, terkesan seperti aplikasi internal dev yang belum selesai didesain).
3. **`Open Sans` & `Lato`** (Template web korporat era 2015-2018 yang overused).
4. **`Poppins`** (Font bulat yang sering dipaksakan untuk aplikasi tech modern sehingga terlihat kekanak-kanakan atau murahan).
5. **`Arial` / `Helvetica` polos tanpa styling kontras** (Menghasilkan UI dingin tanpa hierarki visual).

### ✅ Rekomendasi Font Berkarakter & Modern (Gunakan Pairing!)
Gunakan selalu pendekatan **Pairing (Kombinasi 2 Karakter)**: 1 Display/Heading font + 1 High-legibility Body font.

| Vibe Proyek | Display / Heading Font | Body / UI Font | Monospace (Data / Code) |
| :--- | :--- | :--- | :--- |
| **Modern Tech & SaaS** | Plus Jakarta Sans / Outfit / Cabinet Grotesk | Geist / General Sans | JetBrains Mono / Geist Mono |
| **Editorial & Craft** | Newsreader / Fraunces / Serif Modern | DM Sans / Satoshi | Fira Code |
| **Dev Tools & Data** | Bricolage Grotesque / Space Grotesk | Inter Display (dengan tracking ketat) | Berkeley Mono / JetBrains Mono |
| **Clean Minimalist** | Archivo / Epilogue | Switzer / Instrument Sans | IBM Plex Mono |

### Aturan Tipografi yang Wajib Diikuti:
- **Fluid Typography**: Gunakan CSS `clamp()` untuk heading agar dinamis di mobile vs desktop:
  ```css
  /* Contoh Fluid H1 */
  font-size: clamp(2rem, 5vw + 1rem, 3.75rem);
  line-height: 1.1;
  letter-spacing: -0.025em; /* Heading modern wajib memiliki tracking ketat */
  ```
- **Line-height Proportional Rule**:
  - Heading besar (>= 32px): `line-height: 1.05 - 1.2`
  - Subheading (20px - 28px): `line-height: 1.25 - 1.35`
  - Body text (14px - 18px): `line-height: 1.5 - 1.65`
- **Tabular Figures**: Untuk angka harga, metrik, atau timer data, selalu gunakan `font-variant-numeric: tabular-nums` agar lebar karakter seragam dan tidak bergoyang saat berganti nilai.

---

## 2. Konsistensi Spacing, Padding, dan Margin (8pt Spatial Grid)

Penyakit utama layout AI adalah inkonsistensi spasi (misalnya tombol pakai padding `13px`, card pakai `27px`, margin random).

### Sistem Skala Spacing Baku (Kelipatan 4px & 8px)
Gunakan token tetap ini di seluruh komponen:
```
4px   (0.25rem) -> micro spacing (jarak icon ke teks, badge padding vertikal)
8px   (0.5rem)  -> compact gap (jarak antar tag/chip)
12px  (0.75rem) -> form input vertical padding
16px  (1rem)    -> standard base gap, mobile screen margin
24px  (1.5rem)  -> card inner padding, desktop grid gap
32px  (2rem)    -> section separator kecil, modal padding
48px  (3rem)    -> section separator medium
64px  (4rem)    -> large hero padding
96px+ (6rem+)   -> major layout separation
```

### Aturan Hirarki Spacing:
1. **Container Padding > Child Gap > Element Padding**:
   - Jika Card memiliki `padding: 24px`, maka `gap` antar elemen di dalam card harus **12px - 16px** (tidak boleh sama besar atau lebih besar dari padding luar card).
2. **Gunakan Flexbox/Grid `gap` daripada Margin**:
   - HINDARI memberi `margin-bottom` pada setiap elemen anak. Gunakan pembungkus flex/grid dengan `gap: 16px` untuk mencegah *margin collapsing bugs*.
3. **Konsistensi Button & Input Padding**:
   - `Small`: `px-3 py-1.5` (12px horizontal, 6px vertikal)
   - `Medium (Default)`: `px-4 py-2.5` (16px horizontal, 10px vertikal)
   - `Large`: `px-6 py-3.5` (24px horizontal, 14px vertikal)
   - Tinggi tombol dan form input pada baris yang sama WAJIB memiliki tinggi absolut atau `line-height + padding` yang presisi dan sejajar.

---

## 3. 10 Larangan Fatal Desain AI Slop

1. ❌ **DILARANG: Neon Purple/Cyan Gradient di atas Pure Black (`#000000`)**.
   - *Solusi*: Gunakan dark slate atau dark zinc (`#09090b` / `#121214`), dan gunakan aksen warna tunggal yang hangat atau elegan (amber, emerald, cobalt, atau muted violet).
2. ❌ **DILARANG: Card bersudut rounded seragam tanpa hierarki visual**.
   - *Solusi*: Berikan perbedaan visual nyata antara primary card dan secondary container. Gunakan border subtil (`rgba(255,255,255,0.08)` pada dark mode) daripada drop shadow hitam pekat.
3. ❌ **DILARANG: Tombol tanpa status aktif yang jelas**.
   - *Solusi*: Setiap interaksi wajib memiliki 5 status: `default`, `hover`, `active`, `focus-visible`, dan `disabled`.
4. ❌ **DILARANG: Centered-everything syndrome**.
   - *Solusi*: Jangan memusatkan (text-align: center) seluruh blok paragraf. Paragraph panjang WAJIB rata kiri (left-aligned) demi kenyamanan membaca (*scannability*).
5. ❌ **DILARANG: Icon acak tanpa fungsi komunikasi**.
   - *Solusi*: Hanya gunakan icon yang memperjelas makna aksi (bukan sekadar hiasan di setiap sudut tombol).
6. ❌ **DILARANG: Spinner layar penuh untuk loading kecil**.
   - *Solusi*: Gunakan **Skeleton Loader** dengan dimensi yang persis sama dengan konten asli untuk mencegah Layout Shift.
7. ❌ **DILARANG: Form input tanpa feedback inline & error state yang jelas**.
   - *Solusi*: Berikan label yang terbaca jelas, hint teks, dan border berwarna merah semantic dengan pesan bantuan yang ramah saat terjadi error.
8. ❌ **DILARANG: Animasi lambat dan berlebihan**.
   - *Solusi*: Durasi transisi UI maksimal **150ms - 250ms**. Gunakan kurva `cubic-bezier(0.16, 1, 0.3, 1)` untuk rasa yang responsif dan luwes.
9. ❌ **DILARANG: Low contrast text (abu-abu pudar di atas putih)**.
   - *Solusi*: Patuhi standar WCAG AA (rasio kontras minimal 4.5:1 untuk teks normal).
10. ❌ **DILARANG: Modal dialog tanpa tombol tutup keyboard (Escape) dan focus trapping**.

---

## 4. Micro-Interactions & Physics-Based Motion

Gunakan token transisi yang konsisten:
```css
/* Smooth Snappy Transitions */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;

/* Tombol interaktif modern */
.btn-interactive {
  transition: transform var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo),
              background-color var(--duration-fast) ease;
}

.btn-interactive:hover {
  transform: translateY(-1px);
}

.btn-interactive:active {
  transform: translateY(1px) scale(0.99);
}
```

---

## 5. Checklist Verifikasi Frontend Sebelum Selesai

- [ ] Apakah font yang digunakan memiliki karakter unik dan bukan default template AI?
- [ ] Apakah seluruh padding dan margin mematuhi skala 8pt/4px?
- [ ] Apakah kontras warna lolos uji aksesibilitas (WCAG AA)?
- [ ] Apakah layout responsif dari layar 360px hingga 1440px tanpa horizontal scroll yang tidak diinginkan?
- [ ] Apakah semua tombol interaktif memiliki indikator fokus keyboard (`focus-visible`)?
- [ ] Apakah keputusan desain penting sudah dicatat via `prome remember`?
