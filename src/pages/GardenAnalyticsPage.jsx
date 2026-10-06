import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  fetchGardenAnalyticsApi,
  fetchPendingCheckinApi,
  saveTreatmentLogApi,
  resolveCheckinApi,
  fetchTreatmentHistoryApi,
} from '../services/plantService';

// ── Helpers & Styling ────────────────────────────────────────

function getGardenGrade(score, hasAnyData) {
  if (!hasAnyData || score === null || score === undefined) {
    return {
      label: 'No Data',
      desc: 'Belum ada sensor atau data analisa tanaman terhubung',
      color: '#94A3B8',
      bg: '#F8FAFC',
      border: '#E2E8F0',
      tag: 'Tanpa Data',
    };
  }
  if (score >= 80) {
    return {
      label: 'Kondisi Baik',
      desc: 'Mayoritas tanaman dalam rentang optimal dan bebas penyakit',
      color: '#10B981',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      tag: '100 - 80 (Baik)',
    };
  }
  if (score >= 50) {
    return {
      label: 'Butuh Perhatian',
      desc: 'Beberapa tanaman memerlukan penyesuaian air atau perawatan ringan',
      color: '#F59E0B',
      bg: '#FFFBEB',
      border: '#FDE68A',
      tag: '79 - 50 (Perhatian)',
    };
  }
  return {
    label: 'Perlu Perhatian Serius',
    desc: 'Terdapat tanaman dalam kondisi kritis atau terindikasi penyakit serius',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    tag: '49 - 0 (Kritis)',
  };
}

// ── Modern Animated Radial Gauge Chart for Garden Score ───────

function GardenTotalRadialChart({ score, hasData }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!hasData || score === null) {
      setAnimatedScore(0);
      return;
    }
    let current = 0;
    const target = Math.min(100, Math.max(0, score));
    const step = Math.max(1, target / 35);
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, 20);
    return () => clearInterval(interval);
  }, [score, hasData]);

  const grade = getGardenGrade(score, hasData);
  const radius = 78;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  // Use a 270 degree arc (3/4 circle)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - ((hasData ? animatedScore : 0) / 100) * arcLength;

  return (
    <div style={{ position: 'relative', width: 220, height: 200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Decorative breathing aura ring */}
      <div style={{
        position: 'absolute', width: 196, height: 196, borderRadius: '50%',
        border: `2px solid ${grade.color}35`,
        animation: 'taku-breathe 2.8s ease-in-out infinite',
        boxShadow: `0 0 18px ${grade.color}20`,
        pointerEvents: 'none',
      }} />
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(135deg)', overflow: 'visible', position: 'relative', zIndex: 1 }}>
        {/* Background track */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Animated Score Bar */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke={grade.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease',
            filter: `drop-shadow(0 4px 10px ${grade.color}40)`,
          }}
        />
      </svg>

      {/* Center Label Display */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingTop: 14, zIndex: 2,
      }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
          {hasData && score !== null ? animatedScore : '–'}
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', marginTop: 4 }}>
          / 100
        </div>
        <div style={{
          marginTop: 6, padding: '0.2rem 0.65rem', borderRadius: 20,
          background: grade.bg, color: grade.color, border: `1px solid ${grade.border}`,
          fontWeight: 800, fontSize: '0.75rem',
        }}>
          {grade.label}
        </div>
      </div>
    </div>
  );
}

// ── Modern Interactive Disease Donut Chart ───────────────────

const DISEASE_PALETTE = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#14B8A6'];

