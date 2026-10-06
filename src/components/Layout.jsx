import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TakuAssistant from './TakuAssistant';
import TakuHUD from './taku/TakuHUD';
import LoadingScreen from './LoadingScreen';
import NotificationPanel from './NotificationPanel';

export default function Layout({ children, title }) {
  const { user, plants, plantsLoading, theme, toggleTheme } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Dashboard punya Loading Screen full-screen sendiri → inline loader tidak perlu
  const inlineLoader = plantsLoading && plants.length === 0 && location.pathname !== '/dashboard';

  const warningCount = plants.filter((p) => p.status === 'warning').length;
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const isUser         = user?.role === 'user';
  const isWorkerOrAdmin = user?.role === 'worker' || user?.role === 'admin';
  const isAdmin        = user?.role === 'admin';

  const close = () => setSidebarOpen(false);

  // Notification panel state — lokal di Layout, tidak naik ke context
  const [notifOpen, setNotifOpen] = useState(false);
  // "closing" = panel sedang fade-out tapi tetap ter-render (200ms) agar
  // transisi keluar terlihat halus, bukan langsung hilang.
  const [notifClosing, setNotifClosing] = useState(false);
  const notifTimer = useRef(null);

  // Buka panel — dipicu hover (onMouseEnter) pada area lonceng + panel.
  const openNotifs = useCallback(() => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotifClosing(false);
    setNotifOpen(true);
  }, []);

  // Tutup panel — dipicu saat kursor keluar area ikon + panel.
  // Panel dipertahankan 200ms untuk fade-out lalu benar-benar di-unmount.
  const closeNotifs = useCallback(() => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotifClosing(true);
    notifTimer.current = setTimeout(() => {
      setNotifOpen(false);
      setNotifClosing(false);
      notifTimer.current = null;
    }, 200);
  }, []);

  // Bersihkan timer jika Layout di-unmount
  useEffect(() => () => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
  }, []);

  // Badge count: tanaman warning + (admin: pending approval tidak dihitung di sini,
  // karena butuh fetch — cukup tampilkan warningCount sebagai minimum badge)
  const notifBadge = warningCount;

  const ROLE_LABEL = { user: 'User', worker: 'Worker', admin: 'Admin' };

  return (
    <div className="app-shell" data-theme={theme}>
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={close}
        role="presentation"
      />

      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Navigasi aplikasi">
          <div className="sidebar-logo">
            <div className="logo-ring-wrap">
              <img src="/Logo Kebunku.png" alt="Logo Kebunku" width="32" height="32" loading="eager" decoding="async" style={{ objectFit: 'cover' }} />
            </div>
            <div className="sidebar-logo-text">
              <div className="brand-name">Tanamanku</div>
              <div className="brand-tag">Pertanian Cerdas</div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Menu utama">
            <span className="nav-section-label">Menu Utama</span>

            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </span>
              Dashboard
              {warningCount > 0 && (
                <span className="nav-badge" aria-label={`${warningCount} tanaman perlu perhatian`}>{warningCount}</span>
              )}
            </NavLink>

            {/* Tanaman Saya — hanya untuk user & admin (bukan worker) */}
            {(isUser || isAdmin) && (
              <NavLink to="/garden" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
                <span className="nav-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                Tanaman Saya
              </NavLink>
            )}

            {/* Analisis Kebun — hanya untuk user & admin */}
            {(isUser || isAdmin) && (
              <NavLink to="/garden-analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
                <span className="nav-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                    <line x1="2" y1="20" x2="22" y2="20" />
                  </svg>
                </span>
                Analisis Kebun
              </NavLink>
            )}

            <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              Riwayat
            </NavLink>


            <NavLink to="/taku" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
              <span className="nav-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/taku-ai-logo.png" alt="Taku AI" style={{ width: '19px', height: '19px', objectFit: 'contain' }} />
              </span>
              Tanya Taku AI
            </NavLink>

            <span className="nav-section-label">Kelola</span>

            {/* Manajemen Tanaman — hanya worker & admin */}
            {isWorkerOrAdmin && (
              <NavLink to="/manage-plants" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
                <span className="nav-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                Manajemen Tanaman
              </NavLink>
            )}

            {/* Persetujuan Akun — hanya admin */}
            {isAdmin && (
              <NavLink to="/admin/approval" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
                <span className="nav-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                Persetujuan Akun
              </NavLink>
            )}

            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={close}>
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2c1.104 0 2 .896 2 2s-.896 2-2 2-2-.896-2-2 .896-2 2-2zm9 7h-6v13h-2v-6h-2v6h-2v-13h-6v-2h6v-1c0-1.104.896-2 2-2h2c1.104 0 2 .896 2 2v1h6v2z" />
                </svg>
              </span>
              Profil & Pengaturan
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <div
              className="sidebar-user"
              onClick={() => navigate('/profile')}
              role="button"
              aria-label="Lihat profil"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
            >
              <div className="user-avatar" aria-hidden="true">{initials}</div>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{ROLE_LABEL[user?.role] || user?.role}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* App Content */}
        <div className="app-content">
          <header className="app-header" role="banner">
            <div className="flex items-center gap-4">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}
                aria-label="Buka menu" aria-expanded={sidebarOpen}>
                <span /><span /><span />
              </button>
              <h1 className="app-header-title">{title}</h1>
            </div>
            <div className="app-header-actions">
              {warningCount === 0 ? (
                <span className="badge badge-green badge-dot" aria-live="polite">
                  Semua tanaman dalam kondisi baik
                </span>
              ) : (
                <span className="badge badge-yellow badge-dot" aria-live="polite">
                  {warningCount} tanaman butuh perhatian
                </span>
              )}
              
              {/* Theme Toggle Button */}
              <button
                className="btn btn-ghost btn-icon theme-toggle-btn"
                data-taku="theme-toggle"
                aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                title={theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
                onClick={() => toggleTheme()}
                style={{
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease',
                  color: theme === 'dark' ? '#F59E0B' : 'var(--color-text)',
                }}
              >
                {theme === 'light' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" fill="#F59E0B" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>

              {/* Notifikasi — terbuka saat HOVER lonceng, tutup saat kursor
                  keluar dari area lonceng + panel (tanpa klik). */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={openNotifs}
                onMouseLeave={closeNotifs}
              >
                <button
                  className="btn btn-ghost btn-icon"
                  aria-label="Notifikasi"
                  aria-expanded={notifOpen}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {/* Badge merah angka notifikasi */}
                  {notifBadge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '4px', right: '4px',
                      width: '16px', height: '16px',
                      background: 'var(--color-danger)',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                      pointerEvents: 'none',
                    }}>
                      {notifBadge > 9 ? '9+' : notifBadge}
                    </span>
                  )}
                </button>

                {/* Jembatan hover: menutup celah antara dasar lonceng dan atas panel
                  (10px) supaya kursor tidak "lepas" saat berpindah ke dalam
                  panel — mencegah panel bergetar/tertutup tidak sengaja. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    height: '10px',
                  }}
                />

                <NotificationPanel
                  open={notifOpen}
                  closing={notifClosing}
                  onClose={closeNotifs}
                />
              </div>
            </div>
          </header>

          <main className="app-main" id="main-content">
            {inlineLoader ? (
              <LoadingScreen label="Memuat tanaman anda..." inline />
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {/* Click Particle FX Layer */}
      <div id="fx-layer" className="fx-layer" aria-hidden="true"></div>

      {/* Bottom Navigation (mobile) */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigasi bawah">
        <div className="bottom-nav-inner">
          <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Beranda
          </NavLink>

           {(isUser || isAdmin) && (
             <NavLink to="/garden" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                 <polyline points="9 22 9 12 15 12 15 22" />
               </svg>
               Tanaman
             </NavLink>
           )}

          <NavLink to="/history" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Riwayat
          </NavLink>

          {isWorkerOrAdmin && (
            <NavLink to="/manage-plants" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Kelola
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin/approval" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Approval
            </NavLink>
          )}

          <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Profil
          </NavLink>
        </div>
      </nav>
      
      {/* Taku HUD (grid, spotlight, subtitle, kursor hantu, boot) */}
      <TakuHUD />

      {/* Taku AI Active Assistant Orb */}
      <TakuAssistant />
    </div>
  );
}
