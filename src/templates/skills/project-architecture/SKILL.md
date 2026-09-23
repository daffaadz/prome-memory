---
name: project-architecture
description: Early-stage project architecture, scaffolding blueprint, domain boundaries, schema validation, and clean layering
---

# Early-Stage Project Architecture & Scaffolding Blueprint

Panduan arsitektur tahap awal untuk memastikan fondasi proyek tersusun rapi, scalable, memiliki batasan domain yang jelas, dan bebas dari spaghetti code serta technical debt di masa depan.

Gunakan skill ini setiap kali:
- Menginisialisasi proyek baru atau memulai modul fitur besar
- Merancang struktur folder dan batas-batas dependensi
- Menentukan strategi validasi data dan penanganan error
- Menata konfigurasi environment variable dan kontrak API

---

## 1. Prinsip Struktur Folder: Feature-First vs Layer-First

AI dan developer pemula sering mengelompokkan file secara Layer-First murni (`/controllers`, `/models`, `/views`) di mana satu fitur tersebar di 5 folder yang berbeda dan saling berjauhan.

### ✅ Rekomendasi Modern: Feature-First (Domain-Driven Colocation)
Kelompokkan kode berdasarkan **fitur/domain bisnis**, sehingga semua hal yang terkait dengan satu fitur berada dalam satu tempat:
```
src/
├── features/
│   ├── auth/
│   │   ├── components/      # UI komponen khusus auth (LoginForm, etc.)
│   │   ├── services/        # Logika bisnis auth (login, logout, token refresh)
│   │   ├── schemas/         # Validasi Zod/TypeBox (loginSchema, registerSchema)
│   │   ├── types.ts         # Definisi tipe TypeScript domain auth
│   │   └── index.ts         # Public API yang diekspor dari modul auth
│   └── billing/
│       ├── components/
│       ├── services/
│       └── schemas/
├── shared/                  # Kode umum yang dipakai lintas fitur
│   ├── components/          # Design system atomic (Button, Input, Modal)
│   ├── db/                  # Inisialisasi koneksi database & migrations
│   ├── env/                 # Skema & validasi env vars
│   ├── errors/              # Base AppError & error handler
│   └── utils/               # Fungsi helper murni (pure functions)
└── main.ts / app.ts         # Entry point aplikasi
```

### Aturan Ketergantungan (Dependency Rule):
- Fitur `billing` boleh mengimpor dari `shared/`.
- Fitur `billing` **TIDAK BOLEH** langsung mengimpor file internal dari `auth/services/deep/internal.ts`. Hanya impor dari public API `auth/index.ts`.
- Mencegah dependensi siklis (*circular dependency*) antar modul.

---

## 2. Pemisahan 3 Lapisan Bersih (3-Tier Layering)

Pastikan pemisahan tanggung jawab yang tegas:

```
[ Presentation Layer ] (UI Components, API Route Handlers)
         │
         ▼
[ Domain / Application Layer ] (Business Logic, Workflows, Rules)
         │
         ▼
[ Infrastructure / Data Layer ] (Database ORM, External APIs, File System)
```

1. **Presentation Layer**:
   - Tanggung jawab: Mengurai input user, memvalidasi schema, menampilkan UI / merespon HTTP status code.
   - DILARANG: Menulis query database langsung di dalam komponen UI atau route handler.
2. **Domain Layer**:
   - Tanggung jawab: Aturan bisnis murni (contoh: "User hanya boleh checkout jika saldo cukup dan stok > 0").
   - Bersifat agnostik terhadap framework web atau UI library.
3. **Data Layer**:
   - Tanggung jawab: Menyimpan dan mengambil data dari database, cache Redis, atau third-party API.

---

## 3. Validasi Skema Runtime di Setiap Batas Sistem

TypeScript hanya memberikan jaminan tipe pada saat *compile-time*. Saat aplikasi berjalan (*runtime*), data eksternal (request body, query param, response API pihak ketiga, `.env`) bisa tidak sesuai ekspektasi.

### Aturan Skema Nol-Kepercayaan (Zero-Trust Schemas):
Validasi semua input eksternal menggunakan pustaka schema seperti **Zod**:
```typescript
import { z } from 'zod';

// 1. Skema Validasi Input API
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(120),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// 2. Di Route Handler / Controller
export async function handleCreateTask(reqBody: unknown) {
  const parseResult = CreateTaskSchema.safeParse(reqBody);
  if (!parseResult.success) {
    return {
      status: 400,
      errors: parseResult.error.flatten().fieldErrors,
    };
  }
  // Data terjamin aman dan bertipe CreateTaskInput
  return await taskService.create(parseResult.data);
}
```

---

## 4. Validasi Konfigurasi & Environment Variable Saat Boot

Jangan pernah menggunakan `process.env.DATABASE_URL` berserakan di sembarang file tanpa validasi. Jika env var lupa diatur, aplikasi harus langsung menolak berjalan saat booting dengan pesan error yang jelas.

```typescript
// src/shared/env/index.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL harus berupa URL koneksi yang valid'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter demi keamanan'),
});

export const env = EnvSchema.parse(process.env);
```

---

## 5. Standarisasi Error Handling & Result Pattern

Hindari melempar error mentah (`throw new Error("fail")`) yang membuat server crash atau membocorkan stack trace ke user.

### Pola Kelas Error Domain:
```typescript
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} tidak ditemukan`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

---

## 6. Checklist Arsitektur Awal Proyek
- [ ] Apakah struktur folder mengikuti prinsip feature-first colocation?
- [ ] Apakah seluruh environment variable divalidasi via schema saat booting?
- [ ] Apakah seluruh payload API masuk melewati validasi runtime schema (Zod/TypeBox)?
- [ ] Apakah logika bisnis terpisah dari presentasi dan database queries?
- [ ] Apakah penanganan error tersentralisasi dan aman dari kebocoran informasi internal?
- [ ] Apakah keputusan stack dan arsitektur awal telah dicatat via `prome remember`?