function DiseaseDonutChart({ data }) {
  const canvasRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);

  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data]);

  useEffect(() => {
    let start = null;
    let frameId = null;
    const duration = 850;
    const step = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const p = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setAnimProgress(ease);
      if (p < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setAnimProgress(1);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 180;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 8;
    const innerR = outerR * 0.62;

    let startAngle = -Math.PI / 2;

    data.forEach((item, i) => {
      const isHovered = hoverIndex === i;
      const sliceAngle = (item.count / total) * 2 * Math.PI * animProgress;
      const r = isHovered ? outerR + 4 : outerR;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = DISEASE_PALETTE[i % DISEASE_PALETTE.length];
      ctx.fill();

      // Inner divider line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Donut hole cut
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(total * animProgress), cx, cy - 6);

    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Kasus Terdata', cx, cy + 12);
  }, [data, total, hoverIndex, animProgress]);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍃</div>
        <div style={{ fontWeight: 700, color: '#475569' }}>Belum Ada Pola Penyakit Terdeteksi</div>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '4px 0 0' }}>
          Ambil foto tanaman di Tanaman Saya untuk diagnosa AI otomatis
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>

      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {data.map((item, i) => {
          const color = DISEASE_PALETTE[i % DISEASE_PALETTE.length];
          const pct = Math.round((item.count / total) * 100);
          const isHovered = hoverIndex === i;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.45rem 0.75rem', borderRadius: 12,
                background: isHovered ? '#F8FAFC' : 'transparent',
                border: isHovered ? `1.5px solid ${color}40` : '1.5px solid transparent',
                transition: 'all 0.15s ease', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>{item.category}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{item.count}x</span>
                <span style={{
                  padding: '0.15rem 0.45rem', borderRadius: 6,
                  background: color + '15', color, fontWeight: 800, fontSize: '0.75rem',
                }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Interactive Check-in Popup ────────────────────────────────

function CheckinPopup({ items, onDismiss, onSubmit, onResolve }) {
  const [current, setCurrent] = useState(0);
  const [step, setStep] = useState('ask'); // 'ask' | 'input' | 'done'
  const [treatmentText, setTreatmentText] = useState('');
  const [saving, setSaving] = useState(false);

  const item = items[current];
  if (!item) return null;

  async function handleSubmitTreatment() {
    if (!treatmentText.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        analysisId: item.analysisId,
        plantId: item.plantId,
        treatmentText: treatmentText.trim(),
        scoreBefore: item.healthScore,
      });
      setStep('done');
      setTimeout(() => {
        setTreatmentText('');
        if (current + 1 < items.length) {
          setCurrent(current + 1);
          setStep('ask');
        } else {
          onDismiss();
        }
      }, 1500);
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve() {
    try {
      await onResolve(item.analysisId);
    } catch (e) {}
    onDismiss();
  }

  return (
    <div style={{
      position: 'fixed', bottom: 85, left: '50%', transform: 'translateX(-50%)',
      width: 'min(440px, 94vw)', background: '#FFFFFF',
      borderRadius: 20, boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
      padding: '1.25rem 1.5rem', zIndex: 1100,
      border: '1.5px solid #F59E0B',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔔 Cek Kondisi &amp; Perawatan Tanaman
          </span>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: '2px 0 0', color: '#0F172A' }}>
            {item.plantName}
          </h3>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94A3B8' }}>
          ✕
        </button>
      </div>

      {step === 'ask' && (
        <>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
            Terindikasi <strong>{item.diseaseCategory || item.status}</strong> dengan skor kesehatan{' '}
            <strong style={{ color: '#EF4444' }}>{item.healthScore}/100</strong>. Sudah dikasih perawatan?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStep('input')}
              style={{
                flex: 1, minWidth: 100, padding: '0.6rem', borderRadius: 12,
                background: '#10B981', color: '#fff', border: 'none', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              ✅ Sudah Dirawat
            </button>
            <button
              onClick={onDismiss}
              style={{
                flex: 1, minWidth: 90, padding: '0.6rem', borderRadius: 12,
                background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 600,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Belum
            </button>
            <button
              onClick={handleResolve}
              style={{
                width: '100%', padding: '0.45rem', borderRadius: 10,
                background: 'none', border: '1px solid #E2E8F0', color: '#64748B',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Tandai Masalah Selesai
            </button>
          </div>
        </>
      )}

      {step === 'input' && (
        <>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
            Tindakan perawatan apa yang sudah diberikan?
          </p>
          <textarea
            value={treatmentText}
            onChange={(e) => setTreatmentText(e.target.value)}
            placeholder="Contoh: Semprot fungisida nabati, kurangi penyiraman, pangkas ranting kuning..."
            rows={3}
            style={{
              width: '100%', borderRadius: 12, padding: '0.6rem',
              border: '1.5px solid #E2E8F0', background: '#F8FAFC',
              fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={handleSubmitTreatment}
              disabled={saving || !treatmentText.trim()}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 12,
                background: '#10B981', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {saving ? 'Menyimpan…' : '💾 Simpan Catatan'}
            </button>
            <button
              onClick={() => setStep('ask')}
              style={{
                padding: '0.6rem 1rem', borderRadius: 12,
                background: '#F1F5F9', color: '#64748B', border: 'none', cursor: 'pointer',
              }}
            >
              Batal
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '0.75rem 0', color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>
          ✅ Catatan penanganan berhasil disimpan ke riwayat!
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────

export default function GardenAnalyticsPage() {
  const navigate = useNavigate();

  const [period, setPeriod]             = useState('week');
  const [analytics, setAnalytics]       = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [checkinItems, setCheckinItems] = useState([]);
  const [showCheckin, setShowCheckin]   = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const loadData = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, historyData] = await Promise.all([
        fetchGardenAnalyticsApi(p),
        fetchTreatmentHistoryApi(),
      ]);
      setAnalytics(analyticsData);
      setHistory(historyData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  // Check-in popup 1x per session
  useEffect(() => {
    if (sessionStorage.getItem('checkin_shown')) return;
    fetchPendingCheckinApi()
      .then((items) => {
        if (items && items.length > 0) {
          setCheckinItems(items);
          setShowCheckin(true);
          sessionStorage.setItem('checkin_shown', '1');
        }
      })
      .catch(() => {});
  }, []);

  // Canonical breakdown stats directly from backend response
  const counts = analytics?.counts || { sehat: 0, perlu_perhatian: 0, kritis: 0, tidak_ada_data: 0, total: 0 };
  const hasAnyData = (counts.sehat + counts.perlu_perhatian + counts.kritis) > 0;
  const gardenScore = analytics?.gardenScore ?? null;
  const dailySummary = analytics?.dailySummary || null;

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(h =>
      h.plantName?.toLowerCase().includes(q) ||
      h.treatmentText?.toLowerCase().includes(q) ||
      h.analysis?.disease_category?.toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  async function handleCheckinSubmit(data) {
    await saveTreatmentLogApi(data);
    loadData(period);
  }

  async function handleCheckinResolve(analysisId) {
    await saveTreatmentLogApi({
      analysisId,
      plantId: checkinItems.find(c => c.analysisId === analysisId)?.plantId,
      treatmentText: 'Ditandai selesai secara manual',
    });
    await resolveCheckinApi(analysisId);
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} hari lalu`;
    return `${Math.floor(d / 30)} bulan lalu`;
  }

  return (
    <Layout title="Analisis Kebun AI">
      <style>{`
        @keyframes pulse-urgent {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15); }
          50% { transform: scale(1.008); box-shadow: 0 6px 22px rgba(239, 68, 68, 0.3); }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0.75rem 1rem 3.5rem' }}>

        {/* ── Header & Navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => navigate('/garden')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748B', padding: 2 }}
              >
                ←
              </button>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                🔬 Analisis Kebun AI
              </h1>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '2px 0 0 1.6rem' }}>
              Skor akumulasi makro, pola penyakit kebun &amp; riwayat penanganan
            </p>
          </div>

          {/* Period Filter */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: 14 }}>
            {[
              ['day', 'Hari Ini'],
              ['week', 'Minggu Ini'],
              ['month', 'Bulan Ini'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPeriod(val)}
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700,
                  background: period === val ? '#FFFFFF' : 'transparent',
                  color: period === val ? '#0F172A' : '#64748B',
                  boxShadow: period === val ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite' }}>🌿</div>
            <div style={{ fontWeight: 700, color: '#334155' }}>Menganalisis Data Kebun AI…</div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 16,
            padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#DC2626', fontSize: '0.9rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && analytics && (
          <>
            {/* ── Ringkasan AI Harian (Urgent-First di Paling Atas) ── */}
            {dailySummary && (
              <div style={{
                padding: '1.25rem 1.5rem', borderRadius: 20, marginBottom: '1.5rem',
                background: dailySummary.urgency === 'critical' ? '#FEF2F2'
                  : dailySummary.urgency === 'warning' ? '#FFFBEB'
                  : dailySummary.urgency === 'attention' ? '#FFFBEB' : '#ECFDF5',
                border: `2px solid ${dailySummary.urgency === 'critical' ? '#EF4444'
                  : dailySummary.urgency === 'warning' || dailySummary.urgency === 'attention' ? '#F59E0B' : '#10B981'}`,
                animation: dailySummary.urgency === 'critical' ? 'pulse-urgent 1.8s ease-in-out infinite' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    🤖 Ringkasan AI Hari Ini (Prioritas Utama)
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 12,
                    background: dailySummary.urgency === 'critical' ? '#EF4444' : dailySummary.urgency === 'good' ? '#10B981' : '#F59E0B',
                    color: '#fff',
                  }}>
                    {dailySummary.urgency === 'critical' ? 'URGENT' : dailySummary.urgency === 'good' ? 'OPTIMAL' : 'PERHATIAN'}
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, color: '#0F172A' }}>
                  {dailySummary.text}
                </p>
              </div>
            )}

            {/* ── 1. Skor Total Kondisi Kebun (Hero Section) ── */}
            <div style={{
              background: '#FFFFFF', borderRadius: 24, padding: '1.75rem',
              border: '1.5px solid #E2E8F0', marginBottom: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{
                  display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: 20,
                  fontSize: '0.75rem', fontWeight: 800, background: '#F1F5F9', color: '#475569',
                }}>
                  AKUMULASI SELURUH TANAMAN
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0.4rem 0 0' }}>
                  Skor Total Kondisi Kebun
                </h2>
              </div>

              {/* Radial Chart Display */}
              <GardenTotalRadialChart
                score={gardenScore}
                hasData={hasAnyData}
              />

              {/* 4 Metrics Cards Akumulasi */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem', marginTop: '1.5rem',
              }}>
                {/* Sehat */}
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>
                    {counts.sehat}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', marginTop: 2 }}>
                    🌿 Sehat Prima
                  </div>
                </div>

                {/* Terindikasi */}
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D97706' }}>
                    {counts.perlu_perhatian}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', marginTop: 2 }}>
                    ⚠️ Terindikasi
                  </div>
                </div>

                {/* Sakit/Kritis */}
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#DC2626' }}>
                    {counts.kritis}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', marginTop: 2 }}>
                    🚨 Sakit / Kritis
                  </div>
                </div>

                {/* Tanpa Data */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#64748B' }}>
                    {counts.tidak_ada_data}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: 2 }}>
                    🔌 Tanpa Data
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div style={{
                marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: 12,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span>💡</span>
                <span>
                  Penilaian skala: <strong>100-80 (Baik)</strong>, <strong>79-50 (Butuh Perhatian)</strong>, dan <strong>49-0 (Perlu Diperhatikan Serius)</strong>.
                  Tanaman tanpa data sensor/foto menurunkan skor kebun sebesar 5 poin sebagai bahan evaluasi.
                </span>
              </div>
            </div>

            {/* ── 2. Pola Penyakit Tanaman (Donut Chart & Breakdown) ── */}
            <div style={{
              background: '#FFFFFF', borderRadius: 24, padding: '1.75rem',
              border: '1.5px solid #E2E8F0', marginBottom: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    🦠 Pola &amp; Distribusi Penyakit Tanaman
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>
                    Rekapitulasi masalah yang paling sering ditemukan oleh AI
                  </p>
                </div>
              </div>

              <DiseaseDonutChart data={analytics.diseaseStats} />
            </div>

            {/* ── 3. Riwayat Penanganan (Treatment History Feed) ── */}
            <div style={{
              background: '#FFFFFF', borderRadius: 24, padding: '1.75rem',
              border: '1.5px solid #E2E8F0', marginBottom: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    📋 Riwayat Penanganan Tanaman
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>
                    Catatan tindakan perawatan medis, pupuk, atau fungisida pada pohon
                  </p>
                </div>

                {/* Search in history */}
                <input
                  type="text"
                  placeholder="Cari riwayat pohon…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 12, border: '1px solid #CBD5E1',
                    fontSize: '0.82rem', background: '#F8FAFC', outline: 'none', minWidth: 160,
                  }}
                />
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
                  <div style={{ fontWeight: 700, color: '#475569' }}>Belum Ada Riwayat Penanganan</div>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', maxWidth: 380, margin: '4px auto 0' }}>
                    Saat pop-up check-in kondisi tanaman muncul, catat tindakan penanganan agar riwayat &amp; efektivitas tercatat di sini.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {filteredHistory.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '1rem 1.15rem', borderRadius: 16, border: '1.5px solid #F1F5F9',
                        background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>🌳</span>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                            {log.plantName}
                          </span>
                          {log.analysis?.disease_category && (
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: 6,
                              background: '#F5F3FF', color: '#7C3AED', fontWeight: 700, fontSize: '0.72rem',
                            }}>
                              {log.analysis.disease_category}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          {relativeTime(log.createdAt)}
                        </span>
                      </div>

                      {/* Treatment Text */}
                      <div style={{
                        padding: '0.6rem 0.85rem', borderRadius: 12,
                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                        fontSize: '0.85rem', color: '#334155', lineHeight: 1.4,
                      }}>
                        🩺 <strong>Tindakan:</strong> {log.treatmentText}
                      </div>

                      {/* Score Comparison & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: 2 }}>
                        {log.scoreBefore != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B' }}>
                            <span>Skor Sebelum: <strong>{log.scoreBefore}</strong></span>
                            {log.scoreAfter != null && (
                              <>
                                <span>→ Sesudah: <strong style={{ color: '#10B981' }}>{log.scoreAfter}</strong></span>
                                <span style={{
                                  padding: '0.1rem 0.4rem', borderRadius: 6, fontWeight: 700,
                                  background: log.effectiveness === 'membaik' ? '#ECFDF5' : '#FEF2F2',
                                  color: log.effectiveness === 'membaik' ? '#059669' : '#DC2626',
                                }}>
                                  {log.effectiveness === 'membaik' ? '↑ Membaik' : '↓ Memburuk'}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {log.markedResolved && (
                          <span style={{ color: '#10B981', fontWeight: 700, marginLeft: 'auto' }}>
                            ✅ Masalah Selesai
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Back CTA */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => navigate('/garden')}
                style={{
                  padding: '0.6rem 1.4rem', borderRadius: 20,
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                  color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                ← Kembali ke Tanaman Saya
              </button>
            </div>
          </>
        )}
      </div>

      {/* Check-in Popup */}
      {showCheckin && checkinItems.length > 0 && (
        <CheckinPopup
          items={checkinItems}
          onDismiss={() => setShowCheckin(false)}
          onSubmit={handleCheckinSubmit}
          onResolve={handleCheckinResolve}
        />
      )}
    </Layout>
  );
}
