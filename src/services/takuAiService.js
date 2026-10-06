/**
 * takuAiService.js  —  Taku AI · Asisten Kebun Pintar
 *
 * Menggunakan Web Speech API (SpeechSynthesis) dengan tuning khusus
 * dan voice presets agar terdengar hidup, profesional, dan kontekstual.
 */

// ─────────────────────────────────────────────────────────────
// VOICE MANAGEMENT & PRESETS
// ─────────────────────────────────────────────────────────────

export function getBestIndonesianVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // Prioritas: Google voice id-ID (kualitas tertinggi Chrome), lalu id-ID, lalu prefix 'id'
  return (
    voices.find((v) => v.lang === 'id-ID' && v.name.toLowerCase().includes('google')) ||
    voices.find((v) => v.lang === 'id-ID') ||
    voices.find((v) => v.lang.startsWith('id')) ||
    null
  );
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Listen untuk voice list async dari browser
  window.speechSynthesis.onvoiceschanged = () => {
    window.takuVoice = getBestIndonesianVoice();
  };
}

export const VOICE_PRESETS = {
  greeting: { rate: 0.95, pitch: 1.08 }, // Sedikit lebih hangat & santai
  normal:   { rate: 1.0,  pitch: 1.0  }, // Nada standar asistensi
  urgent:   { rate: 1.08, pitch: 0.95 }, // Lebih cepat & tegas buat kondisi kritis
  report:   { rate: 0.98, pitch: 1.0  }, // Jelas & terstruktur untuk laporan kebun
};

/**
 * Mainkan teks tunggal dengan preset kontekstual
 */
