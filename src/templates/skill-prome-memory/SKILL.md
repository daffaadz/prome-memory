---
name: prome-memory
description: Persistent project memory management for coding agents using Prome
---

# Prome Memory Protocol

Baca `.prome/memory/core.md` sebelum memproses request user apa pun.

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

