/**
 * takuScripts.js — Skrip adegan Taku.
 *
 *  - startGardenReport()  : laporan kebun sambil keliling aplikasi
 *  - startPresentation()  : demo lengkap untuk presentasi lomba
 *
 * Teks narasi untuk presentasi ada di blok PRESENTATION_TEXT di bawah —
 * edit di sana untuk menyesuaikan nama tim, masalah, dan dampak.
 */
import { runScenes, askConfirm } from './takuDirector';
import { runtime, getTakuState } from './takuStore';
import { waterPlantApi } from './plantService';

// ─────────────────────────────────────────────────────────────
// TEKS PRESENTASI (EDIT DI SINI)
// ─────────────────────────────────────────────────────────────
export const PRESENTATION_TEXT = {
  opening:
    'Selamat datang. Saya Taku, asisten kecerdasan buatan dari Tanamanku. Hari ini saya akan menunjukkan bagaimana sebuah kebun bisa dipantau, dipahami, dan dirawat secara otomatis.',
  problem:
    'Banyak petani dan pemilik kebun kehilangan tanaman karena terlambat menyiram, atau menyiram berlebihan. Mereka tidak bisa memantau setiap pohon, setiap saat.',
  solution:
    'Tanamanku menjawab masalah itu. Sensor tanah mengirim data langsung, dan saya menerjemahkannya menjadi tindakan nyata.',
  controlIntro:
    'Saya juga bisa mengendalikan aplikasi ini. Perhatikan, saya akan mengubah tampilan menjadi mode malam.',
  controlBack: 'Dan kembali ke mode terang.',
  chat:
    'Jika butuh konsultasi, tanyakan apa saja kepada saya. Dari penyebab daun menguning sampai jadwal pemupukan, saya siap membantu kapan pun.',
  closing:
    'Itulah Tanamanku. Kebun yang berbicara, dan asisten yang bertindak. Terima kasih.',
};

// ─────────────────────────────────────────────────────────────
// HELPER DATA
// ─────────────────────────────────────────────────────────────
function classify(p) {
  const m = p.moisture;
  if (m === null || m === undefined) return 'nodata';
  const min = p.moistureMin ?? 40;
  const max = p.moistureMax ?? 80;
  if (m < min) return 'dry';
  if (m > max) return 'wet';
  return 'ok';
}

function summarize(plants) {
  const withData = plants.filter((p) => p.moisture !== null && p.moisture !== undefined);
  const avg = withData.length
    ? Math.round(withData.reduce((s, p) => s + p.moisture, 0) / withData.length)
    : null;
  const dry = plants.filter((p) => classify(p) === 'dry');
  const wet = plants.filter((p) => classify(p) === 'wet');
  const nodata = plants.filter((p) => classify(p) === 'nodata');
  const attention = dry.length + wet.length + nodata.length;
  const score = plants.length
    ? Math.max(0, Math.min(100, Math.round(100 - (attention / plants.length) * 60 - (dry.length / plants.length) * 20)))
    : 0;
  const driest = withData.length ? withData.reduce((a, b) => (b.moisture < a.moisture ? b : a)) : null;
  return { total: plants.length, avg, dry, wet, nodata, attention, ok: plants.length - attention, score, driest, connected: plants.length - nodata.length };
}

function plantLine(p) {
  const kind = classify(p);
  const m = p.moisture;
  const min = p.moistureMin ?? 40;
  const max = p.moistureMax ?? 80;
  if (kind === 'ok') return `${p.name}. Kelembaban ${m} persen, berada di rentang ideal. Tidak perlu tindakan.`;
  if (kind === 'dry') return `Perhatian. ${p.name} kelembabannya ${m} persen, di bawah batas ideal ${min} persen. Tanaman ini perlu disiram.`;
  if (kind === 'wet') return `${p.name} kelembabannya ${m} persen, melebihi batas ${max} persen. Tanah terlalu basah, tunda penyiraman.`;
  return `Perhatian. Sensor ${p.name} tidak mengirim data. Periksa perangkat IoT yang terpasang.`;
}

