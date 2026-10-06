/**
 * takuDirector.js — "Taku Director"
 *
 * Menjalankan skrip adegan. Tiap adegan menggabungkan ucapan Taku dengan
 * aksi di aplikasi (pindah halaman, kursor hantu terbang, spotlight, klik).
 *
 * Adegan:
 * {
 *   chapter: 'BAB 02 — INDEKS KESEHATAN',
 *   route:   '/dashboard',                 // navigasi dulu (opsional)
 *   target:  "[data-taku='garden-score']", // elemen yang disorot (opsional)
 *   label:   'SKOR KEBUN',                 // label di bracket (opsional)
 *   say:     'teks yang diucapkan',
 *   preset:  'jarvis',
 *   click:   true,                         // kursor mengklik target setelah bicara
 *   run:     async () => {},               // aksi bebas setelah bicara
 *   hold:    400,                          // jeda akhir (ms)
 * }
 */
import { setTakuState, getTakuState, runtime } from './takuStore';
import { speakText, stopSpeech } from './takuAiService';

let runId = 0;
let confirmResolver = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function whilePaused() {
  while (getTakuState().paused) await sleep(150);
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function poll() {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - t0 > timeout) return resolve(null);
      setTimeout(poll, 120);
    })();
  });
}

/** Ucapkan satu kalimat; resolve saat selesai / dilewati / aman-timeout. */
function speakScene(text, preset) {
  return new Promise((resolve) => {
    let done = false;
    let safety;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(safety);
      resolve();
    };
    const arm = () => {
      safety = setTimeout(() => {
        if (getTakuState().paused) arm();
        else finish();
      }, text.length * 110 + 4000);
    };
    arm();

    setTakuState({ subtitle: { text, start: 0, end: 0 }, phase: 'speaking' });

    const utter = speakText(text, preset, {
      onEnd: finish,
      onError: finish,
      onWord: (w, idx, len) => {
        setTakuState({
          subtitle: { text, start: idx ?? 0, end: (idx ?? 0) + (len || w.length) },
          pulse: getTakuState().pulse + 1,
        });
      },
    });

    // Browser tanpa TTS: simulasikan durasi supaya demo tetap berjalan.
    if (!utter) setTimeout(finish, text.length * 55 + 600);
  });
}

function endRun() {
  setTakuState({
    presenting: false,
    paused: false,
    phase: 'idle',
    subtitle: null,
    target: null,
    chapter: null,
    confirm: null,
    sceneIndex: 0,
    sceneTotal: 0,
  });
  document.body.classList.remove('taku-directing');
}

export async function runScenes(scenes) {
  const my = ++runId;
  stopSpeech();
  if (confirmResolver) { confirmResolver(false); confirmResolver = null; }

  setTakuState({
    presenting: true,
    paused: false,
    sceneIndex: 0,
    sceneTotal: scenes.length,
    chapter: null,
    subtitle: null,
    target: null,
  });
  document.body.classList.add('taku-directing');

  try {
    for (let i = 0; i < scenes.length; i++) {
      if (my !== runId) return;
      const raw = scenes[i];
      const s = typeof raw === 'function' ? raw() : raw;
      if (!s) continue;

      setTakuState({ sceneIndex: i + 1 });
      if (s.chapter) setTakuState({ chapter: s.chapter });

      // 1. Navigasi
      if (s.route) {
        const current = window.location.pathname + window.location.search;
        if (current !== s.route && runtime.navigate) {
          runtime.navigate(s.route);
          await sleep(1000);
        }
      }
      if (my !== runId) return;
      await whilePaused();

      // 2. Cari target; ucapan dimulai bersamaan dengan kursor terbang
      let el = null;
      if (s.target) {
        el = await waitForElement(s.target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(380);
          setTakuState({ target: { selector: s.target, label: s.label || '' } });
        }
      }
      if (my !== runId) return;

      // 3. Bicara
      if (s.say) {
        if (el) await sleep(450); // beri waktu kursor mendarat
        await speakScene(s.say, s.preset || 'jarvis');
      } else if (el) {
        await sleep(900);
      }
      if (my !== runId) return;
      await whilePaused();

      // 4. Klik / aksi
      if (s.click && el) {
        setTakuState({ clickPulse: getTakuState().clickPulse + 1 });
        await sleep(320);
        el.click();
        await sleep(s.afterClick ?? 800);
      }
      if (s.run) await s.run();
      if (s.hold) await sleep(s.hold);

      setTakuState({ target: null, subtitle: null });
      await sleep(250);
    }
  } finally {
    if (my === runId) endRun();
  }
}

/** Minta konfirmasi ya/tidak. Dijawab via tombol HUD, tombol Y/N, atau suara. */
export function askConfirm(question, preset = 'jarvis') {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    setTakuState({ confirm: { question } });
    speakText(question, preset, {
      onStart: () => setTakuState({ phase: 'speaking', subtitle: { text: question, start: 0, end: 0 } }),
      onEnd: () => setTakuState({ phase: 'idle' }),
      onWord: (w, idx, len) =>
        setTakuState({
          subtitle: { text: question, start: idx ?? 0, end: (idx ?? 0) + (len || w.length) },
          pulse: getTakuState().pulse + 1,
        }),
    });
    // Tidak dijawab dalam 20 detik = nanti saja.
    setTimeout(() => answerConfirm(false), 20000);
  });
}

export function answerConfirm(yes) {
  if (!confirmResolver) return;
  const r = confirmResolver;
  confirmResolver = null;
  stopSpeech();
  setTakuState({ confirm: null, phase: 'idle', subtitle: null });
  r(Boolean(yes));
}

export function stopScenes() {
  runId += 1; // batalkan loop berjalan
  if (confirmResolver) { confirmResolver(false); confirmResolver = null; }
  stopSpeech();
  endRun();
}

/** Lewati adegan berjalan: hentikan suara, loop lanjut ke adegan berikut. */
export function skipScene() {
  if (getTakuState().confirm) { answerConfirm(false); return; }
  stopSpeech();
}

export function togglePause() {
  const next = !getTakuState().paused;
  setTakuState({ paused: next });
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    if (next) window.speechSynthesis.pause();
    else window.speechSynthesis.resume();
  }
}
