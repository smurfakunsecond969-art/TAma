import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { updateProfileApi, updateNotificationsApi, changePasswordApi } from '../services/plantService';
import '../css/app.css';

export default function ProfilePage() {
  const { user, setUser, logoutUser, showToast } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(
    user?.role === 'user' ? 'user'
    : user?.role === 'worker' ? 'worker'
    : user?.role === 'admin' ? 'admin'
    : 'user'
  );
  
  // Accordion active state
  const [activeFaq, setActiveFaq] = useState(null);
  const [saving, setSaving] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfileApi({ name, email, role });
      setUser((prev) => ({
        ...prev,
        ...res.user,
      }));
      showToast('✅ Profil berhasil diperbarui', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan profil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifToggle = async (key, value) => {
    // Optimistic update
    setUser((prev) => ({ ...prev, [key]: value }));
    showToast(value ? '🔔 Notifikasi diaktifkan' : '🔕 Notifikasi dinonaktifkan', 'success');
    try {
      const notifMap = {
        notifWatering: 'notifWatering',
        notifDevice: 'notifDevice',
        notifReport: 'notifReport',
      };
      await updateNotificationsApi({ [notifMap[key]]: value });
    } catch (err) {
      // Rollback jika gagal
      setUser((prev) => ({ ...prev, [key]: !value }));
      showToast('Gagal menyimpan pengaturan notifikasi', 'error');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logoutUser();
    navigate('/login');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSubmitChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Semua kolom wajib diisi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Kata sandi baru dan konfirmasi tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordApi(oldPassword, newPassword);
      setShowPasswordModal(false);
      showToast('✅ Kata sandi berhasil diperbarui', 'success');
    } catch (err) {
      setPasswordError(err.message || 'Gagal mengganti kata sandi.');
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const faqs = [
    {
      q: 'Bagaimana cara menghubungkan sensor ke tanaman?',
      a: 'Masuk ke menu Manajemen Tanaman, lalu saat menambahkan tanaman baru, masukkan ID perangkat sensor di kolom yang tersedia. Pastikan sensor sudah menyala dan terhubung ke WiFi yang sama.'
    },
    {
      q: 'Apa artinya badge "Perlu Dicek"?',
      a: 'Badge "Perlu Dicek" muncul ketika sensor belum mengirim data sesuai jadwal normalnya (lebih dari 30 menit). Ini bisa berarti baterai perangkat habis, koneksi WiFi terputus, atau ada masalah fisik di lapangan.'
    },
    {
      q: 'Bagaimana cara mengatur threshold kelembaban?',
      a: 'Buka menu Manajemen Tanaman, lalu klik "Edit" pada tanaman yang ingin diubah. Geser slider Minimum dan Maksimum untuk mengatur rentang kelembaban ideal. Tanamanku akan menyiram otomatis ketika kelembaban di bawah nilai minimum.'
    },
    {
      q: 'Berapa banyak tanaman yang bisa dipantau?',
      a: 'Pada masa trial gratis 30 hari, kamu bisa menambahkan tanaman tanpa batas. Setelah trial, paket standar mendukung hingga 20 tanaman aktif. Hubungi tim kami untuk kebutuhan skala besar.'
    }
  ];

  return (
    <>
    <Layout title="Profil & Pengaturan">
      <div className="profile-layout">
        
        {/* Left Card */}
        <div>
          <div className="profile-card motion-fade-slide-up" role="region" aria-label="Informasi akun">
            <div className="profile-card-top">
              <div className="profile-avatar-big" id="profile-initials" aria-hidden="true">
                {initials}
              </div>
              <h2 className="profile-name" id="profile-name">
                {user?.name}
              </h2>
              <p className="profile-email" id="profile-email">
                {user?.email}
              </p>
            </div>
            <div className="profile-card-body" role="menu">
              <div
                className="profile-menu-item"
                onClick={() => document.getElementById('info-section').scrollIntoView({ behavior: 'smooth' })}
                role="menuitem"
                tabIndex={0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Edit Profil
              </div>
              <div
                className="profile-menu-item"
                onClick={() => document.getElementById('notif-section').scrollIntoView({ behavior: 'smooth' })}
                role="menuitem"
                tabIndex={0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Notifikasi
              </div>
              <div
                className="profile-menu-item"
                onClick={() => document.getElementById('faq-section').scrollIntoView({ behavior: 'smooth' })}
                role="menuitem"
                tabIndex={0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Bantuan & FAQ
              </div>
              <div className="divider"></div>
              <button className="profile-menu-item danger interactive-tap" onClick={handleChangePassword} role="menuitem" aria-label="Ganti kata sandi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Ganti Kata Sandi
              </button>
              <button className="profile-menu-item danger interactive-tap" onClick={() => setShowLogoutConfirm(true)} role="menuitem" aria-label="Keluar dari akun">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Settings panels */}
        <div className="motion-fade-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', animationDelay: '0.1s' }}>
          {/* Info Akun */}
          <section className="settings-section" id="info-section" aria-labelledby="info-title">
            <div className="settings-section-header">
              <h2 id="info-title">Informasi Akun</h2>
            </div>
            <form onSubmit={handleSaveProfile} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="auth-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="field-name">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    id="field-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="field-email">Alamat Email</label>
                  <input
                    type="email"
                    className="form-input"
                    id="field-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="field-role">Peran / Jabatan</label>
                <select
                  className="form-input form-select"
                  id="field-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  aria-label="Pilih peran"
                >
                        <option value="user">Pemilik Tanaman</option>
                        <option value="worker">Pekerja Tanaman</option>
                        <option value="admin">Manajer Tanaman</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary interactive-tap" style={{ alignSelf: 'flex-start' }} disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '16px', height: '16px' }}></span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Notifikasi */}
          <section className="settings-section" id="notif-section" aria-labelledby="notif-title">
            <div className="settings-section-header">
              <h2 id="notif-title">Pengaturan Notifikasi</h2>
            </div>

            <div className="settings-item" role="group" aria-label="Notifikasi penyiraman">
              <div className="settings-item-info">
                <div className="settings-item-title">Penyiraman Selesai</div>
                <div className="settings-item-desc">Notifikasi saat tanaman selesai disiram secara otomatis</div>
              </div>
              <label className="toggle" aria-label="Aktifkan notifikasi penyiraman selesai">
                <input
                  type="checkbox"
                  id="notif-watering"
                  checked={user?.notifWatering ?? true}
                  onChange={(e) => handleNotifToggle('notifWatering', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item" role="group" aria-label="Notifikasi perangkat">
              <div className="settings-item-info">
                <div className="settings-item-title">Perangkat Tidak Aktif</div>
                <div className="settings-item-desc">Notifikasi saat sensor belum mengirim data sesuai jadwal</div>
              </div>
              <label className="toggle" aria-label="Aktifkan notifikasi perangkat tidak aktif">
                <input
                  type="checkbox"
                  id="notif-device"
                  checked={user?.notifDevice ?? true}
                  onChange={(e) => handleNotifToggle('notifDevice', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item" role="group" aria-label="Notifikasi laporan mingguan">
              <div className="settings-item-info">
                <div className="settings-item-title">Laporan Mingguan</div>
                      <div className="settings-item-desc">Ringkasan kondisi tanaman setiap hari Senin pagi</div>
              </div>
              <label className="toggle" aria-label="Aktifkan notifikasi laporan mingguan">
                <input
                  type="checkbox"
                  id="notif-report"
                  checked={user?.notifReport ?? false}
                  onChange={(e) => handleNotifToggle('notifReport', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="settings-section" id="faq-section" aria-labelledby="faq-title">
            <div className="settings-section-header">
              <h2 id="faq-title">Bantuan & FAQ</h2>
            </div>

            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div className={`faq-item ${isOpen ? 'open' : ''}`} key={index}>
                  <button
                    className="faq-question"
                    aria-expanded={isOpen}
                    onClick={() => toggleFaq(index)}
                  >
                    {faq.q}
                    <svg className="faq-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className="faq-answer" style={{ maxHeight: isOpen ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <p className="faq-answer-inner">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Footer Info */}
          <div className="card card-flat" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }} role="contentinfo">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <img
                src="/Logo Kebunku.png"
                alt="Kebunku Logo"
                width="20"
                height="20"
                style={{ borderRadius: '4px', objectFit: 'cover', display: 'inline-block' }}
              />
              <span className="text-semibold" style={{ color: 'var(--color-text)' }}>Tanamanku</span>
            </div>
            <p className="text-xs">Versi 1.0.0 · Menjaga tanaman, menumbuhkan hasil.</p>
          </div>
        </div>
      </div>
    </Layout>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-password-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}
        >
          <div style={{
            background: 'var(--color-surface, #fff)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 id="modal-password-title" style={{ marginBottom: '20px', fontSize: '1.125rem', fontWeight: 600 }}>
              Ganti Kata Sandi
            </h2>

            <form onSubmit={handleSubmitChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="old-password">Kata Sandi Lama</label>
                <input
                  type="password"
                  id="old-password"
                  className="form-input"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">Kata Sandi Baru</label>
                <input
                  type="password"
                  id="new-password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  id="confirm-password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {passwordError && (
                <p role="alert" style={{ color: 'var(--color-danger, #e53e3e)', fontSize: '0.875rem', margin: 0 }}>
                  {passwordError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={savingPassword}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '16px', height: '16px' }}></span>
                      Menyimpan...
                    </>
                  ) : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Konfirmasi keluar akun */}
      <ConfirmModal
        open={showLogoutConfirm}
        title="Keluar dari akun ini?"
        message="Kamu perlu masuk kembali untuk mengakses Tanamanmu."
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        danger
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
