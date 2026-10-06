import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import { waterPlantApi, fetchGardenAnalyticsApi } from '../services/plantService';
import CountUp from '../components/CountUp';
import JarvisReticle from '../components/taku/JarvisReticle';
import LiveOscillator from '../components/taku/LiveOscillator';
import '../css/app.css';

// ── Helpers Penilaian Skor Kebun (100% Identik dengan GardenAnalyticsPage) ──
function getGardenGrade(score, hasAnyData) {
  if (!hasAnyData || score === null || score === undefined) {
    return {
      label: 'Tanpa Data',
      desc: 'Belum ada sensor atau data analisa tanaman terhubung',
      color: '#64748B',
      bg: 'var(--color-surface)',
      border: 'var(--color-border)',
      tag: 'No Data',
    };
  }
  if (score >= 80) {
    return {
      label: 'Kondisi Sangat Baik',
      desc: 'Mayoritas tanaman dalam rentang optimal dan bebas penyakit',
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      tag: '100 - 80 (Baik)',
    };
  }
  if (score >= 50) {
    return {
      label: 'Butuh Perhatian',
      desc: 'Beberapa tanaman memerlukan penyesuaian air atau perawatan',
      color: '#D97706',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      tag: '79 - 50 (Perhatian)',
    };
  }
  return {
    label: 'Perlu Perhatian Serius',
    desc: 'Terdapat tanaman dalam kondisi kritis atau terindikasi penyakit',
    color: '#DC2626',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    tag: '49 - 0 (Kritis)',
  };
}

