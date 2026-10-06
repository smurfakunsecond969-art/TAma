/**
 * takuStore.js — State global Taku (di luar React).
 *
 * Layout di-mount ulang di setiap halaman, jadi state yang harus bertahan
 * saat navigasi (fase bicara, subtitle, target spotlight, mode presentasi)
 * disimpan di sini, bukan di useState komponen.
 */
import { useSyncExternalStore } from 'react';

const listeners = new Set();

let state = {
  phase: 'idle',        // 'idle' | 'listening' | 'processing' | 'speaking'
  presenting: false,    // Director sedang menjalankan skrip adegan
  paused: false,
  booting: false,       // boot sequence layar penuh
  chapter: null,        // { id, title }
  subtitle: null,       // { text, start, end }
  target: null,         // { selector, label }
  clickPulse: 0,        // naik setiap kursor hantu "mengklik"
  pulse: 0,             // naik setiap kata diucapkan (denyut Core)
  confirm: null,        // { question } menunggu ya/tidak
  sceneIndex: 0,
  sceneTotal: 0,
};

/** Referensi hidup ke fungsi/data aplikasi, diperbarui TakuAssistant tiap render. */
export const runtime = {
  navigate: null,
  plants: [],
  user: null,
  theme: 'light',
  showToast: () => {},
  toggleTheme: () => {},
  loadPlants: async () => {},
};

export function getTakuState() {
  return state;
}

export function setTakuState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeTaku(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTakuState() {
  return useSyncExternalStore(subscribeTaku, getTakuState);
}
