// reportTemplates.js - Template Laporan Instan & Dialog Taku AI (Zero Latency)

const REPORT_TEMPLATES = {
  semuaSehat: [
    "Laporan kebunmu keren banget hari ini! Semua {total} tanaman dalam kondisi baik, skor kesehatan kebun ada di {skor}. Gak ada yang butuh perhatian khusus sekarang 🌱",
    "Kabar baik! Dari {total} tanaman yang kamu punya, semuanya sehat dengan skor kebun {skor}. Kebunmu lagi dalam kondisi terbaik nih.",
  ],
  adaPerluPerhatian: [
    "Oke, laporan kebunmu siap! Dari {total} tanaman, skor kesehatan kebun ada di {skor}. {baikCount} tanaman kondisinya oke, tapi {warningCount} butuh perhatian - terutama {namaKritis}, kelembabannya udah di {kelembabanKritis} persen. Mau langsung gw siram sekarang?",
    "Ini update kebunmu: skor kesehatan {skor} dari {total} tanaman. {warningCount} tanaman perlu dicek, paling mendesak {namaKritis} di {kelembabanKritis} persen kelembaban. Gimana, mau gw tindak lanjuti?",
  ],
  siramBerhasil: [
    "Sip, {namaTanaman} udah gw siram sekarang!",
    "Beres, penyiraman {namaTanaman} udah gw jalankan.",
  ],
  siramSemuaBerhasil: [
    "Oke, {jumlah} tanaman udah gw siram semua barusan!",
  ],
  autoWaterAktif: [
    "Siap, mode siram otomatis untuk {namaTanaman} sudah diaktifkan.",
    "Mode siram otomatis {namaTanaman} sekarang aktif!",
  ],
  autoWaterNonaktif: [
    "Baik, mode siram otomatis untuk {namaTanaman} telah dinonaktifkan.",
    "Mode siram otomatis {namaTanaman} sekarang nonaktif.",
  ],
  halamanNavigasi: [
    "Siap, membuka halaman {halaman}.",
    "Oke, kita beralih ke {halaman} sekarang.",
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export function buildGardenReportText(data) {
  if (!data || data.total === 0) {
    return "Kamu belum memiliki tanaman yang terdaftar di kebunmu. Yuk tambahkan tanaman terlebih dahulu!";
  }
  const kategori = (data.warningCount > 0 && data.namaKritis) ? 'adaPerluPerhatian' : 'semuaSehat';
  const template = pickRandom(REPORT_TEMPLATES[kategori]);
  return fillTemplate(template, data);
}

export function buildWateringConfirmText(namaTanaman) {
  return fillTemplate(pickRandom(REPORT_TEMPLATES.siramBerhasil), { namaTanaman });
}

export function buildWaterAllConfirmText(jumlah) {
  return fillTemplate(pickRandom(REPORT_TEMPLATES.siramSemuaBerhasil), { jumlah });
}

export function buildAutoWaterConfirmText(namaTanaman, enabled) {
  const category = enabled ? REPORT_TEMPLATES.autoWaterAktif : REPORT_TEMPLATES.autoWaterNonaktif;
  return fillTemplate(pickRandom(category), { namaTanaman });
}

export function buildNavigateConfirmText(halaman) {
  return fillTemplate(pickRandom(REPORT_TEMPLATES.halamanNavigasi), { halaman });
}

export function computeGardenReportData(plants) {
  if (!plants || plants.length === 0) {
    return { total: 0, skor: 0, baikCount: 0, warningCount: 0, namaKritis: '', kelembabanKritis: '' };
  }

  let totalScore = 0;
  for (const p of plants) {
    const m = p.moisture;
    const min = p.moistureMin ?? 40;
    const max = p.moistureMax ?? 80;
    if (m === null || m === undefined) {
      totalScore += 40;
    } else if (m < min) {
      const gap = min - m;
      totalScore += Math.max(0, 100 - gap * 3);
    } else if (m > max) {
      const gap = m - max;
      totalScore += Math.max(0, 100 - gap * 2);
    } else {
      const centre = (min + max) / 2;
      const range = (max - min) / 2 || 1;
      const deviation = Math.abs(m - centre) / range;
      totalScore += 100 - deviation * 20;
    }
  }
  const skor = Math.round(totalScore / plants.length);
  const warningPlants = plants.filter((p) => p.status === 'warning' || (p.moisture !== null && p.moisture < (p.moistureMin ?? 40)));
  const warningCount = warningPlants.length;
  const baikCount = plants.length - warningCount;

  const plantsWithMoisture = plants.filter((p) => p.moisture !== null && p.moisture !== undefined);
  const driest = plantsWithMoisture.length
    ? plantsWithMoisture.reduce((min, p) => (p.moisture < min.moisture ? p : min))
    : (warningPlants[0] || null);

  return {
    total: plants.length,
    skor,
    baikCount,
    warningCount,
    namaKritis: driest?.name || (warningPlants[0]?.name ?? ''),
    kelembabanKritis: driest?.moisture !== null && driest?.moisture !== undefined ? driest.moisture : (warningPlants[0]?.moisture ?? ''),
  };
}
