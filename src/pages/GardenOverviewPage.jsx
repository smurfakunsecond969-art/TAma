import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { waterPlantApi, analyzePlantPhotoApi } from '../services/plantService';
import '../css/app.css';

// ── Helpers ─────────────────────────────────────────────────

function getMoistureColor(pct, min, max) {
  if (pct === null || pct === undefined) return '#9CA3AF';
  if (pct < min) return '#F59E0B'; // Kering
  if (pct > max) return '#3B8BF7'; // Terlalu basah
  return '#10B981';                // Optimal
}

function getConditionColorHex(colorName) {
  if (colorName === 'red') return '#EF4444';
  if (colorName === 'yellow') return '#F59E0B';
  if (colorName === 'green') return '#10B981';
  return '#94A3B8';
}

function formatRelativeTime(minutes) {
  if (minutes === null || minutes === undefined) return '–';
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
}

// ── Interactive Comparative Moisture Chart ───────────────────

function MoistureComparisonChart({ plants, sortMode }) {
  const canvasRef = useRef(null);

  const sortedPlants = useMemo(() => {
    const list = [...plants].filter(p => p.moisture !== null && p.moisture !== undefined);
    if (sortMode === 'kering') return list.sort((a, b) => a.moisture - b.moisture);
    if (sortMode === 'basah') return list.sort((a, b) => b.moisture - a.moisture);
    // optimal: deviasi terkecil dari midpoint
    return list.sort((a, b) => {
      const midA = (a.moistureMin + a.moistureMax) / 2;
      const midB = (b.moistureMin + b.moistureMax) / 2;
      return Math.abs(a.moisture - midA) - Math.abs(b.moisture - midB);
    });
  }, [plants, sortMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sortedPlants.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const parentW = canvas.parentElement?.offsetWidth || 640;
    const W = Math.max(320, parentW);
    const H = 240;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 36, padR = 16, padT = 24, padB = 54;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = sortedPlants.length;
    const colW = chartW / n;
    const barW = Math.min(42, Math.max(20, colW * 0.58));

    // Horizontal grid lines
    [0, 25, 50, 75, 100].forEach(v => {
      const y = padT + chartH - (v / 100) * chartH;
      ctx.strokeStyle = v === 0 ? '#E2E8F0' : '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.setLineDash(v === 0 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${v}%`, padL - 6, y + 3);
    });

    // Draw bars
    sortedPlants.forEach((p, i) => {
      const cx = padL + colW * i + colW / 2;
      const x = cx - barW / 2;
      const pct = Math.min(100, Math.max(0, p.moisture || 0));
      const barH = (pct / 100) * chartH;
      const y = padT + chartH - barH;
      const min = p.moistureMin || 40;
      const max = p.moistureMax || 80;

      // Ideal range background band
      const yMin = padT + chartH - (min / 100) * chartH;
      const yMax = padT + chartH - (max / 100) * chartH;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(cx - barW / 2 - 4, yMax, barW + 8, yMin - yMax);

      // Ideal bounds lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cx - barW / 2 - 4, yMax);
      ctx.lineTo(cx + barW / 2 + 4, yMax);
      ctx.moveTo(cx - barW / 2 - 4, yMin);
      ctx.lineTo(cx + barW / 2 + 4, yMin);
      ctx.stroke();
      ctx.setLineDash([]);

      // Main Bar
      const color = getMoistureColor(p.moisture, min, max);
      const radius = Math.min(6, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, padT + chartH);
      ctx.lineTo(x, padT + chartH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, y, 0, padT + chartH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '77');
      ctx.fillStyle = grad;
      ctx.fill();

      // Top value
      ctx.fillStyle = color;
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, cx, Math.max(padT + 12, y - 6));

      // Label below (Emoji + Name)
      ctx.font = '14px serif';
      ctx.fillText(p.emoji || '🌱', cx, H - padB + 18);
      ctx.fillStyle = '#475569';
      ctx.font = '600 10px Plus Jakarta Sans, sans-serif';
      const label = p.name.length > 7 ? p.name.slice(0, 6) + '…' : p.name;
      ctx.fillText(label, cx, H - padB + 34);
    });
  }, [sortedPlants]);

  if (!sortedPlants.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💧</div>
        Belum ada data sensor kelembaban pada tanaman.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }} />
    </div>
  );
}

