---
name: security-hardening
description: Defensive security hardening, OWASP Top 10 mitigation, zero secrets leakage, and authentication safety
---

# Defensive Security & Secrets Hardening

Skill pertahanan keamanan aplikasi untuk mencegah kebocoran kredensial rahasia, menangkal kerentanan umum (OWASP Top 10), serta memastikan kode aman sebelum dideploy ke lingkungan produksi.

Gunakan skill ini setiap kali:
- Menulis logika autentikasi, otorisasi, atau manajemen sesi
- Memproses input yang berasal dari pengguna (form, file upload, API request)
- Mengonfigurasi header HTTP, CORS, dan cookie
- Mengelola API keys, secret token, atau environment variables
- Melakukan review keamanan pra-rilis (*pre-release security audit*)

---

## 1. Zero Secrets Leakage (Protokol Nol Kebocoran Kredensial)

AI sering kali tanpa sengaja menuliskan API key tiruan atau bahkan kredensial asli secara hardcoded ke dalam source code.

### Aturan Wajib Manajemen Rahasia:
1. **DILARANG KERAS**: Menaruh API Key, private key, token JWT, password DB, atau webhook secret langsung di file kode `.ts`, `.js`, atau `.json`.
2. **Pola `.env` vs `.env.example`**:
   - Selalu simpan rahasia di file `.env` lokal.
   - Pastikan `.env` terdaftar di `.gitignore`.
   - Selalu sertakan file `.env.example` yang hanya berisi nama variabel dengan nilai kosong/placeholder:
     ```bash
     # .env.example (Aman untuk dicommit)
     PORT=3000
     DATABASE_URL=postgresql://user:password@localhost:5432/dbname
     JWT_SECRET=your_minimum_32_characters_secret_here
     STRIPE_SECRET_KEY=sk_test_...
     ```
3. **Pembersihan Log**:
   - Jangan pernah mencetak seluruh objek request (`console.log(req)`) atau objek user yang memuat field `password_hash`, `token`, atau `credit_card`.

---

## 2. Pencegahan Injeksi & XSS (Cross-Site Scripting)

### A. SQL Injection (Gunakan Selalu Parameterized Queries)
- **❌ DILARANG (Vulnerable)**:
  ```typescript
  // Rentan SQL Injection!
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  await db.query(query);
  ```
- **✅ AMAN (Parameterized / Prepared Statement)**:
  ```typescript
  const query = 'SELECT * FROM users WHERE email = $1';
  await db.query(query, [email]);
  ```

### B. XSS (Cross-Site Scripting) pada Rendering HTML
- Jangan pernah merender input HTML user menggunakan `dangerouslySetInnerHTML` (React) atau `v-html` (Vue) tanpa sanitasi ketat.
- Jika wajib merender rich text / Markdown dari pengguna, selalu bersihkan dengan pustaka seperti **DOMPurify** atau gunakan renderer yang aman:
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';

  const cleanHtml = DOMPurify.sanitize(userProvidedHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li', 'code'],
    ALLOWED_ATTR: ['href', 'target'],
  });
  ```

### C. Path Traversal pada File System
- Jika aplikasi membaca file berdasarkan input user, pastikan path tidak bisa mengeksploitasi direktori sistem (`../../etc/passwd`):
  ```typescript
  import path from 'node:path';

  const safeBaseDir = path.resolve('/var/www/uploads');
  const targetPath = path.resolve(safeBaseDir, userProvidedFileName);

  // Pastikan targetPath tetap berada di dalam safeBaseDir
  if (!targetPath.startsWith(safeBaseDir)) {
    throw new Error('Akses file tidak diizinkan (Path Traversal)');
  }
  ```

---

## 3. Autentikasi, Sesi, dan Cookie Aman

### localStorage vs HTTP-Only Cookie
- **❌ JANGAN** simpan Access Token / Refresh Token penting di browser `localStorage`. Data di `localStorage` dapat dibaca oleh script XSS jahat pihak ketiga.
- **✅ GUNAKAN** **HTTP-Only, Secure, SameSite Cookie**:
  ```typescript
  res.cookie('token', jwtToken, {
    httpOnly: true,                  // Mencegah akses via JavaScript (Anti-XSS)
    secure: process.env.NODE_ENV === 'production', // Hanya lewat HTTPS
    sameSite: 'lax',                 // Melindungi dari CSRF
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
    path: '/',
  });
  ```

### Brute-Force & Rate Limiting:
- Lindungi endpoint sensitif (`/login`, `/register`, `/forgot-password`, `/reset-password`) dengan **Rate Limiting** (contoh: maksimal 5 percobaan gagal per IP per 15 menit).

---

## 4. Header Keamanan HTTP & Konfigurasi CORS

Pastikan server mengirimkan header keamanan modern:

```typescript
// Contoh konfigurasi Express / Fastify / Framework lain
import helmet from 'helmet';

// Pasang header keamanan standar (HSTS, NoSniff, FrameOptions)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Batasi eksekusi script eksternal
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### Konfigurasi CORS yang Benar:
- **❌ DILARANG di Production**: `origin: '*'` jika endpoint menerima kredensial atau cookie.
- **✅ AMAN**: Tentukan whitelist domain yang diizinkan secara eksplisit:
  ```typescript
  const allowedOrigins = [
    'https://myapp.com',
    'https://admin.myapp.com',
  ];

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin tidak diizinkan oleh CORS'));
      }
    },
    credentials: true,
  };
  ```

---

## 5. Audit Dependensi & Rantai Pasok (Supply Chain)

- Jalankan pemindaian otomatis sebelum commit atau deployment:
  ```bash
  # Periksa kerentanan paket pihak ketiga
  pnpm audit
  # atau
  npm audit
  ```
- Kunci versi dependensi menggunakan lockfile resmi (`pnpm-lock.yaml` / `package-lock.json`) dan commit ke repository.

---

## 6. Checklist Verifikasi Keamanan Sebelum Rilis
- [ ] Apakah tidak ada API key, token, atau kredensial rahasia yang di-hardcode di kode?
- [ ] Apakah file `.env` sudah masuk ke dalam `.gitignore` dan `.env.example` sudah tersedia?
- [ ] Apakah semua query database menggunakan parameter binding (anti-SQLi)?
- [ ] Apakah data HTML bebas dari injeksi XSS (menggunakan DOMPurify / sanitasi)?
- [ ] Apakah cookie autentikasi menggunakan atribut `httpOnly: true`, `secure: true`, dan `sameSite: 'lax'`?
- [ ] Apakah CORS dibatasi ke domain whitelist dan tidak menggunakan wildcard `*`?
- [ ] Apakah header keamanan (Content-Security-Policy, HSTS) telah diaktifkan?