// ─────────────────────────────────────────────────────────────
// ADEGAN LAPORAN KEBUN
// ─────────────────────────────────────────────────────────────
export function buildReportScenes(plants, { withIntro = true, withAsk = true } = {}) {
  const s = summarize(plants);
  const scenes = [];

  if (!plants.length) {
    return [
      {
        chapter: 'LAPORAN KEBUN',
        route: '/manage-plants',
        say: 'Belum ada tanaman terdaftar di kebun ini. Tambahkan tanaman pertama untuk mulai pemantauan.',
      },
    ];
  }

  if (withIntro) {
    scenes.push({
      chapter: 'BAB 01 — INISIALISASI',
      route: '/dashboard',
      say: 'Sistem aktif. Saya mulai menganalisis seluruh kebun. Mohon tunggu sebentar.',
      preset: 'greeting',
      hold: 300,
    });
  }

  scenes.push({
    chapter: 'BAB 02 — INDEKS KESEHATAN',
    route: '/dashboard',
    target: "[data-taku='garden-score']",
    label: 'SKOR KEBUN',
    say: `Skor kesehatan kebun saat ini ${s.score} dari 100. Dari ${s.total} tanaman, ${s.ok} dalam kondisi baik dan ${s.attention} memerlukan perhatian.`,
    preset: s.attention > 0 ? 'urgent' : 'jarvis',
  });

  scenes.push({
    chapter: 'BAB 03 — TELEMETRI SENSOR',
    route: '/dashboard',
    target: "[data-taku='telemetry']",
    label: 'DATA SENSOR LIVE',
    say: `${s.avg !== null ? `Kelembaban rata-rata ${s.avg} persen. ` : ''}${s.connected} dari ${s.total} perangkat sensor terhubung dan mengirim data secara langsung.`,
  });

  // Tanaman bermasalah diutamakan, maksimal 4 agar durasi terkendali
  const ordered = [...plants].sort((a, b) => (classify(a) === 'ok') - (classify(b) === 'ok'));
  const shown = ordered.slice(0, 4);
  shown.forEach((p, i) => {
    scenes.push({
      chapter: `BAB 04 — TANAMAN ${i + 1} DARI ${shown.length}`,
      route: '/dashboard',
      target: `[data-taku-plant='${p.id}']`,
      label: p.name.toUpperCase(),
      say: plantLine(p),
      preset: classify(p) === 'ok' ? 'report' : 'urgent',
    });
  });

  if (s.driest) {
    scenes.push({
      chapter: 'BAB 05 — ANALISIS MENDALAM',
      route: `/plant-detail?id=${s.driest.id}`,
      target: "[data-taku='moisture-gauge']",
      label: 'KELEMBABAN TANAH',
      say: `Ini detail ${s.driest.name}, tanaman dengan kelembaban terendah. Kelembaban ${s.driest.moisture} persen, sedangkan rentang idealnya ${s.driest.moistureMin ?? 40} sampai ${s.driest.moistureMax ?? 80} persen.`,
    });
  }

  scenes.push({
    chapter: 'BAB 06 — PERBANDINGAN KEBUN',
    route: '/garden',
    target: "[data-taku='moisture-chart']",
    label: 'GRAFIK KELEMBABAN',
    say: 'Grafik ini membandingkan kelembaban seluruh tanaman terhadap batas idealnya, sehingga tanaman yang menyimpang langsung terlihat.',
  });

  if (withAsk && s.dry.length > 0) {
    const target = s.dry.reduce((a, b) => (b.moisture < a.moisture ? b : a));
    scenes.push({
      chapter: 'REKOMENDASI TINDAKAN',
      run: async () => {
        const yes = await askConfirm(`Laporan selesai. Mau saya siram ${target.name} sekarang?`);
        if (yes) {
          try {
            await waterPlantApi(target.id);
            runtime.showToast?.(`💧 ${target.name} berhasil disiram!`, 'success');
            await runtime.loadPlants?.();
          } catch (err) {
            runtime.showToast?.(`Gagal menyiram: ${err.message}`, 'error');
          }
        }
      },
    });
  } else {
    scenes.push({
      chapter: 'LAPORAN SELESAI',
      say: s.attention > 0
        ? `Laporan selesai. Ada ${s.attention} tanaman yang perlu dicek. Saya siap menerima instruksi.`
        : 'Laporan selesai. Seluruh sistem berjalan normal dan kebun Anda dalam kondisi prima.',
      hold: 400,
    });
  }

  return scenes;
}

export function startGardenReport() {
  return runScenes(buildReportScenes(runtime.plants || []));
}

// ─────────────────────────────────────────────────────────────
// ADEGAN PRESENTASI LOMBA
// ─────────────────────────────────────────────────────────────
export function buildPresentationScenes(plants) {
  const T = PRESENTATION_TEXT;
  const scenes = [
    { chapter: 'PEMBUKAAN', route: '/dashboard', say: T.opening, preset: 'greeting', hold: 400 },
    { chapter: 'MASALAH', say: T.problem },
    { chapter: 'SOLUSI', target: "[data-taku='garden-score']", label: 'TANAMANKU', say: T.solution },
    ...buildReportScenes(plants, { withIntro: false, withAsk: false }),
    {
      chapter: 'KENDALI PENUH',
      target: "[data-taku='theme-toggle']",
      label: 'KENDALI TAKU',
      say: T.controlIntro,
      click: true,
      afterClick: 1400,
    },
    {
      chapter: 'KENDALI PENUH',
      target: "[data-taku='theme-toggle']",
      label: 'KENDALI TAKU',
      say: T.controlBack,
      click: true,
      afterClick: 900,
    },
    {
      chapter: 'KONSULTASI AI',
      route: '/taku',
      target: "[data-taku='chat-input']",
      label: 'TANYA TAKU',
      say: T.chat,
    },
    { chapter: 'PENUTUP', route: '/dashboard', say: T.closing, preset: 'greeting', hold: 800 },
  ];
  return scenes;
}

export function startPresentation() {
  if (getTakuState().presenting) return;
  return runScenes(buildPresentationScenes(runtime.plants || []));
}