export function speakText(text, presetOrOptions = 'normal', maybeOptions = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const presetKey = typeof presetOrOptions === 'string' ? presetOrOptions : 'normal';
  const options = typeof presetOrOptions === 'object' && presetOrOptions !== null ? presetOrOptions : maybeOptions;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';

  const bestVoice = window.takuVoice || getBestIndonesianVoice();
  if (bestVoice) utter.voice = bestVoice;

  const preset = VOICE_PRESETS[presetKey] || VOICE_PRESETS.normal;
  utter.rate = options.rate ?? preset.rate;
  utter.pitch = options.pitch ?? preset.pitch;
  utter.volume = options.volume ?? 1;

  if (options.onStart) utter.onstart = options.onStart;
  if (options.onEnd) utter.onend = options.onEnd;
  if (options.onError) utter.onerror = options.onError;
  if (options.onWord) {
    utter.onboundary = (e) => {
      if (e.name === 'word') {
        const w = text.substring(e.charIndex, e.charIndex + (e.charLength || 8)).trim();
        if (w) options.onWord(w);
      }
    };
  }

  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking() {
  return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.speaking : false;
}

// ─────────────────────────────────────────────────────────────
// REPORT GENERATOR (Segmented)
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {'greeting'|'system'|'summary'|'plant'|'warning'|'closing'} Cue
 *
 * @typedef {Object} Segment
 * @property {string}    text        Kalimat yang diucapkan
 * @property {Cue}       cue         Hint animasi untuk UI
 * @property {number|null} plantIndex Index tanaman (null jika bukan segmen tanaman)
 * @property {number}    pauseBefore ms jeda sebelum segment ini diucapkan
 * @property {number}    rate        SpeechSynthesis rate override
 * @property {number}    pitch       SpeechSynthesis pitch override
 */

export function generateReport(plants = []) {
  const hour   = new Date().getHours();
  const waktu  = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
  const total  = plants.length;
  const good   = plants.filter((p) => p.status === 'good').length;
  const warn   = plants.filter((p) => p.status === 'warning' || p.status === 'no_data').length;

  /** @type {Segment[]} */
  const segs = [];

  // 1. Activation beep pause
  segs.push({
    text: `Sistem aktif.`,
    cue: 'system',
    plantIndex: null,
    pauseBefore: 400,
    rate: 0.88,
    pitch: 0.9,
  });

  // 2. Greeting
  segs.push({
    text: `Selamat ${waktu}. Saya Taku, asisten kebun digital Anda.`,
    cue: 'greeting',
    plantIndex: null,
    pauseBefore: 600,
    rate: VOICE_PRESETS.greeting.rate,
    pitch: VOICE_PRESETS.greeting.pitch,
  });

  segs.push({
    text: `Memuat data lapangan dan memproses kondisi seluruh tanaman.`,
    cue: 'system',
    plantIndex: null,
    pauseBefore: 300,
    rate: 0.95,
    pitch: 1.0,
  });

  // 3. Summary
  if (total === 0) {
    segs.push({
      text: `Tidak ada tanaman terdaftar dalam sistem. Silakan tambahkan tanaman melalui menu Kelola untuk memulai pemantauan.`,
      cue: 'summary',
      plantIndex: null,
      pauseBefore: 700,
      rate: 0.96,
      pitch: 1.0,
    });
  } else {
    segs.push({
      text: `Laporan kondisi kebun. Total tanaman terpantau: ${total}. ${good} dalam kondisi optimal. ${warn > 0 ? `${warn} memerlukan tindakan segera.` : 'Semua tanaman dalam keadaan baik.'}`,
      cue: 'summary',
      plantIndex: null,
      pauseBefore: 700,
      rate: warn > 0 ? VOICE_PRESETS.urgent.rate : VOICE_PRESETS.report.rate,
      pitch: warn > 0 ? VOICE_PRESETS.urgent.pitch : VOICE_PRESETS.report.pitch,
    });
  }

  // 4. Per-plant
  plants.forEach((plant, idx) => {
    const nama  = plant.name || 'Tanaman';
    const jenis = plant.type ? `, jenis ${plant.type}` : '';
    const kel   = plant.moisture !== null && plant.moisture !== undefined ? `${plant.moisture} persen` : 'tidak tersedia';

    let detail = '';
    let cue = 'plant';

    if (plant.status === 'good') {
      detail = `${nama}${jenis}. Status: optimal. Kelembaban tanah ${kel}, berada dalam rentang ideal. Tidak ada tindakan yang diperlukan.`;
    } else if (plant.status === 'warning') {
      cue    = 'warning';
      detail = `Peringatan. ${nama}${jenis}. Kelembaban tanah ${kel}, di luar ambang batas ideal. Sistem merekomendasikan penyiraman segera.`;
    } else {
      cue    = 'warning';
      detail = `Perhatian. ${nama}${jenis}. Data sensor tidak tersedia. Periksa koneksi perangkat IoT yang terpasang.`;
    }

    segs.push({
      text: detail,
      cue,
      plantIndex: idx,
      pauseBefore: 600,
      rate: cue === 'warning' ? VOICE_PRESETS.urgent.rate : VOICE_PRESETS.report.rate,
      pitch: cue === 'warning' ? VOICE_PRESETS.urgent.pitch : VOICE_PRESETS.report.pitch,
    });
  });

  // 5. Closing
  const closing = warn > 0
    ? `Laporan selesai. Ditemukan ${warn} anomali yang memerlukan perhatian Anda. Saya siap menerima instruksi lebih lanjut.`
    : `Laporan selesai. Semua sistem berjalan normal. Kebun Anda dalam kondisi prima. Selamat ${waktu}.`;

  segs.push({
    text: closing,
    cue: 'closing',
    plantIndex: null,
    pauseBefore: 800,
    rate: 0.98,
    pitch: 1.0,
  });

  return segs;
}

// ─────────────────────────────────────────────────────────────
// SPEECH ENGINE PLAYBACK (for multi-segment report)
// ─────────────────────────────────────────────────────────────

let _cancelFlag = false;

export async function playReport(segments, { onCue, onWord, onDone, onError } = {}) {
  if (!window.speechSynthesis) {
    onError?.('Text-to-Speech tidak didukung di browser ini.');
    return;
  }

  _cancelFlag = false;
  window.speechSynthesis.cancel();
  await sleep(200);

  await waitForVoices();

  for (let i = 0; i < segments.length; i++) {
    if (_cancelFlag) break;

    const seg = segments[i];

    if (seg.pauseBefore > 0) await sleep(seg.pauseBefore);
    if (_cancelFlag) break;

    onCue?.(seg.cue, seg.plantIndex, seg.text);

    await speakSegment(seg, onWord);
    if (_cancelFlag) break;
  }

  if (!_cancelFlag) onDone?.();
}

function speakSegment(seg, onWord) {
  return new Promise((resolve) => {
    if (_cancelFlag) { resolve(); return; }

    const utter      = new SpeechSynthesisUtterance(seg.text);
    utter.lang       = 'id-ID';
    utter.rate       = seg.rate  ?? 0.98;
    utter.pitch      = seg.pitch ?? 1.0;
    utter.volume     = 1;

    const bestVoice = window.takuVoice || getBestIndonesianVoice();
    if (bestVoice) utter.voice = bestVoice;

    utter.onboundary = (e) => {
      if (e.name === 'word') {
        const w = seg.text.substring(e.charIndex, e.charIndex + (e.charLength || 8)).trim();
        if (w) onWord?.(w);
      }
    };
    utter.onend   = () => resolve();
    utter.onerror = () => resolve();

    window.speechSynthesis.speak(utter);
  });
}

export function stopReport()   { _cancelFlag = true; window.speechSynthesis?.cancel(); }
export function pauseReport()  { window.speechSynthesis?.pause(); }
export function resumeReport() { window.speechSynthesis?.resume(); }
export function isSpeechSupported() { return Boolean(window.speechSynthesis); }

// ─────────────────────────────────────────────────────────────
// GREETING GENERATOR
// ─────────────────────────────────────────────────────────────

export function generateGreeting(plants = [], user = null) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Sahabat Kebun';
  const text = `Selamat datang, ${firstName}. Sistem aktif, semua sensor terhubung. Saya Taku, siap bantu apa pun yang kamu butuhkan di kebun hari ini.`;
  return {
    text,
    timeline: [
      { time: 0,    cue: 'system'   },
      { time: 1200, cue: 'greeting' },
      { time: 3000, cue: 'ready'    },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function waitForVoices(timeout = 2000) {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices() || [];
    if (voices.length > 0) { resolve(); return; }
    const handler = () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', handler);
      resolve();
    };
    window.speechSynthesis?.addEventListener('voiceschanged', handler);
    setTimeout(resolve, timeout);
  });
}
