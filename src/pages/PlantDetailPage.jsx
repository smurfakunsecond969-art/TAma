import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import CameraCaptureModal from '../components/CameraCaptureModal';
import {
  fetchPlantById,
  waterPlantApi,
  toggleAutoWaterApi,
  fetchPlantChartHistory,
  analyzePlantPhotoApi,
  addPlantPhotoDocApi,
  fetchPlantPhotosApi,
} from '../services/plantService';
import '../css/app.css';

export default function PlantDetailPage() {
  const { showToast, user, loadPlants } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const plantId = query.get('id');

  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState('daily');
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [watering, setWatering] = useState(false);
  const [waterMsg, setWaterMsg] = useState('');
  const canvasRef = useRef(null);

  // Photo & AI Analysis States
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showPhotoDocModal, setShowPhotoDocModal] = useState(false);
  const [photoDocFile, setPhotoDocFile] = useState(null);
  const [photoDocPreview, setPhotoDocPreview] = useState(null);
  const [photoDocCatatan, setPhotoDocCatatan] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Live Web Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraPurpose, setCameraPurpose] = useState('analyze'); // 'analyze' or 'doc'
  const [showProfileModal, setShowProfileModal] = useState(false);

  const docInputRef = useRef(null);

  // Load photos
  const loadPhotos = async () => {
    if (!plantId) return;
    setPhotosLoading(true);
    try {
      const data = await fetchPlantPhotosApi(plantId);
      setPhotos(data || []);
    } catch (err) {
      console.error('Gagal load foto tanaman:', err.message);
    } finally {
      setPhotosLoading(false);
    }
  };

  // Eksekusi proses analisa AI pada file
  const executeAnalyze = async (file) => {
    if (!file) return;
    setAnalyzing(true);
    showToast('🔍 Menganalisis foto tanaman dengan AI...', 'info');

    try {
      const res = await analyzePlantPhotoApi(plantId, file);
      setAnalysisResult({
        photoUrl: res.photo?.photo_url,
        hasil: res.hasil,
        status: res.status,
        healthScore: res.healthScore,
        diseaseCategory: res.diseaseCategory,
        saran: res.saran,
        analyzedAt: new Date().toISOString(),
      });
      showToast('✅ Diagnosa AI selesai!', 'success');
      loadPhotos();
      loadPlant();
      if (typeof loadPlants === 'function') loadPlants();
    } catch (err) {
      showToast(err.message || 'Gagal menganalisis foto tanaman.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // Handler foto dari Kamera Web
  const handleLivePhotoCaptured = (file) => {
    if (cameraPurpose === 'analyze') {
      executeAnalyze(file);
    } else {
      setPhotoDocFile(file);
      setPhotoDocPreview(URL.createObjectURL(file));
      setShowPhotoDocModal(true);
    }
  };

  // Submit foto dokumentasi
  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!photoDocFile) {
      showToast('Pilih foto terlebih dahulu.', 'error');
      return;
    }

    setUploadingDoc(true);
    try {
      await addPlantPhotoDocApi(plantId, photoDocFile, photoDocCatatan);
      showToast('📸 Foto dokumentasi berhasil disimpan.', 'success');
      setShowPhotoDocModal(false);
      setPhotoDocFile(null);
      setPhotoDocPreview(null);
      setPhotoDocCatatan('');
      loadPhotos();
      loadPlant();
      if (typeof loadPlants === 'function') loadPlants();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan foto.', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Load data tanaman
  const loadPlant = async () => {
    if (!plantId) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPlantById(plantId);
      if (!data) {
        showToast('Tanaman tidak ditemukan', 'error');
        navigate('/dashboard');
        return;
      }
      setPlant(data);
    } catch (err) {
      showToast(err.message || 'Gagal memuat data tanaman', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlant();
    loadPhotos();
  }, [plantId]);

  // Load chart history
  useEffect(() => {
    if (!plantId) return;
    const fetchChart = async () => {
      setChartLoading(true);
      try {
        const data = await fetchPlantChartHistory(plantId, chartMode);
        setChartData(data);
      } catch (err) {
        console.error('Chart history fetch error:', err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchChart();
  }, [plantId, chartMode]);

  // Draw chart
  useEffect(() => {
    if (!chartData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.offsetWidth || 400;
    const H = 200;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 36, padR = 16, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const data = chartData.data || [];

    if (data.length < 2) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Data riwayat sensor belum cukup', W / 2, H / 2);
      return;
    }

    // Grid lines
    [0, 25, 50, 75, 100].forEach((v) => {
      const y = padT + chartH - (v / 100) * chartH;
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${v}%`, padL - 6, y + 3);
    });

    // Draw line
    const points = data.map((d, i) => {
      const x = padL + (i / (data.length - 1)) * chartW;
      const y = padT + chartH - ((d.value || 0) / 100) * chartH;
      return { x, y, label: d.label, val: d.value };
    });

    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Points & labels
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, p.x, H - 10);
      }
    });
  }, [chartData]);

  const handleWaterNow = async () => {
    if (watering || !plant) return;
    setWatering(true);
    setWaterMsg('Mengirim perintah penyiraman...');
    try {
      await waterPlantApi(plant.id);
      showToast(`💧 Perintah terkirim: ${plant.name} sedang disiram`, 'success');
      setTimeout(async () => {
        await loadPlant();
        setWaterMsg('');
        setWatering(false);
      }, 3000);
    } catch (err) {
      showToast(err.message || 'Gagal mengirim perintah siram', 'error');
      setWaterMsg('');
      setWatering(false);
    }
  };

  const handleAutoWaterToggle = async (e) => {
    const enabled = e.target.checked;
    try {
      await toggleAutoWaterApi(plant.id, enabled);
      setPlant((prev) => ({ ...prev, autoWater: enabled }));
      showToast(
        enabled ? '🤖 Siram otomatis diaktifkan' : '⏸️ Siram otomatis dinonaktifkan',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Gagal mengubah mode siram', 'error');
    }
  };

  if (loading || !plant) {
    return (
      <Layout title="Detail Tanaman">
        <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94A3B8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌿</div>
          <div style={{ fontWeight: 700, color: '#334155' }}>Memuat Detail Tanaman...</div>
        </div>
      </Layout>
    );
  }

  const hasMoisture = plant.moisture !== null && plant.moisture !== undefined;
  const isWarning = plant.condition === 'kritis' || plant.condition === 'perlu_perhatian';
  const mColor = hasMoisture
    ? plant.moisture < plant.moistureMin
      ? '#F59E0B'
      : plant.moisture > plant.moistureMax
      ? '#3B82F6'
      : '#10B981'
    : '#94A3B8';

  // Gauge values
  const r = 48;
  const c = 2 * Math.PI * r;
  const pct = hasMoisture ? Math.min(100, Math.max(0, plant.moisture)) : 0;
  const dash = (pct / 100) * c;

  const formatDate = (dStr) => {
    if (!dStr) return '–';
    return new Date(dStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dStr) => {
    if (!dStr) return '–';
    return new Date(dStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null || minutes >= 999) return 'Belum sync';
    if (minutes < 60) return `${minutes} menit lalu`;
    return `${Math.floor(minutes / 60)} jam lalu`;
  };

  return (
    <Layout title={`Detail: ${plant.name}`}>
      {/* Hidden file input for upload */}
      <input
        type="file"
        accept="image/*"
        ref={docInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPhotoDocFile(file);
            setPhotoDocPreview(URL.createObjectURL(file));
            setShowPhotoDocModal(true);
          }
        }}
        style={{ display: 'none' }}
      />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>

        {/* ── 1. Clean Detail Header Card ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 24, padding: '1.5rem',
          border: '1.5px solid #E2E8F0', marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
            
            {/* Plant Info Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 260 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 20, overflow: 'hidden',
                background: '#F1F5F9', border: '2px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {plant.latestPhoto?.url || (photos && photos[0]?.photo_url) ? (
                  <img
                    src={plant.latestPhoto?.url || photos[0]?.photo_url}
                    alt={plant.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '2.2rem' }}>{plant.emoji || '🌱'}</span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                    {plant.name}
                  </h1>

                  {/* Health Score Badge */}
                  {plant.healthScore != null && (
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: 10,
                      background: plant.conditionColor === 'red' ? '#FEF2F2' : plant.conditionColor === 'yellow' ? '#FFFBEB' : '#ECFDF5',
                      color: plant.conditionColor === 'red' ? '#DC2626' : plant.conditionColor === 'yellow' ? '#D97706' : '#059669',
                      border: `1px solid ${plant.conditionColor === 'red' ? '#FCA5A5' : plant.conditionColor === 'yellow' ? '#FDE68A' : '#A7F3D0'}`,
                    }}>
                      Skor: {plant.healthScore}/100 ({plant.conditionLabel || 'Sehat'})
                    </span>
                  )}

                  {plant.sensorNotConnected && (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 6,
                      background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
                    }}>
                      🔌 Belum Ada Sensor
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: 8, fontSize: '0.8rem', color: '#64748B' }}>
                  <span style={{ background: '#F1F5F9', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600 }}>
                    🌿 {plant.type || 'Tanaman'} {plant.varietas ? `(${plant.varietas})` : ''}
                  </span>
                  {plant.fasePertumbuhan && (
                    <span style={{ background: '#ECFDF5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600, border: '1px solid #A7F3D0' }}>
                      🌱 {plant.fasePertumbuhan.split(' ')[0]}
                    </span>
                  )}
                  {plant.lokasiBlok && (
                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600, border: '1px solid #BFDBFE' }}>
                      📍 {plant.lokasiBlok}
                    </span>
                  )}
                  <button
                    onClick={() => setShowProfileModal(true)}
                    style={{
                      background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0',
                      padding: '0.15rem 0.6rem', borderRadius: 6, fontWeight: 700,
                      cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    📖 Baca Keterangan & Profil Tanaman
                  </button>
                  <span>📅 Tanam: {formatDate(plant.startDate)}</span>
                  <span>📟 {plant.deviceId ? `ID: ${plant.deviceId}` : 'Tanpa Sensor'}</span>
                </div>
              </div>
            </div>

            {/* 2 Clear Action Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleWaterNow}
                disabled={watering}
                style={{
                  padding: '0.6rem 1.15rem', borderRadius: 12,
                  background: '#3B82F6', color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                }}
              >
                {watering ? (
                  <span>💧 Menyiram…</span>
                ) : (
                  <>
                    <span>💧</span>
                    <span>Siram Tanaman</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setCameraPurpose('analyze');
                  setIsCameraOpen(true);
                }}
                disabled={analyzing}
                style={{
                  padding: '0.6rem 1.15rem', borderRadius: 12,
                  background: 'linear-gradient(135deg, #7E22CE, #9333EA)',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(147,51,234,0.3)',
                }}
              >
                {analyzing ? (
                  <span>🔍 Menganalisis…</span>
                ) : (
                  <>
                    <span>📷</span>
                    <span>Foto &amp; Diagnosa AI</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {waterMsg && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
              {waterMsg}
            </div>
          )}
        </div>

        {/* ── 2. Grid: Kelembaban & Kontrol ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Kolom Kiri: Gauge & Grafik Tren */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Current Moisture Gauge Card */}
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: '1.25rem',
              border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                💧 Kelembaban Tanah Saat Ini
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="55" cy="55" r={r} fill="none" stroke="#F1F5F9" strokeWidth="10" />
                    <circle
                      cx="55" cy="55" r={r} fill="none" stroke={mColor} strokeWidth="10"
                      strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>
                      {hasMoisture ? `${plant.moisture}%` : '–'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Kadar Air</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <span style={{ color: '#64748B' }}>Status Kadar:</span>
                    <strong style={{ color: mColor }}>
                      {hasMoisture
                        ? plant.moisture < plant.moistureMin
                          ? 'Terlalu Kering'
                          : plant.moisture > plant.moistureMax
                          ? 'Terlalu Basah'
                          : 'Optimal'
                        : 'Tanpa Data'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <span style={{ color: '#64748B' }}>Rentang Ideal:</span>
                    <strong>{plant.moistureMin}% - {plant.moistureMax}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <span style={{ color: '#64748B' }}>Sync Sensor:</span>
                    <span>{formatTime(plant.lastUpdate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tren Kelembaban (Canvas Chart) */}
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: '1.25rem',
              border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                  📈 Tren Kelembaban
                </h3>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: 2, borderRadius: 10 }}>
                  <button
                    onClick={() => setChartMode('daily')}
                    style={{
                      padding: '0.25rem 0.65rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                      background: chartMode === 'daily' ? '#fff' : 'transparent',
                      color: chartMode === 'daily' ? '#0F172A' : '#64748B',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Harian
                  </button>
                  <button
                    onClick={() => setChartMode('weekly')}
                    style={{
                      padding: '0.25rem 0.65rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                      background: chartMode === 'weekly' ? '#fff' : 'transparent',
                      color: chartMode === 'weekly' ? '#0F172A' : '#64748B',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Mingguan
                  </button>
                </div>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                {chartLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                    Memuat grafik…
                  </div>
                ) : (
                  <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
                )}
              </div>
            </div>

          </div>

          {/* Kolom Kanan: Kontrol & Pengaturan Tanaman */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: '1.5rem',
              border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                ⚙️ Pengaturan &amp; Irigasi Otomatis
              </h3>

              {/* Auto Water toggle */}
              <div style={{
                background: '#F8FAFC', padding: '1rem', borderRadius: 14,
                border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                    🤖 Siram Hingga Optimal
                  </div>
                  <label className="toggle" style={{ margin: 0 }}>
                    <input type="checkbox" checked={plant.autoWater} onChange={handleAutoWaterToggle} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                  Sistem IoT akan otomatis menyiram saat kadar air turun di bawah batas minimum ({plant.moistureMin}%) hingga kembali optimal.
                </p>
              </div>

              {/* Device & Hardware Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Perangkat IoT</span>
                  <strong>{plant.deviceId || 'Belum Terpasang'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Status Sensor</span>
                  <span style={{
                    fontWeight: 700, color: plant.hasDevice ? '#10B981' : '#F59E0B',
                  }}>
                    {plant.hasDevice ? 'Terhubung Aktif' : 'Belum Terhubung'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Ambang Batas</span>
                  <strong>Min {plant.moistureMin}% · Max {plant.moistureMax}%</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <button
                  onClick={() => navigate('/manage-plants')}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: 12,
                    background: '#F1F5F9', border: '1px solid #E2E8F0',
                    color: '#334155', fontWeight: 700, fontSize: '0.82rem',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  ✏️ Edit Parameter &amp; Sensor Tanaman
                </button>
              </div>
            </div>

            {/* Riwayat Penyiraman Singkat */}
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: '1.25rem',
              border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                  🚿 Riwayat Siram Terkini
                </h3>
                <Link to="/history" style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 700, textDecoration: 'none' }}>
                  Semua Riwayat →
                </Link>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {(!plant.waterLog || plant.waterLog.length === 0) ? (
                  <p style={{ margin: 0, padding: '0.5rem 0', color: '#94A3B8' }}>Belum ada log penyiraman.</p>
                ) : (
                  plant.waterLog.slice(0, 4).map((log) => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #F8FAFC' }}>
                      <span>{log.type === 'auto' ? '🤖 Otomatis' : '💧 Manual'}</span>
                      <span style={{ color: '#94A3B8' }}>{formatDateTime(log.time)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ── 3. Memori & Diagnosa Foto Tanaman ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 24, padding: '1.5rem',
          border: '1.5px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                📸 Memori Foto &amp; Diagnosa AI
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Riwayat dokumentasi visual dan hasil diagnosa daun pohon ini
              </p>
            </div>

            <button
              onClick={() => setShowPhotoDocModal(true)}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: 12, background: '#F1F5F9',
                border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 700,
                fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              + Upload Foto Lapangan
            </button>
          </div>

          {photosLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
              Memuat foto…
            </div>
          ) : photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
              <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>Belum Ada Foto Tanaman</div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', maxWidth: 360, margin: '4px auto 1rem' }}>
                Foto daun untuk mendiagnosa kesehatan tanaman atau upload foto dokumentasi lapangan.
              </p>
              <button
                onClick={() => {
                  setCameraPurpose('analyze');
                  setIsCameraOpen(true);
                }}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 12, background: '#8B5CF6',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                📷 Ambil Foto AI Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {photos.map((item) => {
                const isAi = item.is_analysis_photo;
                const hasAnalysis = Boolean(item.analysis);
                const statusColor = item.analysis?.status === 'sehat'
                  ? '#10B981'
                  : item.analysis?.status === 'terindikasi_penyakit'
                  ? '#EF4444'
                  : '#F59E0B';

                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden',
                      background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', height: 160, background: '#F1F5F9' }}>
                      <img
                        src={item.photo_url}
                        alt="Foto Tanaman"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: 12,
                          background: isAi ? statusColor : 'rgba(0,0,0,0.65)',
                          color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                        }}>
                          {isAi ? (item.analysis?.disease_category || 'Diagnosa AI') : 'Dokumentasi'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 4 }}>
                          {formatDateTime(item.created_at)}
                        </div>
                        {item.catatan && (
                          <div style={{ fontSize: '0.82rem', color: '#334155', fontStyle: 'italic', marginBottom: 6 }}>
                            &ldquo;{item.catatan}&rdquo;
                          </div>
                        )}
                        {hasAnalysis && (
                          <div style={{
                            fontSize: '0.78rem', color: '#475569', background: '#F8FAFC',
                            padding: '0.5rem', borderRadius: 8, borderLeft: `3px solid ${statusColor}`,
                            lineHeight: 1.4,
                          }}>
                            {item.analysis.hasil_analisis?.slice(0, 80)}…
                          </div>
                        )}
                      </div>

                      {hasAnalysis && (
                        <button
                          onClick={() => setAnalysisResult({
                            photoUrl: item.photo_url,
                            hasil: item.analysis.hasil_analisis,
                            status: item.analysis.status,
                            healthScore: item.analysis.health_score,
                            diseaseCategory: item.analysis.disease_category,
                            saran: item.analysis.saran,
                            analyzedAt: item.analysis.analyzed_at,
                          })}
                          style={{
                            marginTop: '0.5rem', background: 'none', border: 'none',
                            color: '#3B82F6', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', textAlign: 'left', padding: 0,
                          }}
                        >
                          Lihat Detail AI →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Modal: Hasil Diagnosa AI ── */}
      {analysisResult && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={() => setAnalysisResult(null)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 24, maxWidth: 520, width: '100%',
              maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                🔬 Hasil Diagnosa AI
              </div>
              <button
                onClick={() => setAnalysisResult(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {analysisResult.photoUrl && (
              <img
                src={analysisResult.photoUrl}
                alt="Foto"
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 16, marginBottom: '1rem' }}
              />
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.65rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 800,
                background: analysisResult.status === 'sehat' ? '#ECFDF5' : '#FEF2F2',
                color: analysisResult.status === 'sehat' ? '#059669' : '#DC2626',
              }}>
                {analysisResult.diseaseCategory || analysisResult.status}
              </span>
              {analysisResult.healthScore != null && (
                <span style={{
                  padding: '0.25rem 0.65rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 800,
                  background: '#F1F5F9', color: '#0F172A',
                }}>
                  Skor: {analysisResult.healthScore}/100
                </span>
              )}
            </div>

            <div style={{
              background: '#F8FAFC', padding: '1rem', borderRadius: 14,
              fontSize: '0.88rem', lineHeight: 1.5, color: '#334155', marginBottom: '1.25rem',
            }}>
              {analysisResult.hasil}
            </div>

            {analysisResult.saran && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.85rem',
                borderRadius: 12, fontSize: '0.82rem', color: '#92400E', marginBottom: '1.25rem',
              }}>
                💡 <strong>Saran Perawatan:</strong> {analysisResult.saran}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setAnalysisResult(null)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 10, background: '#F1F5F9',
                  border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  navigate('/taku');
                }}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 10, background: '#10B981',
                  color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                }}
              >
                💬 Tanya Taku AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Tambah Foto Dokumentasi Lapangan ── */}
      {showPhotoDocModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={() => setShowPhotoDocModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 24, maxWidth: 480, width: '100%',
              padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                Tambah Foto Tanaman
              </h3>
              <button
                onClick={() => setShowPhotoDocModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDocSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                {photoDocPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
                    <img src={photoDocPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDocFile(null);
                        setPhotoDocPreview(null);
                      }}
                      style={{
                        position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)',
                        color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraPurpose('doc');
                        setIsCameraOpen(true);
                      }}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: 12, background: '#10B981',
                        color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      📷 Buka Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: 12, background: '#F1F5F9',
                        color: '#334155', border: '1px solid #E2E8F0', fontWeight: 700,
                        fontSize: '0.85rem', cursor: 'pointer',
                      }}
                    >
                      📁 Pilih dari File
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#475569' }}>
                  Catatan Lapangan (Opsional)
                </label>
                <textarea
                  style={{
                    width: '100%', borderRadius: 12, padding: '0.6rem', border: '1px solid #CBD5E1',
                    fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', minHeight: 70,
                  }}
                  placeholder="Contoh: Daun baru mulai tumbuh subur..."
                  value={photoDocCatatan}
                  onChange={(e) => setPhotoDocCatatan(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPhotoDocModal(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10, background: '#F1F5F9',
                    border: 'none', color: '#64748B', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !photoDocFile}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: 10, background: '#10B981',
                    color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                    opacity: (!photoDocFile || uploadingDoc) ? 0.6 : 1,
                  }}
                >
                  {uploadingDoc ? 'Menyimpan…' : 'Simpan Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Keterangan & Profil Karakteristik Tanaman ── */}
      {showProfileModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 24, padding: '24px',
            maxWidth: 540, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1.5px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: '#ECFDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                  border: '1px solid #A7F3D0',
                }}>
                  {plant.emoji || '🌱'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Profil & Karakteristik Tanaman
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Informasi agronomis pohon untuk AI & tim perawatan
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: '#F1F5F9', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#64748B', cursor: 'pointer', fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>Nama Tanaman</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{plant.name}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>Jenis / Komoditas</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{plant.type || '-'}</div>
              </div>
              <div style={{ background: '#EFF6FF', padding: '12px 14px', borderRadius: 14, border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '0.7rem', color: '#1D4ED8', fontWeight: 700 }}>Varietas / Kultivar</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E40AF', marginTop: 2 }}>{plant.varietas || 'Tidak dispesifikasikan'}</div>
              </div>
              <div style={{ background: '#ECFDF5', padding: '12px 14px', borderRadius: 14, border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700 }}>Fase Pertumbuhan</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065F46', marginTop: 2 }}>{plant.fasePertumbuhan || 'Vegetatif'}</div>
              </div>
            </div>

            {/* Additional details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>🪴 Media Tanam & Tipe Tanah</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                  {plant.mediaTanam || 'Tanah Lempung Berpasir (Standar Kebun)'}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>📍 Lokasi Kebun / Blok / Bedeng</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                  {plant.lokasiBlok || 'Area Kebun Utama'}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>💧 Ambang Kelembaban Sensor Optimal</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284C7', marginTop: 2 }}>
                  {plant.moistureMin}% – {plant.moistureMax}%
                </div>
              </div>

              <div style={{ background: '#FFFBEB', padding: '12px 14px', borderRadius: 14, border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '0.7rem', color: '#B45309', fontWeight: 700 }}>📝 Catatan & Riwayat Perlakuan Khusus</div>
                <div style={{ fontSize: '0.85rem', color: '#78350F', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {plant.catatan || 'Belum ada catatan perlakuan khusus yang ditambahkan.'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', borderRadius: 12, padding: '10px' }}
            >
              Tutup Informasi
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Live Camera Capture ── */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handleLivePhotoCaptured}
        title={cameraPurpose === 'analyze' ? 'Kamera AI Diagnosa Tanaman' : 'Kamera Foto Lapangan'}
        subtitle={
          cameraPurpose === 'analyze'
            ? 'Ambil foto daun untuk didiagnosa AI secara instan'
            : 'Ambil foto kondisi terkini pohon untuk dokumentasi'
        }
        confirmLabel={cameraPurpose === 'analyze' ? 'Diagnosa dengan AI' : 'Simpan Foto'}
      />
    </Layout>
  );
}
