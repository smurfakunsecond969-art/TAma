import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import {
  createPlantApi,
  updatePlantApi,
  deletePlantApi,
  fetchManagedUsersApi,
} from '../services/plantService';
import '../css/app.css';

const EMOJIS = ['🌳', '🌿', '🌱', '🍃', '🥑', '🌾', '🍋', '🥭', '🍇', '🌵', '🎋', '🌴'];

export default function ManagePlantsPage() {
  const navigate = useNavigate();
  const { plants, user, showToast, loadPlants, selectedManagedUserId, setSelectedManagedUserId } = useApp();

  const isWorkerOrAdmin = user?.role === 'worker' || user?.role === 'admin';
  const isUser = user?.role === 'user';

  // Managed users list (untuk worker/admin)
  const [managedUsers, setManagedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!isWorkerOrAdmin) return;
    setLoadingUsers(true);
    fetchManagedUsersApi()
      .then(setManagedUsers)
      .catch((err) => showToast(err.message || 'Gagal memuat daftar user', 'error'))
      .finally(() => setLoadingUsers(false));
  }, [isWorkerOrAdmin]);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [varietas, setVarietas] = useState('');
  const [fasePertumbuhan, setFasePertumbuhan] = useState('Fase Vegetatif (Tumbuh Daun & Batang)');
  const [mediaTanam, setMediaTanam] = useState('Tanah Lempung Berpasir (Gembur)');
  const [lokasiBlok, setLokasiBlok] = useState('');
  const [catatan, setCatatan] = useState('');
  const [emoji, setEmoji] = useState('🌳');
  const [deviceId, setDeviceId] = useState('');
  const [moistureMin, setMoistureMin] = useState(50);
  const [moistureMax, setMoistureMax] = useState(80);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !type.trim() || !varietas.trim() || !lokasiBlok.trim()) {
      showToast('Nama, jenis, varietas, dan lokasi blok wajib diisi agar analisa AI valid!', 'error');
      return;
    }
    if (isWorkerOrAdmin && !selectedManagedUserId) {
      showToast('Pilih user yang akan dikelola terlebih dahulu', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const plantData = {
        name: name.trim(),
        type: type.trim(),
        varietas: varietas.trim(),
        fasePertumbuhan: fasePertumbuhan.trim(),
        mediaTanam: mediaTanam.trim(),
        lokasiBlok: lokasiBlok.trim(),
        catatan: catatan.trim() || undefined,
        emoji,
        deviceId: deviceId.trim() || undefined,
        moistureMin: Number(moistureMin),
        moistureMax: Number(moistureMax),
        ...(isWorkerOrAdmin && { targetUserId: selectedManagedUserId, userId: selectedManagedUserId }),
      };

      if (editingId) {
        await updatePlantApi(editingId, plantData);
        showToast(`✅ ${name} (${varietas}) berhasil diperbarui`, 'success');
      } else {
        await createPlantApi(plantData);
        showToast(`🌱 ${name} (${varietas}) berhasil ditambahkan!`, 'success');
      }

      await loadPlants();
      resetForm();
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (plant) => {
    setEditingId(plant.id);
    setName(plant.name || '');
    setType(plant.type || '');
    setVarietas(plant.varietas || '');
    setFasePertumbuhan(plant.fasePertumbuhan || 'Fase Vegetatif (Tumbuh Daun & Batang)');
    setMediaTanam(plant.mediaTanam || 'Tanah Lempung Berpasir (Gembur)');
    setLokasiBlok(plant.lokasiBlok || '');
    setCatatan(plant.catatan || '');
    setEmoji(plant.emoji || '🌳');
    setDeviceId(plant.deviceId && plant.deviceId !== '-' ? plant.deviceId : '');
    setMoistureMin(plant.moistureMin || 50);
    setMoistureMax(plant.moistureMax || 80);
  };

  const handleDelete = async (plant) => {
    setDeleteTarget(null);
    try {
      await deletePlantApi(plant.id);
      showToast(`🗑️ ${plant.name} dihapus`, 'warning');
      await loadPlants();
      if (editingId === plant.id) resetForm();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus tanaman', 'error');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('');
    setVarietas('');
    setFasePertumbuhan('Fase Vegetatif (Tumbuh Daun & Batang)');
    setMediaTanam('Tanah Lempung Berpasir (Gembur)');
    setLokasiBlok('');
    setCatatan('');
    setEmoji('🌳');
    setDeviceId('');
    setMoistureMin(50);
    setMoistureMax(80);
  };

  // Nama user yang sedang dipilih (untuk label)
  const selectedUserName = managedUsers.find((u) => u.id === selectedManagedUserId)?.name || null;

  return (
    <Layout title="Manajemen Tanaman">
      <div className="manage-layout">

        {/* Left column: List */}
        <div role="region" aria-label="Daftar tanaman">

          {/* Worker/admin: banner siapa yang sedang dikelola */}
          {isWorkerOrAdmin && selectedManagedUserId && (
            <div style={{
              background: 'var(--color-info-pale)',
              border: '1px solid rgba(59,139,247,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              marginBottom: 'var(--space-4)',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-info)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Mengelola tanaman milik <strong style={{ marginLeft: '4px' }}>{selectedUserName}</strong>
            </div>
          )}

          <div className="section-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2>Tanaman Terdaftar</h2>
            {isUser && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowContactModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '6px 12px',
                  borderRadius: '10px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Hubungi Petugas / CS
              </button>
            )}
          </div>

          <div className="plant-list-items" id="plant-list">
            {plants.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)' }}>
                <div className="empty-state-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                  </svg>
                </div>
                <h3>Belum ada tanaman</h3>
                <p>
                  {isUser
                    ? 'Hubungi Petugas Lapangan atau Customer Service untuk mendaftarkan tanaman dan sensor IoT Anda.'
                    : isWorkerOrAdmin && !selectedManagedUserId
                    ? 'Pilih user yang akan dikelola di form sebelah.'
                    : 'Tambahkan tanaman menggunakan form di samping.'}
                </p>
              </div>
            ) : (
              plants.map((plant, idx) => (
                <div
                  className="plant-list-item motion-card-float-in"
                  key={plant.id}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="plant-list-icon" style={{ overflow: 'hidden' }}>
                    {plant.latestPhoto?.url ? (
                      <img
                        src={plant.latestPhoto.url}
                        alt={plant.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                      />
                    ) : (
                      plant.emoji
                    )}
                  </div>
                  <div className="plant-list-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="plant-list-name">{plant.name}</span>
                      {plant.varietas && (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.45rem',
                          borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                        }}>
                          {plant.varietas}
                        </span>
                      )}
                    </div>
                    <div className="plant-list-sub" style={{ marginTop: 3 }}>
                      <span>{plant.type}</span>
                      {plant.lokasiBlok && <span> · 📍 {plant.lokasiBlok}</span>}
                      {plant.fasePertumbuhan && <span> · 🌱 {plant.fasePertumbuhan.split(' ')[0]}</span>}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      Threshold: {plant.moistureMin}%–{plant.moistureMax}%
                      {plant.lastUpdate !== null && plant.lastUpdate !== undefined && plant.deviceId && plant.deviceId !== '-'
                        ? ` · 🔌 ${plant.deviceId}`
                        : ' · ⚠️ Sensor belum dipasang'}
                    </div>
                  </div>
                  {/* User tidak bisa edit/hapus */}
                  {isWorkerOrAdmin && (
                    <div className="plant-list-actions">
                      <button className="btn btn-secondary btn-xs" onClick={() => handleEdit(plant)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteTarget(plant)}>Hapus</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Form (hanya Petugas Lapangan / Customer Service / Admin) */}
        {isUser ? (
          /* Role user: tampilkan info card dengan tombol hubungi petugas/CS */
          <div className="form-card" role="complementary" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="form-card-header" style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)' }}>
              <h3 style={{ color: '#fff' }}>Registrasi & Kelola Tanaman</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>Layanan instalasi perangkat & penambahan pohon</p>
            </div>
            <div className="form-card-body" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%',
                background: 'var(--color-primary-pale)',
                color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-4)',
                boxShadow: '0 8px 24px rgba(29,158,117,0.15)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                Butuh Tambah atau Ubah Tanaman?
              </h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
                Untuk memastikan kalibrasi sensor IoT dan data agronomis akurat, penambahan atau perubahan tanaman dilakukan oleh <strong>Petugas Lapangan</strong> atau <strong>Customer Service</strong> Tanamanmu.
              </p>
              
              <button
                type="button"
                className="btn btn-primary w-full"
                style={{
                  justifyContent: 'center',
                  padding: '12px 20px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  boxShadow: '0 6px 20px rgba(29, 158, 117, 0.35)',
                  animation: 'takuPulseGlow 3s infinite',
                }}
                onClick={() => setShowContactModal(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Hubungi Petugas / Customer Service
              </button>
            </div>
          </div>
        ) : (
          /* Role worker/admin: form penuh */
          <div key={editingId || 'new'} className="form-card motion-fade-slide-up" role="complementary" aria-label="Form tambah atau edit tanaman">
            <div className="form-card-header">
              <h3>{editingId ? 'Edit Data Tanaman' : 'Registrasi Tanaman Baru'}</h3>
              <p>
                {editingId
                  ? 'Ubah informasi dan parameter agronomis tanaman.'
                  : 'Lengkapi profil tanaman agar diagnosa AI dan otomasi irigasi 100% akurat.'}
              </p>
            </div>
            <div className="form-card-body">
              <form onSubmit={handleSubmit} noValidate>

                {/* Dropdown pilih user (worker/admin) */}
                <div className="form-group">
                  <label className="form-label" htmlFor="managed-user">
                    Pemilik / Akun User
                    <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                  </label>
                  {loadingUsers ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                      <span className="spinner" style={{ width: '14px', height: '14px', borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                      Memuat daftar user...
                    </div>
                  ) : managedUsers.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', padding: '8px 0' }}>
                      Belum ada user yang terdaftar dan disetujui.
                    </p>
                  ) : (
                    <select
                      id="managed-user"
                      className="form-input form-select"
                      value={selectedManagedUserId || ''}
                      onChange={(e) => setSelectedManagedUserId(e.target.value || null)}
                      required
                    >
                      <option value="">— Pilih Akun User —</option>
                      {managedUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Emoji Picker */}
                <div className="form-group">
                  <label className="form-label">Ikon Tanaman</label>
                  <div className="emoji-grid" role="group" aria-label="Pilih ikon tanaman">
                    {EMOJIS.map((em) => (
                      <button key={em} type="button"
                        className={`emoji-btn ${emoji === em ? 'selected' : ''}`}
                        onClick={() => setEmoji(em)}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plant-name">
                    Nama Tanaman / ID Lapangan
                    <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                    <input type="text" id="plant-name" className="form-input"
                      placeholder="cth: Durian Black Thorn #1"
                      value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>

                {/* Grid 2 kolom: Jenis Tanaman & Varietas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="plant-type">
                      Jenis / Komoditas
                      <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                    </label>
                    <input type="text" id="plant-type" className="form-input"
                      placeholder="cth: Durian, Cabai, Tomat"
                      value={type} onChange={(e) => setType(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="plant-varietas">
                      Varietas / Kultivar
                      <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                    </label>
                    <input type="text" id="plant-varietas" className="form-input"
                      placeholder="cth: Musang King, Bawor, Rawit"
                      value={varietas} onChange={(e) => setVarietas(e.target.value)} required />
                  </div>
                </div>

                {/* Fase Pertumbuhan & Media Tanam */}
                <div className="form-group">
                  <label className="form-label" htmlFor="plant-fase">
                    Fase Pertumbuhan Saat Ini
                    <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                  </label>
                  <select
                    id="plant-fase"
                    className="form-input form-select"
                    value={fasePertumbuhan}
                    onChange={(e) => setFasePertumbuhan(e.target.value)}
                    required
                  >
                    <option value="Semai / Bibit Muda">Semai / Bibit Muda (Nursery)</option>
                    <option value="Fase Vegetatif (Tumbuh Daun & Batang)">Fase Vegetatif (Tumbuh Daun & Batang)</option>
                    <option value="Fase Pembungaan">Fase Pembungaan (Generatif Awal)</option>
                    <option value="Fase Pembuahan / Berbuah">Fase Pembuahan / Berbuah</option>
                    <option value="Fase Panen / Produktif">Fase Panen / Produktif</option>
                    <option value="Pemulihan Pasca Panen">Pemulihan Pasca Panen / Dormansi</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plant-media">
                    Media Tanam & Tipe Tanah
                    <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                  </label>
                  <select
                    id="plant-media"
                    className="form-input form-select"
                    value={mediaTanam}
                    onChange={(e) => setMediaTanam(e.target.value)}
                    required
                  >
                    <option value="Tanah Lempung Berpasir (Gembur)">Tanah Lempung Berpasir (Gembur)</option>
                    <option value="Tanah Humus / Organik Subur">Tanah Humus / Organik Subur</option>
                    <option value="Tanah Liat Berpasir">Tanah Liat Berpasir</option>
                    <option value="Campuran Sekam & Pupuk Kompos">Campuran Sekam & Pupuk Kompos</option>
                    <option value="Media Polybag / Tabulampot">Media Polybag / Tabulampot</option>
                    <option value="Hidroponik / Cocopeat">Hidroponik / Cocopeat</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plant-lokasi">
                    Lokasi Kebun / Blok / Bedeng
                    <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <input type="text" id="plant-lokasi" className="form-input"
                      placeholder="cth: Blok A - Bedeng 5 / Greenhouse Utara"
                      value={lokasiBlok} onChange={(e) => setLokasiBlok(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plant-catatan">
                    Keterangan & Catatan Perlakuan (Opsional)
                  </label>
                  <textarea
                    id="plant-catatan"
                    className="form-input"
                    rows="2"
                    placeholder="cth: Riwayat semprot anti-hama pekan lalu, pupuk NPK 16-16-16 tiap 14 hari."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                  <span className="text-xs text-muted">Konteks ini akan otomatis dibaca AI saat mendeteksi penyakit dan memberikan resep penanganan.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="device-id">ID Perangkat Sensor IoT (ESP32)</label>
                  <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </span>
                    <input type="text" id="device-id" className="form-input"
                      placeholder="cth: DEV-001 (opsional, isi setelah sensor dipasang)"
                      value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
                  </div>
                  <span className="text-xs text-muted">Isi ID sesuai label fisik perangkat. Kosongkan jika sensor belum dipasang.</span>
                </div>

                {/* Moisture threshold */}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Ambang Kelembaban Tanah Optimal</label>
                  <div className="threshold-row" role="group" aria-label="Pengaturan ambang kelembaban">
                    <div className="threshold-item">
                      <div className="threshold-header">
                        <label className="form-label" htmlFor="moisture-min" style={{ margin: 0 }}>Minimum</label>
                        <span className="threshold-val" aria-live="polite">{moistureMin}%</span>
                      </div>
                      <input type="range" id="moisture-min" min="10" max="90" value={moistureMin} step="5"
                        onChange={(e) => setMoistureMin(e.target.value)} aria-label="Kelembaban minimum" />
                    </div>
                    <div className="threshold-item">
                      <div className="threshold-header">
                        <label className="form-label" htmlFor="moisture-max" style={{ margin: 0 }}>Maksimum</label>
                        <span className="threshold-val" aria-live="polite">{moistureMax}%</span>
                      </div>
                      <input type="range" id="moisture-max" min="10" max="100" value={moistureMax} step="5"
                        onChange={(e) => setMoistureMax(e.target.value)} aria-label="Kelembaban maksimum" />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '16px', height: '16px' }} />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {editingId ? 'Simpan Perubahan Data' : 'Registrasi Tanaman'}
                      </>
                    )}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-ghost w-full" onClick={resetForm} style={{ justifyContent: 'center' }}>
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Konfirmasi hapus tanaman */}
      <ConfirmModal
        open={!!deleteTarget}
        title={deleteTarget ? `Hapus ${deleteTarget.name}?` : ''}
        message="Data tanaman ini tidak dapat dipulihkan setelah dihapus."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal Hubungi Petugas Lapangan & Customer Service */}
      {showContactModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 20, 16, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContactModal(false);
          }}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--color-card, #FFFFFF)',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(15,110,86,0.3)',
              border: '1px solid var(--color-border)',
              animation: 'dashRise 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                padding: '24px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Layanan Bantuan & Instalasi</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                    Petugas Lapangan & Customer Service
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', lineHeight: 1.6, margin: 0 }}>
                Silakan pilih jalur komunikasi di bawah ini untuk konsultasi, instalasi perangkat sensor IoT baru, atau memperbarui informasi tanaman Anda:
              </p>

              {/* Option 1: WhatsApp Customer Service */}
              <a
                href="https://wa.me/6281234567890?text=Halo%20Customer%20Service%20Tanamanku,%20saya%20ingin%20berkonsultasi%20mengenai%20instalasi%20dan%20penambahan%20tanaman%20baru."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--color-surface, #F6FAF8)',
                  border: '1.5px solid var(--color-border)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = '#25D366';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#25D366',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zM12.05 20.21c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.44c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.69.45-.05 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                    WhatsApp Customer Service
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Respon cepat untuk panduan, jadwal & keluhan
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>›</span>
              </a>

              {/* Option 2: Petugas Lapangan Hotline / Telepon */}
              <a
                href="tel:08001234567"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--color-surface, #F6FAF8)',
                  border: '1.5px solid var(--color-border)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = '#1D9E75';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(29, 158, 117, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'var(--color-primary-pale)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                    Hotline Petugas Lapangan
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    0800-1-TANAMAN (Bantuan Teknis Lapangan)
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>›</span>
              </a>

              {/* Option 3: Buka Tanya Taku AI */}
              <button
                type="button"
                onClick={() => {
                  setShowContactModal(false);
                  navigate('/taku');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--color-surface, #F6FAF8)',
                  border: '1.5px solid var(--color-border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = '#3B8BF7';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 139, 247, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(59, 139, 247, 0.12)',
                    color: '#3B8BF7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="16" x2="8" y2="16" />
                    <line x1="16" y1="16" x2="16" y2="16" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                    Tanya Taku AI Assistant
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Tanyakan tips perawatan & diagnosa otomatis 24/7
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>›</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px 20px',
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowContactModal(false)}
                style={{ fontSize: '0.88rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
