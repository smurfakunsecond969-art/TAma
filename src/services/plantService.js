/**
 * plantService.js — Service Layer Tanamanku Frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('tmk_token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

// ── Auth APIs ────────────────────────────────────────────────

export async function loginApi(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  // 403 pending_approval — biarkan caller handle, jangan throw biasa
  if (res.status === 403) {
    const err = new Error(data.message || 'Akun belum disetujui.');
    err.code = data.error;           // 'pending_approval'
    err.supportPhone = data.supportPhone;
    throw err;
  }
  if (!res.ok) throw new Error(data.error || 'Gagal login');
  localStorage.setItem('tmk_token', data.token);
  return data;
}

// register tidak lagi return token — return { message, supportPhone }
export async function registerApi(userData) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal pendaftaran');
  return data; // { message, supportPhone }
}

export async function getMeApi() {
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sesi berakhir');
  return data.user;
}

export async function forgotPasswordApi(email) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim permintaan reset kata sandi');
  return data;
}

export async function changePasswordApi(oldPassword, newPassword) {
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengganti kata sandi');
  return data;
}

// ── Plants APIs ──────────────────────────────────────────────

// userId: diisi worker/admin untuk scope ke user tertentu; user biasa biarkan kosong
export async function fetchPlants(userId = null) {
  const url = userId
    ? `${API_BASE_URL}/plants?userId=${userId}`
    : `${API_BASE_URL}/plants`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil data tanaman');
  return data;
}

export async function fetchPlantById(id) {
  const res = await fetch(`${API_BASE_URL}/plants/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tanaman tidak ditemukan');
  return data;
}

// plantData harus include targetUserId untuk worker/admin
export async function createPlantApi(plantData) {
  const targetId = plantData?.userId || plantData?.targetUserId;
  const url = targetId ? `${API_BASE_URL}/plants?userId=${targetId}` : `${API_BASE_URL}/plants`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(plantData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menambah tanaman');
  return data;
}

export async function updatePlantApi(id, plantData) {
  const res = await fetch(`${API_BASE_URL}/plants/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(plantData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui tanaman');
  return data;
}

export async function deletePlantApi(id) {
  const res = await fetch(`${API_BASE_URL}/plants/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus tanaman');
  return data;
}

export async function waterPlantApi(id) {
  const res = await fetch(`${API_BASE_URL}/plants/${id}/water`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim perintah siram');
  return data;
}

export async function toggleAutoWaterApi(id, enabled) {
  const res = await fetch(`${API_BASE_URL}/plants/${id}/auto-water`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengubah mode siram otomatis');
  return data;
}

export async function fetchPlantChartHistory(id, range = 'daily') {
  const res = await fetch(`${API_BASE_URL}/plants/${id}/history?range=${range}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil riwayat chart');
  return data;
}

// ── History APIs ─────────────────────────────────────────────

export async function fetchHistory(plantId = 'all', type = 'all') {
  const params = new URLSearchParams();
  if (plantId !== 'all') params.set('plantId', plantId);
  if (type !== 'all') params.set('type', type);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/history${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil riwayat penyiraman');
  return data;
}

// ── Profile APIs ─────────────────────────────────────────────

export async function updateProfileApi(profileData) {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengupdate profil');
  return data;
}

export async function updateNotificationsApi(notifData) {
  const res = await fetch(`${API_BASE_URL}/profile/notifications`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(notifData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengupdate notifikasi');
  return data;
}

// ── Users API (worker & admin) ───────────────────────────────

export async function fetchManagedUsersApi() {
  const res = await fetch(`${API_BASE_URL}/users/managed`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil daftar user');
  return data; // [{ id, name, email }]
}

// ── Admin APIs ───────────────────────────────────────────────

export async function adminListUsersApi(status = 'pending') {
  const res = await fetch(`${API_BASE_URL}/admin/users?status=${status}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil daftar pengguna');
  return data;
}

export async function adminApproveUserApi(id) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyetujui akun');
  return data;
}

export async function adminRejectUserApi(id) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menolak akun');
  return data;
}

export async function adminChangeRoleApi(id, role) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengubah role');
  return data;
}

// ── AI & Photos APIs ─────────────────────────────────────────

export async function analyzePlantPhotoApi(plantId, file) {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_BASE_URL}/plants/${plantId}/photos/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menganalisis foto tanaman');
  return data;
}

export async function addPlantPhotoDocApi(plantId, file, catatan = '') {
  const formData = new FormData();
  formData.append('photo', file);
  if (catatan) formData.append('catatan', catatan);

  const res = await fetch(`${API_BASE_URL}/plants/${plantId}/photos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengupload foto dokumentasi');
  return data;
}

export async function fetchPlantPhotosApi(plantId) {
  const res = await fetch(`${API_BASE_URL}/plants/${plantId}/photos`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil data foto tanaman');
  return data;
}

export async function chatTakuApi(message, plantId = null) {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, plantId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan ke Taku AI');
  return data;
}

export async function fetchChatHistoryApi(plantId = null) {
  const url = plantId
    ? `${API_BASE_URL}/ai/chat/history?plantId=${plantId}`
    : `${API_BASE_URL}/ai/chat/history`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil riwayat chat');
  return data;
}

export async function fetchPhotosHistoryApi(plantId = 'all') {
  const params = new URLSearchParams();
  if (plantId !== 'all') params.set('plantId', plantId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/history/photos${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil riwayat foto tanaman');
  return data;
}

// ── Taku Active Assistant API ─────────────────────────────────

/**
 * Kirim perintah suara/teks ke Taku AI (function calling endpoint).
 * @param {string} message   - Teks perintah dari user
 * @param {string} currentPage - Pathname halaman yang sedang dibuka (konteks)
 * @returns {{ toolCalls: Array, spokenReply: string, plants: Array, report: Object }}
 */
export async function takuCommandApi(message, currentPage = '') {
  const res = await fetch(`${API_BASE_URL}/ai/taku/command`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, currentPage }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghubungi Taku AI');
  return data;
}

// ── Garden Analytics APIs ────────────────────────────────────

/**
 * Ambil skor kesehatan per tanaman + statistik penyakit
 * period: 'day' | 'week' | 'month'
 */
export async function fetchGardenAnalyticsApi(period = 'week') {
  const res = await fetch(`${API_BASE_URL}/ai/garden/analytics?period=${period}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil data analisis kebun');
  return data;
}

/**
 * Ambil daftar tanaman yang butuh check-in (>6 jam belum di-handle)
 */
export async function fetchPendingCheckinApi() {
  const res = await fetch(`${API_BASE_URL}/ai/treatment-logs/pending-checkin`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil data check-in');
  return data;
}

/**
 * Simpan catatan penanganan penyakit
 */
export async function saveTreatmentLogApi({ analysisId, plantId, treatmentText, scoreBefore }) {
  const res = await fetch(`${API_BASE_URL}/ai/treatment-logs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ analysisId, plantId, treatmentText, scoreBefore }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan catatan penanganan');
  return data;
}

/**
 * Tandai treatment log sebagai selesai
 */
export async function resolveCheckinApi(logId) {
  const res = await fetch(`${API_BASE_URL}/ai/treatment-logs/${logId}/resolve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menandai selesai');
  return data;
}

/**
 * Ambil riwayat treatment log untuk laporan historis
 */
export async function fetchTreatmentHistoryApi() {
  const res = await fetch(`${API_BASE_URL}/ai/treatment-logs/history`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil riwayat penanganan');
  return data;
}
