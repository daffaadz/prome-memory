# Prome — Project Specification & Whitepaper

> Persistent, flat-token, project-scoped memory for AI coding agents. Anti-hallucination, one-time setup, zero-maintenance automation.

---

## 1. Filosofi Produk & Prinsip Non-Negotiable

Setiap kali developer memulai sesi chat baru dengan coding agent (Claude Code, Antigravity, Cursor, dsb.), agen memulai dari kondisi amnesia atau dipaksa membaca ulang seluruh repo secara mahal. Solusi naïf adalah terus menumpuk ringkasan atau chat logs ke system prompt, yang menyebabkan token context membengkak eksponensial seiring bertambahnya usia project.

Prome dibangun di atas 3 pilar non-negotiable:

1. **Local-First**:
   - Seluruh memori tersimpan di direktori `.prome/` di dalam project root.
   - Tidak ada ketergantungan pada server eksternal, cloud database, atau SaaS berbayar.
   - Mengikuti lifecycle version control git project.

2. **Token Flat**:
   - Konteks yang di-inject secara otomatis ke setiap sesi memiliki ukuran yang konstan/terbatas (bounded size).
   - Dijaga aktif melalui algoritma **Compaction** terotomatisasi.
   - Memori detail tidak pernah dihapus (**Anti-Amnesia** via append-only `decisions.jsonl`), namun hanya di-load saat dipanggil melalui `recall`.

3. **Human Touch Minimal**:
   - CLI `prome init` bersifat silent dan non-interaktif (idempotent).
   - Satu-satunya interaksi manusia yang wajib adalah interview singkat di sesi chat pertama yang dipandu oleh agent itu sendiri.
   - Setelah interview awal, pembacaan konteks, penambahan keputusan (`remember`), dan perapihan (`compact`) berjalan otomatis via hooks.

---

## 2. Skema File Memori

Semua file divalidasi ketat menggunakan schema (Zod). Parsing yang gagal akan melempar error eksplisit (fail loudly) untuk mencegah silent corruption pada memori project.

### 2.1 `core.md` (`.prome/memory/core.md`)

Menyimpan fondasi dan batasan absolut project.

```markdown
---
project: <nama-project>
created: <ISO8601>
version: 1
status: uninitialized | initialized
---

## Tujuan

## Constraint keras

## Design system / stack awal

## Non-goals
```

### 2.2 `state.md` (`.prome/memory/state.md`)

Menyimpan ringkasan arsitektur terkini dan konvensi aktif yang dijaga flat melalui compaction.

```markdown
---
last_updated: <ISO8601>
session_count: <int>
---

## Arsitektur saat ini

## Keputusan aktif

## Area kerja terakhir

## Konvensi yang sudah disepakati
```

### 2.3 `decisions.jsonl` (`.prome/memory/decisions.jsonl`)

Log append-only yang mencatat seluruh keputusan granular. Setiap baris adalah objek JSON valid.

```json
{
  "id": "d-0001",
  "ts": "2026-09-23T10:00:00.000Z",
  "type": "architecture",
  "summary": "Adopt Vitest",
  "reason": "Fast ESM runner",
  "ref": ["vitest.config.ts"],
  "supersedes": null,
  "compacted": false
}
```

- `type`: `architecture` | `convention` | `scope`
- `ref`: array path file terkait
- `compacted`: boolean (diubah menjadi `true` setelah masuk ringkasan `state.md`; baris mentah **TIDAK PERNAH DIHAPUS**)

### 2.4 `config.yml` (`.prome/config.yml`)

```yaml
prome_version: 1
agent_adapters: []
compaction:
  trigger: session_count
  threshold: 20
recall:
  mode: grep
```

---

## 3. Spesifikasi CLI Commands