// ── Interactive Health Comparison Chart ───────────────────────

function HealthComparisonChart({ plants, sortMode }) {
  const sorted = useMemo(() => {
    const list = [...plants];
    if (sortMode === 'sehat') return list.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
    return list.sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0));
  }, [plants, sortMode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {sorted.map(p => {
        const score = p.healthScore;
        const color = getConditionColorHex(p.conditionColor);
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 110, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1rem' }}>{p.emoji || '🌱'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ flex: 1, height: 18, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  height: '100%',
                  width: `${score != null ? score : 0}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  borderRadius: 10,
                  transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>

            <div style={{ width: 56, textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color }}>
                {score != null ? score : '–'}
              </span>
              {score != null && <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>/100</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Category Modal Pop-up (4 Tipe) ───────────────────────────

function CategoryPlantsModal({ isOpen, type, plants, onClose, onWater, onCamera, onNavigateDetail, wateringId }) {
  if (!isOpen) return null;

  const typeConfig = {
    kritis: {
      title: '🚨 Tanaman Butuh Perhatian Khusus (Kritis / Sakit)',
      badge: 'Urgent Action',
      color: '#EF4444',
      bg: '#FEF2F2',
      desc: 'Tanaman dengan kadar kelembaban tanah ekstrem atau skor kesehatan rendah (< 40) yang butuh tindakan segera.',
    },
    perlu_perhatian: {
      title: '⚠️ Tanaman Perlu Perhatian / Terindikasi',
      badge: 'Perlu Cek',
      color: '#F59E0B',
      bg: '#FFFBEB',
      desc: 'Tanaman yang terindikasi masalah nutrisi, kekeringan ringan, atau gejala daun dari diagnosa AI.',
    },
    sehat: {
      title: '🌿 Tanaman Sehat & Kondisi Prima',
      badge: 'Sehat',
      color: '#10B981',
      bg: '#ECFDF5',
      desc: 'Tanaman dengan tingkat kelembaban optimal dan bebas dari gejala penyakit.',
    },
    tidak_ada_data: {
      title: '🔌 Tanpa Data / Sensor Belum Terhubung',
      badge: 'Belum Ada Data',
      color: '#64748B',
      bg: '#F8FAFC',
      desc: 'Tanaman yang belum terpasang sensor IoT dan belum pernah difoto untuk analisa AI.',
    },
  }[type] || {
    title: 'Daftar Tanaman',
    badge: 'Info',
    color: '#10B981',
    bg: '#F8FAFC',
    desc: 'Daftar tanaman terdaftar.',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', animation: 'modalIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', background: typeConfig.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{
              display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 20,
              fontSize: '0.75rem', fontWeight: 700, background: typeConfig.color, color: '#fff',
            }}>
              {typeConfig.badge} ({plants.length} Tanaman)
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.4rem 0 0.2rem' }}>
            {typeConfig.title}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
            {typeConfig.desc}
          </p>
        </div>

        {/* Modal Body: List Tanaman */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {plants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
              Tidak ada tanaman dalam kategori ini saat ini.
            </div>
          ) : (
            plants.map(p => {
              const scoreCol = getConditionColorHex(p.conditionColor);
              const isWatering = wateringId === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    padding: '1rem 1.15rem', borderRadius: 16, border: '1.5px solid #F1F5F9',
                    background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {p.latestPhoto?.url ? (
                        <img
                          src={p.latestPhoto.url}
                          alt={p.name}
                          style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }}
                        />
                      ) : (
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%', background: '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                        }}>
                          {p.emoji || '🌱'}
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                            {p.name}
                          </h4>
                          {p.sensorNotConnected && (
                            <span style={{
                              padding: '0.1rem 0.45rem', borderRadius: 6, fontSize: '0.68rem',
                              background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontWeight: 700,
                            }}>
                              Belum terhubung sensor
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {p.type || 'Tanaman Kebun'} {p.deviceId ? `· Sensor: ${p.deviceId}` : '· Tanpa Sensor'}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.2rem 0.6rem', borderRadius: 12, background: scoreCol + '1A',
                        color: scoreCol, fontWeight: 800, fontSize: '0.85rem',
                      }}>
                        {p.healthScore != null ? `Skor: ${p.healthScore}/100` : 'Tanpa Skor'}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                    <span style={{
                      padding: '0.25rem 0.55rem', borderRadius: 8, background: '#F8FAFC',
                      color: '#334155', fontWeight: 600, border: '1px solid #E2E8F0',
                    }}>
                      💧 Kelembaban: <strong>{p.moisture != null ? `${p.moisture}%` : '–'}</strong> (Ideal: {p.moistureMin || 40}-{p.moistureMax || 80}%)
                    </span>
                    {p.latestAnalysis && (
                      <span style={{
                        padding: '0.25rem 0.55rem', borderRadius: 8,
                        background: p.latestAnalysis.status === 'sehat' ? '#ECFDF5' : '#FEF2F2',
                        color: p.latestAnalysis.status === 'sehat' ? '#059669' : '#DC2626',
                        fontWeight: 600,
                      }}>
                        🦠 {p.latestAnalysis.disease_category || p.latestAnalysis.status}
                      </span>
                    )}
                  </div>

                  {p.latestAnalysis?.result && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                      <em>💡 AI: {p.latestAnalysis.result}</em>
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      onClick={(e) => onWater(e, p)}
                      disabled={isWatering}
                      style={{
                        flex: 1, minWidth: 110, padding: '0.5rem', borderRadius: 10,
                        background: '#3B82F6', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {isWatering ? 'Menyiram…' : '💧 Siram'}
                    </button>
                    <button
                      onClick={(e) => onCamera(e, p)}
                      style={{
                        flex: 1, minWidth: 120, padding: '0.5rem', borderRadius: 10,
                        background: '#8B5CF6', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      📷 Foto &amp; Diagnosa
                    </button>
                    <button
                      onClick={() => onNavigateDetail(p.id)}
                      style={{
                        padding: '0.5rem 0.85rem', borderRadius: 10,
                        background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1',
                        fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                      }}
                    >
                      Detail 🔍
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 12, background: '#F1F5F9',
              color: '#334155', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────

export default function GardenOverviewPage() {
  const { plants, plantsLoading, showToast, loadPlants } = useApp();
  const navigate = useNavigate();

  const [wateringId, setWateringId] = useState(null);
  const [healthSort, setHealthSort] = useState('sehat');      // 'sehat' | 'parah'
  const [moistureSort, setMoistureSort] = useState('kering'); // 'kering' | 'basah' | 'optimal'

  // Modal 4 Tipe Pop-up
  const [activeModalType, setActiveModalType] = useState(null);

  // Live Camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedPlantForCamera, setSelectedPlantForCamera] = useState(null);

  // 4 Kategori Tanaman Canonical directly using plant.condition from backend
  const categories = useMemo(() => {
    const kritis = [];
    const perlu_perhatian = [];
    const sehat = [];
    const tidak_ada_data = [];

    plants.forEach(p => {
      const cond = p.condition || 'tidak_ada_data';
      if (cond === 'kritis') kritis.push(p);
      else if (cond === 'perlu_perhatian') perlu_perhatian.push(p);
      else if (cond === 'sehat') sehat.push(p);
      else tidak_ada_data.push(p);
    });

    return { kritis, perlu_perhatian, sehat, tidak_ada_data };
  }, [plants]);

  const handleWater = useCallback(async (e, plant) => {
    e?.stopPropagation?.();
    if (wateringId) return;
    setWateringId(plant.id);
    try {
      await waterPlantApi(plant.id);
      showToast(`💧 ${plant.name} sedang disiram`, 'success');
      await loadPlants();
    } catch (err) {
      showToast(err.message || 'Gagal menyiram tanaman', 'error');
    } finally {
      setWateringId(null);
    }
  }, [wateringId, showToast, loadPlants]);

  const handleOpenPlantCamera = (e, plant) => {
    e?.stopPropagation?.();
    setSelectedPlantForCamera(plant);
    setIsCameraOpen(true);
  };

  const handleLiveCameraCaptured = async (file) => {
    if (!selectedPlantForCamera) return;
    showToast(`🔍 Menganalisis foto ${selectedPlantForCamera.name} dengan AI...`, 'info');
    try {
      await analyzePlantPhotoApi(selectedPlantForCamera.id, file);
      showToast(`✅ Diagnosa AI selesai untuk ${selectedPlantForCamera.name}!`, 'success');
      await loadPlants();
    } catch (err) {
      showToast(err.message || 'Gagal menganalisis foto tanaman.', 'error');
    }
  };

  if (plants.length === 0 && !plantsLoading) {
    return (
      <Layout title="Tanaman Saya">
        <div className="empty-state" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
          <h3>Belum Ada Tanaman Terdaftar</h3>
          <p style={{ color: '#64748B', maxWidth: 420, margin: '0.5rem auto 1.5rem' }}>
            Tambahkan tanaman pertamamu untuk mulai memantau skor kesehatan dan kelembaban tiap pohon.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/manage-plants')}>
            + Tambah Tanaman
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Tanaman Saya">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              🌿 Tanaman Saya
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '2px 0 0' }}>
              Monitoring individual setiap pohon, komparasi kelembaban &amp; skor kesehatan
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/manage-plants')}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: 12, background: '#10B981', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              + Kelola Tanaman
            </button>
            <button
              onClick={() => loadPlants()}
              style={{
                padding: '0.5rem 0.8rem', borderRadius: 12, background: '#F1F5F9', color: '#334155',
                border: '1px solid #E2E8F0', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* ── 1. 4 Kategori Pop-up Cards ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Kategori Status Tanaman</span>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Klik kartu untuk melihat pop-up rincian</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {/* Kritis */}
            <div
              onClick={() => setActiveModalType('kritis')}
              style={{
                background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 16,
                padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(239,68,68,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>🚨</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#DC2626' }}>
                  {categories.kritis.length}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#991B1B', marginTop: '0.4rem' }}>
                Kritis / Sakit
              </div>
              <div style={{ fontSize: '0.72rem', color: '#EF4444' }}>
                Urgent Action →
              </div>
            </div>

            {/* Perlu Perhatian */}
            <div
              onClick={() => setActiveModalType('perlu_perhatian')}
              style={{
                background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 16,
                padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(245,158,11,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#D97706' }}>
                  {categories.perlu_perhatian.length}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400E', marginTop: '0.4rem' }}>
                Perlu Perhatian
              </div>
              <div style={{ fontSize: '0.72rem', color: '#F59E0B' }}>
                Cek Diagnosa AI →
              </div>
            </div>

            {/* Sehat */}
            <div
              onClick={() => setActiveModalType('sehat')}
              style={{
                background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 16,
                padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(16,185,129,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>🌿</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
                  {categories.sehat.length}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065F46', marginTop: '0.4rem' }}>
                Kondisi Sehat
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10B981' }}>
                Kondisi Prima →
              </div>
            </div>

            {/* Tanpa Data */}
            <div
              onClick={() => setActiveModalType('tidak_ada_data')}
              style={{
                background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 16,
                padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>🔌</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#64748B' }}>
                  {categories.tidak_ada_data.length}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Tanpa Data
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Sensor Belum Ada →
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Skor Kesehatan Setiap Tanaman & Tabel Pembanding ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20, padding: '1.5rem',
          border: '1.5px solid #E2E8F0', marginBottom: '1.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                📊 Skor Kesehatan Tanaman
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Skor mandiri setiap pohon &amp; perbandingan performa kesehatan
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setHealthSort('sehat')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                  background: healthSort === 'sehat' ? '#10B981' : '#F1F5F9',
                  color: healthSort === 'sehat' ? '#fff' : '#475569',
                  border: 'none', cursor: 'pointer',
                }}
              >
                🏆 Paling Sehat
              </button>
              <button
                onClick={() => setHealthSort('parah')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                  background: healthSort === 'parah' ? '#EF4444' : '#F1F5F9',
                  color: healthSort === 'parah' ? '#fff' : '#475569',
                  border: 'none', cursor: 'pointer',
                }}
              >
                ⚠️ Paling Butuh Perhatian
              </button>
            </div>
          </div>

          {/* Comparative visual bar meter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <HealthComparisonChart plants={plants} sortMode={healthSort} />
          </div>

          {/* Table Breakdown */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Tanaman</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Skor</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>Diagnosa Terakhir</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {plants.map(p => {
                  const score = p.healthScore;
                  const color = getConditionColorHex(p.conditionColor);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{p.emoji || '🌱'}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.name}</span>
                              {p.sensorNotConnected && (
                                <span style={{
                                  fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: 4,
                                  background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
                                }}>
                                  Tanpa Sensor
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{p.type || 'Umum'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', width: 34, height: 34, lineHeight: '34px',
                          borderRadius: '50%', background: color + '1F', color: color,
                          fontWeight: 800, fontSize: '0.85rem',
                        }}>
                          {score != null ? score : '–'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                          background: color + '15', color: color,
                        }}>
                          {p.conditionLabel || 'Belum Ada Data'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#475569', fontSize: '0.8rem', maxWidth: 220 }}>
                        {p.latestAnalysis?.result
                          ? p.latestAnalysis.result.slice(0, 50) + '…'
                          : 'Belum ada analisa foto'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/plant-detail?id=${p.id}`)}
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: 8, background: '#F1F5F9',
                            border: '1px solid #E2E8F0', color: '#334155', fontSize: '0.78rem',
                            fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Detail →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 3. Perbandingan Kelembaban Tanah / Kadar Air ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20, padding: '1.5rem',
          border: '1.5px solid #E2E8F0', marginBottom: '1.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                💧 Perbandingan Kelembaban &amp; Kadar Air
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Zona hijau transparan menunjukkan rentang ideal masing-masing tanaman
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setMoistureSort('kering')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                  background: moistureSort === 'kering' ? '#F59E0B' : '#F1F5F9',
                  color: moistureSort === 'kering' ? '#fff' : '#475569',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Paling Kering
              </button>
              <button
                onClick={() => setMoistureSort('basah')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                  background: moistureSort === 'basah' ? '#3B82F6' : '#F1F5F9',
                  color: moistureSort === 'basah' ? '#fff' : '#475569',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Paling Basah
              </button>
              <button
                onClick={() => setMoistureSort('optimal')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                  background: moistureSort === 'optimal' ? '#10B981' : '#F1F5F9',
                  color: moistureSort === 'optimal' ? '#fff' : '#475569',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Paling Optimal
              </button>
            </div>
          </div>

          <MoistureComparisonChart plants={plants} sortMode={moistureSort} />
        </div>

        {/* ── 4. Kartu Semua Tanaman (Aksi Cepat) ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              🌳 Semua Tanaman Terdaftar ({plants.length})
            </h3>
            <button
              onClick={() => navigate('/manage-plants')}
              style={{
                background: 'none', border: 'none', color: '#10B981', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Kelola Tanaman →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {plants.map(plant => {
              const score = plant.healthScore;
              const scoreCol = getConditionColorHex(plant.conditionColor);
              const isWatering = wateringId === plant.id;
              const hasMoisture = plant.moisture !== null && plant.moisture !== undefined;

              return (
                <div
                  key={plant.id}
                  style={{
                    background: '#FFFFFF', borderRadius: 20, border: '1.5px solid #E2E8F0',
                    padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {plant.latestPhoto?.url ? (
                        <img
                          src={plant.latestPhoto.url}
                          alt={plant.name}
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                        }}>
                          {plant.emoji || '🌱'}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                          {plant.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{plant.type || 'Tanaman'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        padding: '0.2rem 0.55rem', borderRadius: 10,
                        background: scoreCol + '1A', color: scoreCol, fontWeight: 800, fontSize: '0.8rem',
                      }}>
                        {score != null ? `${score}/100` : 'Tanpa Data'}
                      </div>
                    </div>
                  </div>

                  {/* Badge sensorNotConnected */}
                  {plant.sensorNotConnected && (
                    <div style={{
                      fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 6,
                      background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
                      fontWeight: 700, display: 'inline-block', width: 'fit-content',
                    }}>
                      🔌 Belum terhubung ke sensor
                    </div>
                  )}

                  {/* Moisture Status */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: '#64748B' }}>Kelembaban Tanah</span>
                      <strong style={{ color: getMoistureColor(plant.moisture, plant.moistureMin || 40, plant.moistureMax || 80) }}>
                        {hasMoisture ? `${plant.moisture}%` : 'Tanpa Sensor'}
                      </strong>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${hasMoisture ? Math.min(100, plant.moisture) : 0}%`,
                          background: getMoistureColor(plant.moisture, plant.moistureMin || 40, plant.moistureMax || 80),
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8', marginTop: 3 }}>
                      <span>Ideal: {plant.moistureMin || 40}% - {plant.moistureMax || 80}%</span>
                      <span>{plant.lastUpdate != null ? formatRelativeTime(plant.lastUpdate) : '–'}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                    <button
                      onClick={(e) => handleWater(e, plant)}
                      disabled={isWatering}
                      style={{
                        flex: 1, padding: '0.45rem', borderRadius: 10,
                        background: '#3B82F6', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      {isWatering ? '💧…' : '💧 Siram'}
                    </button>
                    <button
                      onClick={(e) => handleOpenPlantCamera(e, plant)}
                      style={{
                        flex: 1, padding: '0.45rem', borderRadius: 10,
                        background: '#8B5CF6', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      📷 Foto AI
                    </button>
                    <button
                      onClick={() => navigate(`/plant-detail?id=${plant.id}`)}
                      style={{
                        padding: '0.45rem 0.65rem', borderRadius: 10,
                        background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0',
                        fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 4 Category Modal Pop-up ── */}
      <CategoryPlantsModal
        isOpen={Boolean(activeModalType)}
        type={activeModalType}
        plants={activeModalType ? categories[activeModalType] : []}
        onClose={() => setActiveModalType(null)}
        onWater={handleWater}
        onCamera={handleOpenPlantCamera}
        onNavigateDetail={(id) => {
          setActiveModalType(null);
          navigate(`/plant-detail?id=${id}`);
        }}
        wateringId={wateringId}
      />

      {/* ── Live Camera Capture Modal ── */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handleLiveCameraCaptured}
        title={`Diagnosa AI — ${selectedPlantForCamera?.name || 'Tanaman'}`}
        subtitle="Ambil foto daun untuk didiagnosa AI &amp; diperbarui fotonya"
        confirmLabel="Diagnosa Foto AI"
      />
    </Layout>
  );
}
