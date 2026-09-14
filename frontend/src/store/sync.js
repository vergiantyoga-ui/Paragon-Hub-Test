import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isOnline, onStatusChange } from '../lib/api.js';

/**
 * Lapisan penghubung antara store di memori dan API.
 *
 * Pilihan rancangannya: **store tetap menjadi sumber kebenaran antarmuka,
 * basis data disinkronkan di belakangnya.** Reducer berjalan seketika seperti
 * sebelumnya, lalu entitas yang berubah dikirim ke server.
 *
 * Alasannya dua. Pertama, seluruh halaman memanggil aksi store secara
 * sinkron dan memakai nilai kembaliannya langsung — mengubah semuanya menjadi
 * async berarti menyentuh tiga puluh berkas komponen demi perubahan yang
 * tidak terlihat penggunanya. Kedua, antarmuka tetap dapat dipakai saat
 * server mati; yang hilang hanya penyimpanannya, dan itu dilaporkan terang-
 * terangan lewat indikator koneksi alih-alih gagal diam-diam.
 *
 * Konsekuensinya jujur disebut: ini bukan penulisan transaksional. Bila
 * permintaan gagal, perubahan tetap tampak di layar sampai halaman
 * disegarkan. Untuk aplikasi satu pengguna per pemasok, itu pertukaran yang
 * masuk akal; bila kelak dua staf menyunting pengajuan yang sama, lapisan
 * inilah yang perlu diganti dengan penulisan yang menunggu jawaban server.
 */

/** Sinkronisasi hanya berjalan di peramban, dan dapat dimatikan lewat env. */
export const SYNC_ENABLED =
  typeof window !== 'undefined' && import.meta.env?.VITE_DATA_SOURCE !== 'mock';

/* ------------------------------------------------------------------ */
/* Hidrasi                                                            */
/* ------------------------------------------------------------------ */

/**
 * Memuat keadaan awal dari server satu kali saat aplikasi dibuka.
 *
 * Sampai jawabannya tiba, antarmuka berjalan di atas data contoh di memori —
 * tidak ada layar kosong, dan bila server tidak tersedia aplikasi tetap
 * dapat ditelusuri seperti versi tanpa backend.
 */
export function useBootstrap(onHydrate) {
  const [state, setState] = useState(() => (SYNC_ENABLED ? 'loading' : 'offline'));
  const handler = useRef(onHydrate);
  handler.current = onHydrate;

  useEffect(() => {
    if (!SYNC_ENABLED) return undefined;

    const controller = new AbortController();
    let active = true;

    api
      .bootstrap(controller.signal)
      .then((payload) => {
        if (!active) return;
        handler.current?.(payload);
        setState('ready');
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;
        console.warn('[sync] gagal memuat data dari server, memakai data contoh.', error.message);
        setState('offline');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}

/* ------------------------------------------------------------------ */
/* Penulisan                                                          */
/* ------------------------------------------------------------------ */

/**
 * Mengirim entitas yang berubah ke server setiap kali koleksinya berubah.
 *
 * Perbandingannya memakai identitas objek, bukan isi. Reducer sudah membuat
 * objek baru hanya untuk entitas yang benar-benar disentuh, jadi perbandingan
 * referensi sudah tepat sekaligus jauh lebih murah daripada membandingkan
 * seluruh isi profil pada setiap render.
 */
export function useWriteThrough(items, push, { enabled = true, keyOf = (item) => item.id } = {}) {
  const snapshot = useRef(null);
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    if (!SYNC_ENABLED || !enabled || !Array.isArray(items)) return;

    const next = new Map(items.map((item) => [keyOf(item), item]));

    // Render pertama hanya merekam keadaan awal: tidak ada yang perlu dikirim
    // karena data itu justru baru saja datang dari server.
    if (snapshot.current === null) {
      snapshot.current = next;
      return;
    }

    const previous = snapshot.current;
    snapshot.current = next;

    for (const [key, item] of next) {
      if (previous.get(key) === item) continue;
      Promise.resolve(pushRef.current(item)).catch((error) => {
        console.warn(`[sync] gagal menyimpan ${key}:`, error.message);
      });
    }
  }, [items, enabled, keyOf]);

  /** Dipanggil setelah hidrasi supaya data server tidak dikirim balik. */
  return useCallback((hydrated) => {
    snapshot.current = new Map((hydrated ?? []).map((item) => [keyOf(item), item]));
  }, [keyOf]);
}

/** Versi `useWriteThrough` untuk objek berkunci, bukan larik. */
export function useWriteThroughMap(record, push, { enabled = true } = {}) {
  const snapshot = useRef(null);
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    if (!SYNC_ENABLED || !enabled || !record) return;

    const next = new Map(Object.entries(record));

    if (snapshot.current === null) {
      snapshot.current = next;
      return;
    }

    const previous = snapshot.current;
    snapshot.current = next;

    for (const [key, value] of next) {
      if (previous.get(key) === value) continue;
      Promise.resolve(pushRef.current(key, value)).catch((error) => {
        console.warn(`[sync] gagal menyimpan ${key}:`, error.message);
      });
    }
  }, [record, enabled, push]);

  return useCallback((hydrated) => {
    snapshot.current = new Map(Object.entries(hydrated ?? {}));
  }, []);
}

/* ------------------------------------------------------------------ */
/* Penyaluran hasil bootstrap ke store lain                           */
/* ------------------------------------------------------------------ */

/**
 * `AppStoreProvider` yang memanggil `/bootstrap`, tetapi isinya juga dipakai
 * store questionnaire. Daripada memanggil endpoint yang sama dua kali,
 * hasilnya disiarkan ke pelanggan mana pun yang membutuhkannya.
 */
const bootstrapListeners = new Set();
let lastBootstrap = null;

export function publishBootstrap(payload) {
  lastBootstrap = payload;
  for (const listener of bootstrapListeners) listener(payload);
}

export function useQuestionnaireHydration(onHydrate) {
  const handler = useRef(onHydrate);
  handler.current = onHydrate;

  useEffect(() => {
    if (!SYNC_ENABLED) return undefined;

    const listener = (payload) => handler.current?.(payload.questionnaire ?? {});
    bootstrapListeners.add(listener);

    // Bila hasilnya sudah tiba sebelum store ini terpasang, pakai yang tersimpan.
    if (lastBootstrap) listener(lastBootstrap);

    return () => bootstrapListeners.delete(listener);
  }, []);
}

/* ------------------------------------------------------------------ */
/* Status koneksi                                                     */
/* ------------------------------------------------------------------ */

export function useApiStatus() {
  const [online, setOnlineState] = useState(() => (SYNC_ENABLED ? isOnline() : true));

  useEffect(() => {
    if (!SYNC_ENABLED) return undefined;
    return onStatusChange(setOnlineState);
  }, []);

  return { online, enabled: SYNC_ENABLED };
}