| Command                 | Perilaku Wajib                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prome init`            | Silent dan idempotent. Membuat folder `.prome/memory/` dan `.prome/skills/`. Menulis file awal (`core.md`, `state.md`, `decisions.jsonl`, `config.yml`). Mendeteksi tools yang terpasang (`.claude/`, `.agent/`, `.gemini/`) dan memasang hook adapter yang sesuai. |
| `prome status`          | Menampilkan dashboard metrik: status core (`uninitialized` vs `initialized`), ukuran byte `state.md`, jumlah total keputusan, breakdown compacted vs pending, status threshold compaction.                                                                          |
| `prome amend`           | Memperbarui `core.md`, menaikkan nomor versi (`version: n + 1`). Dapat membuka editor sistem atau menerima flag `--status`, `--set-initialized`, `--body`.                                                                                                          |
| `prome compact`         | Menjalankan algoritma compaction untuk menyaring entri `compacted: false` ke dalam `state.md`, menandai entri sebagai `compacted: true`, dan mereset session count.                                                                                                 |
| `prome recall <query>`  | Grep terstruktur pada `decisions.jsonl`. Mendukung filter `--type`, `--ref`, `--all`. Dirancang untuk dipanggil oleh coding agent.                                                                                                                                  |
| `prome remember <json>` | Append terstruktur ke `decisions.jsonl` dengan auto-increment ID (`d-0001`, `d-0002`...). Memvalidasi Zod schema sebelum menulis, dan mengupdate timestamp `state.md`.                                                                                              |
| `prome install <skill>` | Meng-copy skill dari path lokal atau meng-clone dari URL git ke `.prome/skills/` dan adapter target (misal `.agent/skills/`).                                                                                                                                       |
| `prome context`         | Menyediakan konteks terformat untuk injeksi sesi (`--inject`) atau memperbarui timestamp/session counter (`--update-if-changed`).                                                                                                                                   |

Semua command mendukung flag `--json` untuk integrasi machine-to-machine dengan AI agent.

---

## 4. Algoritma Compaction & Anti-Amnesia

1. **Trigger**:
   - `session_count >= threshold` (default: 20 sesi)
   - ATAU ukuran byte `state.md >= maxBytes` (default: 4KB)
2. **Pengambilan Entri**:
   - Membaca seluruh entri pada `decisions.jsonl` yang memiliki `compacted: false`.
3. **Penyusunan Ulang State**:
   - Menggunakan pure function `defaultCompactState` (atau summarizer kustom) untuk mensintesis keputusan baru ke dalam 4 section markdown `state.md`.
4. **Anti-Amnesia Retention**:
   - Seluruh baris mentah di `decisions.jsonl` dipertahankan; nilai properti `compacted` diperbarui menjadi `true`. Agent tetap dapat me-recall detail lengkap kapan saja di masa depan.
5. **Reset Penanda**:
   - Memperbarui `last_updated` dengan ISO timestamp terkini.
   - Mereset `session_count` menjadi 0.

---

## 5. Protokol Interview & Injeksi Konteks (Conditional Protocol)

Instruksi ini dipasang di skill adapter (`SKILL.md` untuk Antigravity, `.claude/PROME_INSTRUCTIONS.md` untuk Claude Code, `.prome/inject.md` untuk Generic Fallback):

```
Baca .prome/memory/core.md sebelum memproses request user apa pun.

JIKA status: uninitialized
  1. JANGAN langsung eksekusi request user.
  2. Lakukan interview singkat (2-4 pertanyaan), manfaatkan info yang
     sudah tersirat di prompt user — jangan tanya ulang hal yang
     sudah jelas dari konteks.
     Tanyakan: tujuan project (jika belum jelas), constraint teknis,
     stack/design system, non-goals.
  3. Tulis core.md dari jawaban via `prome amend` atau tool setara,
     ubah status menjadi initialized.
  4. Lanjutkan mengerjakan request awal user tanpa user mengulang.

JIKA status: initialized
  Muat core.md + state.md + glossary.md sebagai konteks kerja.
  Lanjutkan normal.

Di akhir sesi/task signifikan (keputusan arsitektur baru, konvensi
baru, perubahan scope):
  Panggil `prome remember` dengan objek keputusan terstruktur
  (type, summary, reason, ref file terkait).
  JANGAN memanggil remember untuk detail trivial/tidak berulang.
```

---

## 6. Batasan MVP & Roadmap Masa Depan

### Tidak Diimplementasikan pada MVP:

- Vector-based semantic search & embeddings database
- Server registry skill terpusat
- Web UI dashboard
- Sinkronisasi realtime multi-user via cloud backend

### Fokus MVP:

- Local file-based storage yang cepat, andal, dan dapat diuji 100% secara lokal.
- CLI lengkap dengan flag `--json`.
- Integrasi otomatis untuk Claude Code, Google Antigravity, dan Generic Fallback.
