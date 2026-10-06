import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { useApp } from '../context/AppContext';
import '../css/landing.css';

export default function LandingPage() {
  const { landingSeen, markLandingSeen } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(!landingSeen);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (loading) return undefined;
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObserver.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '80px 0px' }
    );
    reveals.forEach((el) => revealObserver.observe(el));
    return () => revealObserver.disconnect();
  }, [loading]);

  const handleLoadingComplete = useCallback(() => {
    markLandingSeen();
    setLoading(false);
  }, [markLandingSeen]);

  useEffect(() => {
    document.body.style.overflow = loading ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [loading]);

  const handleAnchorClick = (e, selector) => {
    const target = document.querySelector(selector);
    if (target && target.scrollIntoView) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`landing-body bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-slate-50/50 to-white relative overflow-hidden${loading ? ' is-loading' : ' is-loaded'}`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.20)_0%,_rgba(20,184,166,0.08)_50%,_transparent_70%)] pointer-events-none -z-10" />
      {loading && (
        <LoadingScreen label="Memuat platform tanaman anda..." onComplete={handleLoadingComplete} />
      )}

      {/* ── Navbar — Glassmorphism ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Navigasi utama">
        <Link to="/" className="nav-logo" aria-label="Tanamanku beranda">
          <div className="logo-ring-wrap">
            <img src="/Logo Kebunku.png" alt="Logo Kebunku" width="36" height="36" loading="eager" fetchpriority="high" decoding="async" style={{ objectFit: 'cover' }} />
          </div>
          <span className="nav-logo-name">Tanamanku</span>
        </Link>
        <div className="nav-links" role="list">
          <a href="#platform-flow" role="listitem" onClick={(e) => handleAnchorClick(e, '#platform-flow')}>Cara Kerja</a>
          <a href="#account-steps" role="listitem" onClick={(e) => handleAnchorClick(e, '#account-steps')}>Cara Buat Akun</a>
          <a href="#features" role="listitem" onClick={(e) => handleAnchorClick(e, '#features')}>Fitur AI</a>
          <a href="#contact" role="listitem" onClick={(e) => handleAnchorClick(e, '#contact')}>Instalasi</a>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-ghost btn-sm">Masuk</Link>
          <Link to="/register" className="btn btn-primary btn-sm lp-btn-lux bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] hover:shadow-[0_12px_28px_-2px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-95 transition-all duration-100 ease-out transform-gpu will-change-transform">Mulai Gratis</Link>
        </div>
        <button
          className="nav-menu-btn"
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span><span></span><span></span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          <a href="#platform-flow" onClick={(e) => { handleAnchorClick(e, '#platform-flow'); setMobileMenuOpen(false); }}>Cara Kerja</a>
          <a href="#account-steps" onClick={(e) => { handleAnchorClick(e, '#account-steps'); setMobileMenuOpen(false); }}>Cara Buat Akun</a>
          <a href="#features" onClick={(e) => { handleAnchorClick(e, '#features'); setMobileMenuOpen(false); }}>Fitur AI</a>
          <a href="#contact" onClick={(e) => { handleAnchorClick(e, '#contact'); setMobileMenuOpen(false); }}>Instalasi</a>
          <Link to="/login" className="btn btn-outline btn-sm" style={{justifyContent:'center'}} onClick={() => setMobileMenuOpen(false)}>Masuk</Link>
          <Link to="/register" className="btn btn-primary btn-sm lp-btn-lux bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] hover:shadow-[0_12px_28px_-2px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-95 transition-all duration-100 ease-out transform-gpu will-change-transform" style={{justifyContent:'center'}} onClick={() => setMobileMenuOpen(false)}>Mulai Gratis</Link>
        </div>
      )}

      {/* ── Hero Section ── */}
      <section className="hero" id="hero" aria-labelledby="hero-headline">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.20)_0%,_rgba(20,184,166,0.08)_50%,_transparent_70%)] pointer-events-none -z-10" aria-hidden="true" />
        
        {/* 2 Ambient blobs drifting smoothly */}
        <div style={{
          position: 'absolute', top: 40, left: '6%', width: 340, height: 340,
          background: 'radial-gradient(circle, rgba(29, 158, 117, 0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          animation: 'ambient-drift 10s ease-in-out infinite alternate',
        }} aria-hidden="true" />
        <div style={{
          position: 'absolute', top: 120, right: '8%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(59, 139, 247, 0.10) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          animation: 'ambient-drift 12s ease-in-out infinite alternate-reverse',
        }} aria-hidden="true" />

        <div className="hero-bg"></div>

        <div className="hero-contour" aria-hidden="true">
          <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
            <path d="M0,400 Q360,320 720,400 T1440,400 L1440,800 L0,800 Z" fill="#1D9E75" />
            <path d="M0,500 Q360,420 720,500 T1440,500 L1440,800 L0,800 Z" fill="#0F6E56" />
            <path d="M0,600 Q360,520 720,600 T1440,600 L1440,800 L0,800 Z" fill="#9FE1CB" />
          </svg>
        </div>

        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-eyebrow bg-emerald-50/90 border border-emerald-300 text-emerald-700 font-semibold shadow-[0_2px_12px_rgba(16,185,129,0.2)] rounded-full px-4 py-1.5" aria-label="Tag produk">
              <span className="eyebrow-dot" aria-hidden="true"></span>
              Pertanian Cerdas Berbasis IoT
            </div>
            <h1 className="hero-title" id="hero-headline">
              Tanamanmu Tumbuh,<br />
              <span className="highlight bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(16,185,129,0.25)] font-extrabold">Kami yang Jaga</span>
            </h1>
            <p className="hero-desc">
              Tanamanku menggabungkan data sensor real-time, irigasi presisi, dan kekuatan AI untuk memberi insight mendalam tentang setiap tanaman di Tanamanmu.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg hero-cta-btn bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] hover:shadow-[0_12px_28px_-2px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-95 transition-all duration-100 ease-out transform-gpu will-change-transform">
                Mulai Sekarang
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg hero-cta-btn bg-white border-2 border-emerald-500/80 text-emerald-700 font-semibold hover:bg-emerald-50/60 hover:border-emerald-600 transition-all duration-100 ease-out transform-gpu">Masuk Akun</Link>
            </div>
          </div>

          <div className="hero-visual min-h-[350px] aspect-video" aria-hidden="true">
            <div className="hero-illustration-wrap min-h-[350px]">
              <div className="hero-illustration">
                <svg viewBox="0 0 480 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="480" height="420" rx="24" fill="#F2FBF7" />
                  <ellipse cx="240" cy="360" rx="200" ry="40" fill="#E1F5EE" />
                  <path d="M40 340 Q120 300 200 330 Q280 300 360 330 Q430 310 440 340 L440 400 L40 400 Z" fill="#9FE1CB" opacity="0.5" />
                  <path d="M60 355 Q140 325 220 345 Q300 315 380 345 L380 400 L60 400 Z" fill="#1D9E75" opacity="0.25" />

                  <g transform="translate(195, 180)">
                    <rect x="17" y="110" width="16" height="50" rx="4" fill="#8B6914" />
                    <ellipse cx="25" cy="100" rx="42" ry="36" fill="#2AB88A" />
                    <ellipse cx="25" cy="80" rx="35" ry="30" fill="#1D9E75" />
                    <ellipse cx="25" cy="62" rx="26" ry="24" fill="#0F6E56" />
                    <ellipse cx="18" cy="72" rx="10" ry="8" fill="#4DD9A8" opacity="0.4" />
                  </g>

                  <g transform="translate(80, 210)">
                    <rect x="12" y="80" width="12" height="40" rx="3" fill="#8B6914" />
                    <ellipse cx="18" cy="74" rx="30" ry="26" fill="#2AB88A" />
                    <ellipse cx="18" cy="58" rx="24" ry="20" fill="#1D9E75" />
                    <ellipse cx="18" cy="44" rx="18" ry="16" fill="#0F6E56" />
                  </g>

                  <g transform="translate(340, 200)">
                    <rect x="12" y="90" width="12" height="45" rx="3" fill="#8B6914" />
                    <ellipse cx="18" cy="82" rx="34" ry="30" fill="#2AB88A" />
                    <ellipse cx="18" cy="65" rx="28" ry="22" fill="#1D9E75" />
                    <ellipse cx="18" cy="50" rx="20" ry="18" fill="#0F6E56" />
                  </g>

                  <g transform="translate(148, 230)">
                    <rect x="9" y="20" width="6" height="100" rx="3" fill="#64748B" />
                    <rect x="0" y="0" width="24" height="22" rx="5" fill="#1D9E75" />
                    <rect x="3" y="3" width="18" height="16" rx="3" fill="#0F6E56" />
                    <path d="M27 5 Q34 11 27 17" stroke="#1D9E75" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M31 1 Q42 11 31 21" stroke="#9FE1CB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </g>

                  <g transform="translate(160, 320)">
                    <rect x="0" y="0" width="8" height="30" rx="4" fill="#64748B" />
                    <rect x="2" y="2" width="4" height="10" rx="2" fill="#1D9E75" />
                  </g>

                  <g fill="#1D9E75" opacity="0.6">
                    <path d="M310 160 Q314 150 318 160 Q318 168 314 168 Q310 168 310 160Z" />
                    <path d="M325 140 Q328 132 331 140 Q331 146 328 146 Q325 146 325 140Z" />
                    <path d="M298 150 Q301 143 304 150 Q304 155 301 155 Q298 155 298 150Z" />
                  </g>

                  <g transform="translate(390, 60)">
                    <circle cx="20" cy="20" r="18" fill="#FDD34D" opacity="0.9" />
                    <circle cx="20" cy="20" r="12" fill="#FBBF24" />
                    <g stroke="#FDD34D" strokeWidth="2" strokeLinecap="round" opacity="0.7">
                      <line x1="20" y1="0" x2="20" y2="-8" />
                      <line x1="20" y1="40" x2="20" y2="48" />
                      <line x1="0" y1="20" x2="-8" y2="20" />
                      <line x1="40" y1="20" x2="48" y2="20" />
                      <line x1="5.8" y1="5.8" x2="0.1" y2="0.1" />
                      <line x1="34.2" y1="5.8" x2="39.9" y2="0.1" />
                      <line x1="5.8" y1="34.2" x2="0.1" y2="39.9" />
                      <line x1="34.2" y1="34.2" x2="39.9" y2="39.9" />
                    </g>
                  </g>

                  <g transform="translate(50, 60)" opacity="0.85">
                    <ellipse cx="50" cy="30" rx="30" ry="20" fill="white" />
                    <ellipse cx="30" cy="36" rx="24" ry="16" fill="white" />
                    <ellipse cx="70" cy="36" rx="24" ry="16" fill="white" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Floating cards — static (no per-frame tilt for INP) */}
            <div className="hero-float-card card-1">
              <div className="hero-float-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B8C80', fontWeight: 500 }}>Kelembaban Tanah</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1D9E75' }}>Sensor Real-time</div>
                </div>
              </div>
            </div>
            <div className="hero-float-card card-2">
              <div className="hero-float-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B8C80', fontWeight: 500 }}>Analisa AI</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7E22CE' }}>Deteksi Dini Penyakit</div>
                </div>
              </div>
            </div>
            <div className="hero-float-card card-3">
              <div className="hero-float-inner">
                <span style={{ fontSize: '18px' }}>&#127795;</span>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B8C80', fontWeight: 500 }}>Memory Pohon</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D9E75' }}>Riwayat &amp; Insight</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,40 Q360,80 720,40 T1440,40 L1440,80 L0,80 Z" fill="#F6FAF8" />
          </svg>
        </div>
      </section>

      {/* ── Section 1: Cara Kerja Platform (4 Langkah Visual) ── */}
      <section className="platform-flow-section" id="platform-flow" aria-labelledby="pf-title">
        <div className="section-inner">
          <p className="section-eyebrow">Alur Kerja Cerdas</p>
          <h2 className="section-title" id="pf-title">Bagaimana Tanamanku Bekerja</h2>
          <p className="section-sub">Empat pilar terpadu: dari pembacaan sensor tanah hingga memori cerdas berbasis AI di dashboard.</p>

          <div className="flow-grid">
            <div className="flow-card reveal">
              <div className="flow-card-header">
                <div className="flow-badge-num">1</div>
                <div className="flow-icon-box" style={{ background: 'rgba(29,158,117,0.12)', color: '#1D9E75' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="flow-card-title">Sensor Pantau Kondisi Tanah</h3>
              <p className="flow-card-desc">
                Sensor kelembaban membaca kondisi tanah setiap pohon secara <b>real-time</b> 24/7 dan mengirimkan datanya langsung ke cloud.
              </p>
            </div>

            <div className="flow-card reveal" style={{ transitionDelay: '.1s' }}>
              <div className="flow-card-header">
                <div className="flow-badge-num">2</div>
                <div className="flow-icon-box" style={{ background: 'rgba(14,165,233,0.12)', color: '#0284C7' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 1 1-14.14 0" />
                  </svg>
                </div>
              </div>
              <h3 className="flow-card-title">Sistem Siram Otomatis</h3>
              <p className="flow-card-desc">
                Irigasi presisi menyiram tanaman sesuai kebutuhan spesifik — tidak kurang, tidak boros air, dan bisa dikontrol manual dari jarak jauh.
              </p>
            </div>

            <div className="flow-card reveal" style={{ transitionDelay: '.2s' }}>
              <div className="flow-card-header">
                <div className="flow-badge-num">3</div>
                <div className="flow-icon-box" style={{ background: 'rgba(168,85,247,0.12)', color: '#9333EA' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>
              <h3 className="flow-card-title">Foto Dianalisis AI Cerdas</h3>
              <p className="flow-card-desc">
                Ambil foto daun atau tanaman, AI menganalisis gejala visual untuk <b>deteksi dini penyakit &amp; hama</b> lengkap dengan rekomendasi penanganan.
              </p>
            </div>

            <div className="flow-card reveal" style={{ transitionDelay: '.3s' }}>
              <div className="flow-card-header">
                <div className="flow-badge-num">4</div>
                <div className="flow-icon-box" style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                  </svg>
                </div>
              </div>
              <h3 className="flow-card-title">Memory &amp; Insight Setiap Pohon</h3>
              <p className="flow-card-desc">
                Seluruh riwayat penyiraman, tren kelembaban, catatan fisik, dan foto membentuk &ldquo;memori&rdquo; tiap pohon untuk keputusan pertanian yang lebih tepat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Cara Buat Akun (3 Langkah & Alur Approval) ── */}
      <section className="account-flow-section" id="account-steps" aria-labelledby="af-title">
        <div className="section-inner">
          <p className="section-eyebrow">Alur Pendaftaran</p>
          <h2 className="section-title" id="af-title">Cara Mulai Menggunakan Tanamanku</h2>
          <p className="section-sub">
            Kami menjaga kualitas data dan keamanan tanaman Anda melalui proses verifikasi terkelola.
          </p>

          <div className="account-steps-container">
            <div className="account-step-card reveal">
              <div className="step-badge">Langkah 1</div>
              <div className="step-icon-round">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <h3 className="step-card-title">Daftar Akun Baru</h3>
              <p className="step-card-desc">
                Isi form pendaftaran singkat dengan nama, email, dan kata sandi Anda. Hanya butuh kurang dari 1 menit.
              </p>
            </div>

            <div className="step-divider" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            <div className="account-step-card reveal" style={{ transitionDelay: '.15s' }}>
              <div className="step-badge highlight-badge">Langkah 2</div>
              <div className="step-icon-round highlight-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="step-card-title">Persetujuan Tim Admin</h3>
              <p className="step-card-desc">
                Akun diverifikasi admin untuk menjamin integritas data dan kecocokan profil tanaman Anda. Anda dapat menghubungi CS untuk mempercepat aktivasi.
              </p>
            </div>

            <div className="step-divider" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            <div className="account-step-card reveal" style={{ transitionDelay: '.3s' }}>
              <div className="step-badge">Langkah 3</div>
              <div className="step-icon-round">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="step-card-title">Mulai Pantau &amp; Analisis</h3>
              <p className="step-card-desc">
                Akses dashboard penuh, daftarkan pohon, gunakan fitur analisis foto AI, dan konsultasikan kondisi tanaman ke Taku AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features" id="features" aria-labelledby="features-title">
        <div className="section-inner">
          <p className="section-eyebrow">Kenapa Tanamanku?</p>
              <h2 className="section-title" id="features-title">Teknologi yang Bekerja untuk <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 bg-clip-text text-transparent">Tanamanmu</span></h2>
          <p className="section-sub">Dari sensor tanah hingga <b>Sistem IoT cerdas</b> — semua bekerja bersama agar tanamanmu selalu terawat dengan baik.</p>

          <div className="features-grid">
            <div className="feature-card reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl">
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <h3 className="feature-title">Sensor &amp; Irigasi Presisi</h3>
              <p className="feature-desc">Sensor kelembaban tanah memberikan umpan data real-time, memungkinkan algoritma menyiram tanaman pada ambang batas yang paling ideal.</p>
            </div>
            <div className="feature-card reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl" style={{ transitionDelay: '.1s' }}>
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 1 1-14.14 0" />
                </svg>
              </div>
              <h3 className="feature-title">Siram Otomatis, Tanpa Ribet</h3>
                <p className="feature-desc">Tanaman haus? Tanamanku sudah tahu duluan dan langsung bertindak. Sistem IoT kami dengan kontrol jarak jauh memastikan tidak ada yang disiram berlebihan.</p>
            </div>
            <div className="feature-card reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl" style={{ transitionDelay: '.2s' }}>
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="feature-title">Timeline &amp; Memory Pohon</h3>
              <p className="feature-desc">Setiap dokumentasi foto, hasil cek laboratorium/AI, dan catatan lapangan tersimpan rapi sebagai riwayat hidup tiap pohon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Hubungi Kami / Bantuan Instalasi (CTA Baru) ── */}
      <section className="contact-install-section" id="contact" aria-labelledby="contact-title">
        <div className="section-inner">
          <div className="contact-install-card reveal">
            <div className="contact-install-info">
              <span className="contact-badge">Layanan Instalasi &amp; Konsultasi</span>
              <h2 id="contact-title" className="contact-title">Tim Kami Bantu Instalasi Langsung di Lokasi Tanaman Anda</h2>
              <p className="contact-desc">
                Tidak perlu pusing urusan teknis sensor atau konfigurasi. Teknisi Tanamanku siap datang langsung untuk survei, pemasangan perangkat IoT, dan pendampingan penggunaan dashboard.
              </p>
              <div className="contact-details">
                <div className="contact-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.67a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 1H7a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>WhatsApp: <b>0852-1500-2047</b></span>
                </div>
                <div className="contact-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Respon Cepat &middot; Senin – Minggu</span>
                </div>
              </div>
            </div>

          <div className="steps-grid">
            <div className="steps-line" aria-hidden="true"></div>
            <div className="step-item reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl">
              <div className="step-number bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)] font-bold">1</div>
              <h3 className="step-title">Daftar & Tambah Tanaman</h3>
              <p className="step-desc">Buat akun gratis, lalu daftarkan tanaman-tanamanmu beserta info dasarnya. Mudah seperti mengisi formulir singkat.</p>
            </div>
            <div className="step-item reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl" style={{ transitionDelay: '.15s' }}>
              <div className="step-number bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)] font-bold">2</div>
              <h3 className="step-title">Pasang Sensor di Tanaman</h3>
              <p className="step-desc">Hubungkan perangkat sensor IoT ke tanamanmu. Sensor akan mulai membaca data kelembaban secara real-time.</p>
            </div>
            <div className="step-item reveal bg-white/95 border border-emerald-200/80 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_18px_35px_-5px_rgba(16,185,129,0.28)] hover:-translate-y-1.5 transition-all duration-150 ease-out transform-gpu will-change-transform rounded-2xl" style={{ transitionDelay: '.3s' }}>
              <div className="step-number bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)] font-bold">3</div>
              <h3 className="step-title">Biarkan Tanamanku Bekerja</h3>
              <p className="step-desc">AI kami memantau 24/7 dan menyiram otomatis saat dibutuhkan. Kamu tinggal duduk santai dan lihat tanamanmu tumbuh.</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-2xl border-t border-emerald-500/30" aria-labelledby="cta-title">
        <div className="cta-inner">
          <h2 id="cta-title" className="reveal">Siap Menghubungkan Tanaman Anda ke AI?</h2>
          <p className="reveal" style={{ transitionDelay: '.1s' }}>
            Bergabunglah dengan para pemilik tanaman dan petani modern yang mengandalkan data serta AI untuk tanaman yang lebih sehat dan hasil yang lebih melimpah.
          </p>
          <div className="cta-btns reveal" style={{ transitionDelay: '.2s' }}>
            <Link to="/register" className="btn btn-primary btn-lg bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)] hover:scale-[1.03] active:scale-95 transition-all duration-100 ease-out transform-gpu will-change-transform">
              Mulai Sekarang — Gratis
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg border-2 border-emerald-500/80 text-emerald-100 font-semibold hover:bg-emerald-800/50 hover:border-emerald-400 transition-all duration-100 ease-out transform-gpu">Sudah punya akun? Masuk</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer" role="contentinfo">
        <div className="footer-rings" aria-hidden="true">
          <span></span><span></span>
        </div>
        <div className="footer-inner">
          <div className="footer-brand-block">
            <div className="footer-logo">
              <div className="logo-ring-wrap">
                <img src="/Logo Kebunku.png" alt="Logo Kebunku" width="32" height="32" loading="eager" decoding="async" style={{ objectFit: 'cover' }} />
              </div>
              <span className="footer-brand-name">Tanamanku</span>
            </div>
            <p className="footer-tagline">Platform pertanian cerdas berbasis data &amp; AI.</p>
          </div>
          <p className="footer-copy">&copy; 2026 Tanamanku &middot; Smart Agriculture Platform</p>
        </div>
      </footer>
    </div>
  );
}

