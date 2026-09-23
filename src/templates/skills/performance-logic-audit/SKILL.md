---
name: performance-logic-audit
description: Detection and remediation of performance bottlenecks, database N+1 queries, resource leaks, and insidious logic bugs
---

# Performance & Logic Defect Audit Protocol

Skill khusus untuk mendeteksi secara sistematis cacat logika (logic bugs), race condition, kebocoran memori (memory leak), serta bottleneck performa yang membuat sistem lambat atau tidak stabil.

Gunakan skill ini setiap kali:
- Melakukan code review atau refactoring kode kompleks
- Menemukan kelambatan respon server atau lag rendering UI
- Menangani proses asynchronous, state management rumit, atau transaksi data
- Mengoptimasi database queries dan ukuran bundle JavaScript

---

## 1. Deteksi Cacat Logika & Race Conditions

Cacat logika sering kali tidak memicu error sintaksis, namun menghasilkan data yang korup atau perilaku aneh di production.

### A. Async Race Condition & Stale Closures
- **Gejala**: Ketika user mengetik cepat di input pencarian, hasil pencarian pertama yang lambat menimpa hasil pencarian kedua yang lebih baru.
- **Solusi**: Gunakan `AbortController` untuk membatalkan request sebelumnya atau flag status aktif:
  ```typescript
  // Menggunakan AbortController untuk auto-cancel request usang
  let currentController: AbortController | null = null;

  async function fetchSearchResults(query: string) {
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: currentController.signal,
      });
      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') return null; // Abaikan request yang dibatalkan
      throw err;
    }
  }
  ```

### B. Double-Submit & Kurangnya Idempotency
- **Gejala**: User mengklik tombol "Bayar" atau "Submit" dua kali dengan cepat, menghasilkan dua transaksi duplikat.
- **Solusi**:
  1. Frontend: Nonaktifkan tombol segera setelah klik pertama (`disabled={isSubmitting}`).
  2. Backend: Terapkan **Idempotency Key** di header HTTP atau transaksi database dengan status check.

### C. Floating Point Inaccuracy (Perhitungan Keuangan/Jumlah)
- **Gejala**: `0.1 + 0.2 === 0.30000000000000004`.
- **Solusi**: Jangan pernah menyimpan atau menghitung mata uang menggunakan bilangan desimal mentah. Simpan dalam satuan terkecil (misalnya `cents` atau `rupiah` bulat tanpa desimal) atau gunakan library arbitrer seperti `decimal.js` / `bignumber.js`.

### D. Timezone-Naive Date Bugs
- **Gejala**: Tanggal berubah mundur satu hari untuk pengguna di zona waktu tertentu saat di-parse oleh browser.
- **Solusi**: Selalu simpan dan kirim waktu dalam format **UTC (ISO 8601)** seperti `2026-09-23T11:00:00Z`. Jangan pernah berasumsi zona waktu server sama dengan zona waktu user.

---

## 2. Deteksi Bottleneck Komputasi & Rendering Frontend

### A. Excessive Re-renders pada Komponen UI
- **Penyebab**: Membuat object literal baru (`style={{ color: 'red' }}`) atau inline anonymous function di dalam JSX yang di-render berulang kali.
- **Solusi**:
  - Pindahkan konfigurasi statis ke luar fungsi komponen.
  - Gunakan `useMemo` hanya untuk komputasi berat (filter/sort data besar > 1000 item), bukan untuk operasi ringan.
  - Pecah komponen besar menjadi komponen kecil agar state lokal hanya memicu render di bagian yang berubah.

### B. Daftar Panjang Tanpa Virtualisasi (DOM Bloat)
- **Gejala**: Render list dengan 500+ item membuat scroll macet dan browser kehabisan memori.
- **Solusi**: Terapkan **Virtual Windowing / Virtualized List** (seperti `@tanstack/react-virtual` atau implementasi setara) sehingga hanya item yang terlihat di viewport yang dirender di DOM.

### C. Bundle Bloat & Import Tidak Selektif
- **Penyebab**: Mengimpor seluruh paket besar untuk satu fungsi pembantu:
  ```typescript
  // ❌ BURUK: Memasukkan seluruh library ke dalam bundle client (~70KB)
  import _ from 'lodash';
  const val = _.get(obj, 'path');

  // ✅ BAIK: Tree-shakable import atau native modern JS
  import get from 'lodash-es/get';
  // ATAU gunakan optional chaining native:
  const val = obj?.path;
  ```

---

## 3. Deteksi Bottleneck Database & Network

### A. Masalah N+1 Query
- **Gejala**: Mengambil 1 daftar artikel (1 query), lalu menjalankan 1 query tambahan untuk setiap artikel guna mengambil nama penulisnya (N query). Jika ada 100 artikel = 101 query ke database!
- **Solusi**:
  - Gunakan `JOIN` SQL eksplisit, atau
  - Gunakan mekanisme eager loading / `DataLoader` pattern untuk batching query menjadi `WHERE id IN (...)`.

### B. Missing Index pada Foreign Key dan Filter Populer
- **Gejala**: Query pencarian atau relasi lambat drastis saat jumlah data mencapai puluhan ribu baris.
- **Solusi**: Pastikan kolom yang sering digunakan di klausa `WHERE`, `ORDER BY`, dan `JOIN` memiliki index di database:
  ```sql
  CREATE INDEX idx_orders_user_id_created ON orders (user_id, created_at DESC);
  ```

### C. Pagination Unbounded / Offset Pitfall
- **Penyebab**: `OFFSET 50000 LIMIT 20` memaksa database membaca dan membuang 50.000 baris pertama.
- **Solusi**: Gunakan **Cursor-based Pagination** (Keyset Pagination) berdasarkan ID atau timestamp berurutan:
  ```sql
  SELECT * FROM posts WHERE id < :last_seen_id ORDER BY id DESC LIMIT 20;
  ```

---

## 4. Kebocoran Memori (Memory Leaks) & Resource Cleanup

Setiap kali resource didaftarkan, wajib ada mekanisme pelepasan (cleanup):
1. **Event Listener**:
   ```typescript
   // Selalu removeEventListener di cleanup function
   useEffect(() => {
     const onResize = () => handleResize();
     window.addEventListener('resize', onResize);
     return () => window.removeEventListener('resize', onResize);
   }, []);
   ```
2. **Timer / Intervals**:
   - Selalu panggil `clearInterval(id)` atau `clearTimeout(id)` saat komponen di-unmount.
3. **Koneksi WebSocket / EventSource**:
   - Selalu panggil `.close()` saat lifecycle koneksi selesai.
4. **In-Memory Cache Tanpa Batas**:
   - Jangan gunakan `const cache = new Map()` global tanpa batas ukuran. Terapkan batas ukuran (LRU Cache) atau batas waktu kedaluwarsa (TTL).

---

## 5. Protokol Pelaksanaan Audit (Langkah Demi Langkah)

1. **Analisis Profil I/O**: Periksa interaksi network dan query database untuk mendeteksi operasi blocking atau N+1.
2. **Uji Kasus Ekstrem**:
   - Apa yang terjadi jika array bernilai kosong `[]`?
   - Apa yang terjadi jika user menekan tombol 10 kali dalam 1 detik?
   - Apa yang terjadi jika koneksi internet terputus di tengah proses (offline/timeout)?
3. **Inspeksi Lifecyle**: Pastikan semua event listener, subscription, dan timer dibersihkan dengan benar.
4. **Dokumentasikan Keputusan**: Catat perbaikan arsitektur atau optimasi yang telah dilakukan via `prome remember`.