export default function DashboardPage() {
  const { user, plants, showToast, loadPlants, theme } = useApp();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'healthy' | 'warning' | 'no_sensor'
  const [wateringAll, setWateringAll] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Ambil data skor kebun kanonikal dari backend analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const data = await fetchGardenAnalyticsApi('all');
      setAnalytics(data);
    } catch (err) {
      console.warn('[DashboardPage] Gagal memuat analitik kebun:', err.message);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, plants]);

  useEffect(() => {
    const getGreeting = () => {
      const h = new Date().getHours();
      if (h < 11) return 'Selamat pagi';
      if (h < 15) return 'Selamat siang';
      if (h < 18) return 'Selamat sore';
      return 'Selamat malam';
    };
    setGreeting(getGreeting());
  }, []);

  const totalPlants = plants.length;
  const goodCount = plants.filter((p) => (p.condition ? p.condition === 'sehat' : p.status === 'good')).length;
  const warningCount = plants.filter((p) => (p.condition ? p.condition === 'kritis' || p.condition === 'perlu_perhatian' : p.status === 'warning')).length;
  const noSensorCount = plants.filter((p) => p.sensorNotConnected || !p.hasDevice).length;

  // Rata-rata kelembaban tanah dari tanaman dengan sensor aktif
  const plantsWithMoisture = plants.filter((p) => p.moisture !== null && p.moisture !== undefined);
  const avgMoisture = plantsWithMoisture.length
    ? Math.round(plantsWithMoisture.reduce((sum, p) => sum + p.moisture, 0) / plantsWithMoisture.length)
    : null;

  // Skor Kebun Kanonikal: dihitung langsung dari data tanaman aktif & disinkronkan dengan analitik
  const canonicalScore = useMemo(() => {
    if (!plants || plants.length === 0) return null;
    const scored = plants.filter((p) => p.healthScore != null);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, p) => sum + p.healthScore, 0) / scored.length;
    const unmonitoredCount = plants.filter((p) => p.condition === 'tidak_ada_data').length;
    const penalty = unmonitoredCount * 5;
    return Math.max(0, Math.min(100, Math.round(avg - penalty)));
  }, [plants]);

  const gardenScore = analytics?.gardenScore ?? canonicalScore;
  const hasAnyData = plants.some((p) => p.healthScore != null || p.moisture != null);
  const gardenGrade = getGardenGrade(gardenScore, hasAnyData);

  // Filter & Search
  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      // Filter kategori
      if (activeFilter === 'healthy' && plant.condition !== 'sehat') return false;
      if (activeFilter === 'warning' && plant.condition !== 'kritis' && plant.condition !== 'perlu_perhatian') return false;
      if (activeFilter === 'no_sensor' && !plant.sensorNotConnected && plant.hasDevice) return false;

      // Filter text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = plant.name?.toLowerCase().includes(q);
        const matchType = plant.type?.toLowerCase().includes(q);
        const matchVarietas = plant.varietas?.toLowerCase().includes(q);
        const matchLokasi = plant.lokasiBlok?.toLowerCase().includes(q);
        if (!matchName && !matchType && !matchVarietas && !matchLokasi) return false;
      }
      return true;
    });
  }, [plants, activeFilter, searchQuery]);

  // ── Efek partikel saat tombol diklik (daun / tetesan air) ──
  const spawnParticles = (e, type = 'leaf') => {
    const el = e?.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const count = type === 'water' ? 16 : 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = `fx-particle ${type}`;
      const angleDeg = -90 + (Math.random() - 0.5) * 150;
      const dist = 44 + Math.random() * 62;
      const rad = (angleDeg * Math.PI) / 180;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--tx', `${Math.cos(rad) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(rad) * dist}px`);
      p.style.setProperty('--rot', `${(Math.random() - 0.5) * 320}deg`);
      layer.appendChild(p);
      window.setTimeout(() => p.remove(), 1000);
    }
  };

  // ── 3D tilt halus pada kartu ──
  const handleTiltMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    card.style.setProperty('--tilt-y', `${(px - 0.5) * 8}deg`);
    card.style.setProperty('--tilt-x', `${(0.5 - py) * 8}deg`);
  };
  const handleTiltLeave = (e) => {
    e.currentTarget.style.setProperty('--tilt-x', '0deg');
    e.currentTarget.style.setProperty('--tilt-y', '0deg');
  };

  // ── Siram Satu Tanaman (Cek IoT Device Dulu) ──
  const handleWaterNow = async (e, plant) => {
    e.stopPropagation();
    const isDeviceConnected = Boolean(plant.hasDevice && plant.deviceId && plant.deviceId !== '-' && !plant.sensorNotConnected);
    if (!isDeviceConnected) {
      showToast(`⚠️ ${plant.name} belum memiliki perangkat sensor IoT yang terhubung. Hubungkan perangkat ESP32 terlebih dahulu.`, 'warning');
      return;
    }
    spawnParticles(e, 'water');
    try {
      await waterPlantApi(plant.id);
      showToast(`💧 ${plant.name} sedang disiram secara realtime!`, 'success');
      await loadPlants();
      loadAnalytics();
    } catch (err) {
      showToast(err.message || 'Gagal menyiram tanaman', 'error');
    }
  };

  // ── Siram Semua Tanaman yang Terhubung IoT Saja ──
  const handleWaterAll = async (e) => {
    spawnParticles(e, 'water');
    if (plants.length === 0) {
      showToast('Belum ada tanaman terdaftar.', 'info');
      return;
    }

    const connectedPlants = plants.filter(
      (p) => Boolean(p.hasDevice && p.deviceId && p.deviceId !== '-' && !p.sensorNotConnected)
    );

    if (connectedPlants.length === 0) {
      showToast('⚠️ Belum ada tanaman yang terhubung dengan perangkat IoT sensor. Siram tidak dapat dijalankan.', 'warning');
      return;
    }

    setWateringAll(true);
    try {
      for (const p of connectedPlants) {
        await waterPlantApi(p.id).catch(() => {});
      }
      const skippedCount = plants.length - connectedPlants.length;
      if (skippedCount > 0) {
        showToast(
          `💧 Perintah siram terkirim ke ${connectedPlants.length} tanaman terhubung (${skippedCount} pohon tanpa sensor dilewati).`,
          'success'
        );
      } else {
        showToast(`💧 Seluruh ${connectedPlants.length} tanaman sedang disiram!`, 'success');
      }
      await loadPlants();
      loadAnalytics();
    } catch (err) {
      showToast(err.message || 'Gagal menyiram tanaman', 'error');
    } finally {
      setWateringAll(false);
    }
  };

  const getMoistureColor = (pct, min, max) => {
    if (pct === null || pct === undefined) return '#94A3B8';
    if (pct < min) return '#EF4444';
    if (pct > max) return '#3B82F6';
    return '#10B981';
  };

  const getConditionBadgeStyle = (condition) => {
    if (condition === 'kritis') return { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)', label: '🚨 Kritis' };
    if (condition === 'perlu_perhatian') return { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', label: '⚠️ Perlu Cek' };
    if (condition === 'sehat') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: '🟢 Prima' };
    return { bg: 'var(--color-surface)', text: 'var(--color-text-muted)', border: 'var(--color-border)', label: '🔌 Tanpa Sensor' };
  };

  const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null || minutes >= 999) return 'Belum sync';
    if (minutes < 60) return `${minutes}m lalu`;
    const h = Math.floor(minutes / 60);
    return `${h}j lalu`;
  };

  return (
    <Layout title="Dashboard">
      <div className="dash-content is-ready" style={{ paddingBottom: '90px' }}>
        
        {/* ── 1. Top Greeting & Action Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, marginBottom: 20,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981', fontSize: '0.75rem', fontWeight: 800,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                  boxShadow: '0 0 8px #10B981', display: 'inline-block',
                }} />
                Live IoT Control Engine Online
              </span>
            </div>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
              {greeting}, {user?.name ? user.name.split(' ')[0] : 'Sahabat'} 👋
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Pantauan presisi kebun dan kesehatan tanaman.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => { spawnParticles(e, 'water'); handleWaterAll(e); }}
              disabled={wateringAll}
              style={{
                borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--color-card)', border: '1.5px solid var(--color-border)', color: '#3B8BF7',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <span>💧</span>
              <span>{wateringAll ? 'Menyiram...' : 'Siram Semua'}</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => { spawnParticles(e, 'leaf'); navigate('/manage-plants'); }}
              style={{ borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Tanaman
            </button>
          </div>
        </div>

        {/* ── 2. Hero Indeks Kesehatan Kebun Banner ── */}
        <div
          className={`hero-garden-card motion-fade-slide-up ${gardenScore !== null && gardenScore < 50 ? 'motion-pulse-urgent' : ''}`}
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #111e19 0%, #162c23 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 45%, #ECFDF5 100%)',
            borderRadius: 24, padding: '24px 28px',
            border: '1.5px solid var(--color-border)',
            boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(16, 185, 129, 0.07)',
            marginBottom: 24, position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Ambient subtle glow ring with ambient-drift */}
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
            animation: 'ambient-drift 8s ease-in-out infinite alternate',
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, alignItems: 'center' }}>
            
            {/* Left: Overall Garden Health Index Ring */}
            <div data-taku="garden-score" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                position: 'relative', width: 88, height: 88, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* JARVIS Rotating Reticle & Radar Sweep */}
                <JarvisReticle size={114} color={gardenGrade.color} radar={true} />

                <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
                  <circle cx="44" cy="44" r="36" stroke="var(--color-border)" strokeWidth="8" fill="none" />
                  <circle
                    cx="44" cy="44" r="36"
                    stroke={gardenGrade.color}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={hasAnyData && gardenScore !== null ? 2 * Math.PI * 36 * (1 - gardenScore / 100) : 2 * Math.PI * 36}
                    strokeLinecap="round"
                    fill="none"
                    style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center', zIndex: 2 }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                    <CountUp to={hasAnyData && gardenScore !== null ? gardenScore : null} duration={900} fallback="--" />
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 800, marginTop: 2 }}>SKOR</div>
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800, color: gardenGrade.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Indeks Kesehatan Kebun
                  </span>
                  <span className="jarvis-telemetry-badge" style={{ fontSize: '8px' }}>
                    <span className="jarvis-ping-dot" /> LIVE PROBE
                  </span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
                  {gardenGrade.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: 2 }}>
                  {totalPlants} Total Tanaman · {goodCount} Sehat · {warningCount} Perlu Atensi
                </div>
              </div>
            </div>

            {/* Right: Telemetry Grid (Total Tanaman, Kelembaban, Koneksi IoT) */}
            <div
              className="telemetry-card"
              data-taku="telemetry"
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: 10,
                background: 'var(--color-card)', padding: '16px 20px', borderRadius: 18,
                border: '1.5px solid var(--color-border)', boxShadow: 'var(--shadow-xs)',
                overflow: 'hidden',
              }}
            >
              {/* Corner Sci-Fi Brackets */}
              <div className="jarvis-corner-box">
                <i className="jarvis-corner tl" />
                <i className="jarvis-corner tr" />
                <i className="jarvis-corner bl" />
                <i className="jarvis-corner br" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Total Tanaman</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
                    <CountUp to={totalPlants} duration={850} suffix=" Pohon" />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 600 }}>Terdaftar</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Kelembaban Rata²</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3B8BF7', marginTop: 2 }}>
                    <CountUp to={avgMoisture} duration={900} suffix="%" fallback="--" />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Sensor Tanah</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Koneksi IoT</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10B981', marginTop: 2 }}>
                    <CountUp to={totalPlants - noSensorCount} duration={800} />/{totalPlants}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Unit Aktif</div>
                </div>
              </div>

              {/* JARVIS Live Signal Oscillator Sparkline */}
              <LiveOscillator label="LORA / MQTT TELEMETRY" frequency="915MHz ACTIVE" />
            </div>

          </div>
        </div>

        {/* ── 3. Interactive Search & Segmented Filter Bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 14, marginBottom: 20,
        }}>
          {/* Filter Pills */}
          <div
            className="segmented-filter-bar"
            style={{
              display: 'flex', gap: 6, background: 'var(--color-surface)', padding: '4px',
              borderRadius: 14, flexWrap: 'wrap', border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setActiveFilter('all')}
              className={`segmented-filter-btn interactive-tap ${activeFilter === 'all' ? 'active' : ''}`}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: activeFilter === 'all' ? 'var(--color-card)' : 'transparent',
                color: activeFilter === 'all' ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: activeFilter === 'all' ? 800 : 600,
                fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: activeFilter === 'all' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Semua Tanaman ({totalPlants})
            </button>
            <button
              onClick={() => setActiveFilter('healthy')}
              className={`segmented-filter-btn interactive-tap ${activeFilter === 'healthy' ? 'active' : ''}`}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: activeFilter === 'healthy' ? 'var(--color-card)' : 'transparent',
                color: activeFilter === 'healthy' ? '#10B981' : 'var(--color-text-muted)',
                fontWeight: activeFilter === 'healthy' ? 800 : 600,
                fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: activeFilter === 'healthy' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              🟢 Prima ({goodCount})
            </button>
            <button
              onClick={() => setActiveFilter('warning')}
              className={`segmented-filter-btn interactive-tap ${activeFilter === 'warning' ? 'active' : ''}`}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: activeFilter === 'warning' ? 'var(--color-card)' : 'transparent',
                color: activeFilter === 'warning' ? '#F59E0B' : 'var(--color-text-muted)',
                fontWeight: activeFilter === 'warning' ? 800 : 600,
                fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: activeFilter === 'warning' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              ⚠️ Perlu Cek ({warningCount})
            </button>
            {noSensorCount > 0 && (
              <button
                onClick={() => setActiveFilter('no_sensor')}
                className={`segmented-filter-btn interactive-tap ${activeFilter === 'no_sensor' ? 'active' : ''}`}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none',
                  background: activeFilter === 'no_sensor' ? 'var(--color-card)' : 'transparent',
                  color: activeFilter === 'no_sensor' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  fontWeight: activeFilter === 'no_sensor' ? 800 : 600,
                  fontSize: '0.8rem', cursor: 'pointer',
                  boxShadow: activeFilter === 'no_sensor' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                🔌 Tanpa Sensor ({noSensorCount})
              </button>
            )}
          </div>

          {/* Instant Search Bar */}
          <div style={{ position: 'relative', minWidth: 240, flex: 1, maxWidth: 360 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama, varietas, atau blok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '2.4rem', borderRadius: 14, height: 40,
                fontSize: '0.85rem', background: 'var(--color-card)',
                color: 'var(--color-text)', border: '1.5px solid var(--color-border)',
              }}
            />
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)', pointerEvents: 'none', display: 'flex',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── 4. Plants Grid (Luxury High-End Cards) ── */}
        {plants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-9" />
                <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
              </svg>
            </div>
            <h3>Tanamanmu masih kosong</h3>
            <p>Yuk daftarkan tanaman pertamamu dan nikmati sistem otomasi & diagnosa AI cerdas.</p>
            <button className="btn btn-primary mt-4" onClick={(e) => { spawnParticles(e, 'leaf'); navigate('/manage-plants'); }}>
              + Daftarkan Tanaman
            </button>
          </div>
        ) : filteredPlants.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px', background: 'var(--color-card)',
            borderRadius: 20, border: '1.5px dashed var(--color-border)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>Tidak ada tanaman ditemukan</h4>
            <p style={{ margin: '4px 0 16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Coba sesuaikan kata kunci pencarian atau ganti filter kategori di atas.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}>
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="plants-grid" id="plants-grid" role="list" aria-label="Daftar tanaman">
            {filteredPlants.map((plant, index) => {
              const condStyle = getConditionBadgeStyle(plant.condition);
              const isWarning = plant.condition === 'kritis' || plant.condition === 'perlu_perhatian';
              const mColor = getMoistureColor(plant.moisture, plant.moistureMin, plant.moistureMax);
              const isDry = plant.moisture !== null && plant.moisture < (plant.moistureMin || 50);

              return (
                <div
                  key={plant.id}
                  className="plant-card is-in"
                  data-taku-plant={plant.id}
                  onClick={() => navigate(`/plant-detail?id=${plant.id}`)}
                  role="listitem"
                  style={{
                    '--d': `${index * 0.08}s`,
                    background: 'var(--color-card)', borderRadius: 20,
                    border: '1.5px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                    position: 'relative', overflow: 'hidden', cursor: 'pointer',
                  }}
                  onMouseMove={handleTiltMove}
                  onMouseLeave={handleTiltLeave}
                >
                  {/* JARVIS Corner Sci-Fi Brackets */}
                  <div className="jarvis-corner-box">
                    <i className="jarvis-corner tl" />
                    <i className="jarvis-corner tr" />
                    <i className="jarvis-corner bl" />
                    <i className="jarvis-corner br" />
                  </div>

                  {/* Periodic JARVIS Diagnostic Scanline */}
                  <div className="jarvis-scanline" style={{ animationDelay: `${(index % 6) * 1.2}s` }} />

                  {/* Top status accent border */}
                  <div style={{
                    height: 4, width: '100%',
                    background: isWarning ? '#F59E0B' : plant.sensorNotConnected ? 'var(--color-text-muted)' : '#10B981',
                  }} />

                  <div style={{ padding: '18px' }}>
                    
                    {/* Card Header: Avatar, Name, Variety, and Health Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, overflow: 'hidden',
                        background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {plant.latestPhoto?.url ? (
                          <img
                            src={plant.latestPhoto.url}
                            alt={plant.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.8rem' }}>{plant.emoji || '🌱'}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <h3 style={{
                            margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {plant.name}
                          </h3>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem',
                            borderRadius: 8, background: condStyle.bg, color: condStyle.text,
                            border: `1px solid ${condStyle.border}`, flexShrink: 0,
                            animation: plant.condition === 'kritis' ? 'pulse-glow 1.8s ease-in-out infinite' : 'none',
                          }}>
                            {condStyle.label}
                          </span>
                        </div>

                        {/* Variety & Location Tags */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {plant.varietas ? (
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px',
                              borderRadius: 6, background: 'rgba(59, 139, 247, 0.15)', color: '#3B8BF7',
                            }}>
                              {plant.varietas}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              {plant.type}
                            </span>
                          )}
                          {plant.lokasiBlok && (
                            <span style={{
                              fontSize: '0.7rem', color: 'var(--color-text-sub)', background: 'var(--color-surface)',
                              padding: '1px 6px', borderRadius: 6, border: '1px solid var(--color-border)',
                            }}>
                              📍 {plant.lokasiBlok}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Skor Kesehatan Tanaman Sub-row */}
                    <div
                      className="plant-sub-box"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: 12, padding: '8px 12px', background: 'var(--color-surface)',
                        borderRadius: 10, fontSize: '0.75rem', border: '1px solid var(--color-border-soft)',
                      }}
                    >
                      <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        Skor Kesehatan Tanaman
                      </div>
                      <div style={{
                        fontWeight: 800,
                        color: plant.healthScore != null
                          ? (plant.healthScore >= 70 ? '#10B981' : plant.healthScore >= 40 ? '#F59E0B' : '#EF4444')
                          : 'var(--color-text-muted)',
                      }}>
                        {plant.healthScore != null ? `${plant.healthScore}/100` : '--'}
                      </div>
                    </div>

                    {/* Interactive Moisture Gauge */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          </svg>
                          Kelembaban Tanah
                        </span>
                        <span style={{ fontWeight: 800, color: mColor }}>
                          {plant.moisture !== null && plant.moisture !== undefined ? `${plant.moisture}%` : 'Sensor Offline'}
                        </span>
                      </div>

                      {/* Progress bar with shimmer-wrap overlay */}
                      <div
                        className="shimmer-wrap"
                        style={{
                          height: 8, width: '100%', background: 'var(--color-surface)',
                          borderRadius: 8, overflow: 'hidden', position: 'relative',
                          border: '1px solid var(--color-border-soft)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${plant.moisture !== null && plant.moisture !== undefined ? plant.moisture : 0}%`,
                            background: `linear-gradient(90deg, ${mColor}88, ${mColor})`,
                            borderRadius: 8, transition: 'width 0.8s ease-out',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                        <span>Min: {plant.moistureMin}%</span>
                        <span>Max: {plant.moistureMax}%</span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border-soft)',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {formatTime(plant.lastUpdate)}
                      </span>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => handleWaterNow(e, plant)}
                          aria-label={`Siram ${plant.name}`}
                          style={{
                            borderRadius: 8, fontWeight: 700, padding: '4px 8px',
                            background: isDry ? 'rgba(59, 139, 247, 0.15)' : 'var(--color-surface)',
                            color: isDry ? '#3B8BF7' : 'var(--color-text)',
                            border: isDry ? '1px solid rgba(59, 139, 247, 0.3)' : '1px solid var(--color-border)',
                          }}
                        >
                          💧 Siram
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => { e.stopPropagation(); navigate(`/plant-detail?id=${plant.id}`); }}
                          style={{ borderRadius: 8, fontWeight: 700, padding: '4px 8px' }}
                        >
                          Detail →
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </Layout>
  );
}