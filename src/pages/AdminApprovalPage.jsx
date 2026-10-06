import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import {
  adminListUsersApi,
  adminApproveUserApi,
  adminRejectUserApi,
  adminChangeRoleApi,
} from '../services/plantService';
import '../css/app.css';

const ROLE_LABELS = { user: 'User', worker: 'Worker', admin: 'Admin' };
const ROLE_COLORS = {
  user:   { bg: 'var(--color-primary-pale)',   color: 'var(--color-primary-dark)' },
  worker: { bg: 'var(--color-info-pale)',       color: 'var(--color-info)' },
  admin:  { bg: 'var(--color-danger-pale)',     color: 'var(--color-danger)' },
};

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminApprovalPage() {
  const { showToast, user: me } = useApp();
  const [tab, setTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // id yang sedang diproses
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListUsersApi(tab);
      setUsers(data);
    } catch (err) {
      showToast(err.message || 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (u) => {
    setActionId(u.id);
    try {
      await adminApproveUserApi(u.id);
      showToast(`✅ ${u.name} disetujui`, 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (u) => {
    setRejectTarget(null);
    setActionId(u.id);
    try {
      await adminRejectUserApi(u.id);
      showToast(`🚫 ${u.name} ditolak`, 'warning');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleRoleChange = async (u, newRole) => {
    setActionId(u.id);
    try {
      await adminChangeRoleApi(u.id, newRole);
      showToast(`Role ${u.name} diubah ke ${ROLE_LABELS[newRole]}`, 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  const tabs = [
    { key: 'pending',  label: 'Menunggu',  color: '#F5A623' },
    { key: 'approved', label: 'Disetujui', color: '#1D9E75' },
    { key: 'rejected', label: 'Ditolak',   color: '#E84545' },
    { key: 'all',      label: 'Semua',     color: '#3B8BF7' },
  ];

  return (
    <Layout title="Persetujuan Akun">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Manajemen Akun Pengguna</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontSize: 'var(--font-size-sm)' }}>
            Setujui, tolak, atau ubah role akun yang mendaftar.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm interactive-tap" onClick={load} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="interactive-tap"
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-full)',
              fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer',
              border: tab === t.key ? `2px solid ${t.color}` : '2px solid var(--color-border)',
              background: tab === t.key ? `${t.color}18` : 'var(--color-white)',
              color: tab === t.key ? t.color : 'var(--color-text-muted)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="card card-flat motion-card-float-in" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <span className="spinner" style={{ width: '28px', height: '28px', borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-16) var(--space-8)' }}>
            <div className="empty-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Tidak ada akun</h3>
            <p>Tidak ada akun dengan status ini.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table">
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border-soft)' }}>
                  {['Nama', 'Email', 'No. HP', 'Role', 'Status', 'Daftar', 'Aksi'].map((h) => (
                    <th key={h} style={{
                      padding: '14px 20px', textAlign: 'left',
                      fontSize: 'var(--font-size-xs)', fontWeight: 700,
                      color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  const busy = actionId === u.id;
                  const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.user;

                  return (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid var(--color-border-soft)',
                      transition: 'background 0.15s ease',
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-ghost)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      {/* Nama */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700, color: 'white',
                          }}>
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                            {u.name} {isSelf && <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>(Saya)</span>}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 20px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-sub)' }}>
                        {u.email}
                      </td>

                      {/* HP */}
                      <td style={{ padding: '14px 20px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {u.phone || '–'}
                      </td>

                      {/* Role + dropdown ubah */}
                      <td style={{ padding: '14px 20px' }}>
                        {isSelf ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)', fontWeight: 600,
                            background: roleStyle.bg, color: roleStyle.color,
                          }}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={busy}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            style={{
                              border: '1.5px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 600,
                              background: roleStyle.bg,
                              color: roleStyle.color,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                            aria-label={`Ubah role ${u.name}`}
                          >
                            <option value="user">User</option>
                            <option value="worker">Worker</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          className={u.approvalStatus === 'pending' ? 'motion-pulse-glow' : ''}
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)', fontWeight: 600,
                            background: u.approvalStatus === 'approved' ? 'var(--color-primary-pale)'
                              : u.approvalStatus === 'rejected' ? 'var(--color-danger-pale)'
                              : 'var(--color-warning-pale)',
                            color: u.approvalStatus === 'approved' ? 'var(--color-primary-dark)'
                              : u.approvalStatus === 'rejected' ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                          }}
                        >
                          {u.approvalStatus === 'approved' ? 'Disetujui'
                            : u.approvalStatus === 'rejected' ? 'Ditolak'
                            : 'Menunggu'}
                        </span>
                      </td>

                      {/* Tgl Daftar */}
                      <td style={{ padding: '14px 20px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '14px 20px' }}>
                        {isSelf ? (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>–</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                            {u.approvalStatus !== 'approved' && (
                              <button
                                className="btn btn-xs interactive-tap"
                                onClick={() => handleApprove(u)}
                                disabled={busy}
                                style={{ background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-full)' }}
                              >
                                {busy ? <span className="spinner" style={{ width: '10px', height: '10px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                                  : '✓ Setujui'}
                              </button>
                            )}
                            {u.approvalStatus !== 'rejected' && (
                              <button
                                className="btn btn-xs interactive-tap"
                                onClick={() => setRejectTarget(u)}
                                disabled={busy}
                                style={{ background: 'var(--color-danger-pale)', color: 'var(--color-danger)', borderRadius: 'var(--radius-full)' }}
                              >
                                ✕ Tolak
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Konfirmasi tolak akun */}
      <ConfirmModal
        open={!!rejectTarget}
        title={rejectTarget ? `Tolak akun ${rejectTarget.name}?` : ''}
        message="Akun ini tidak akan bisa masuk sampai admin menyetujui kembali."
        confirmLabel="Ya, Tolak"
        cancelLabel="Batal"
        danger
        onConfirm={() => handleReject(rejectTarget)}
        onCancel={() => setRejectTarget(null)}
      />
    </Layout>
  );
}
