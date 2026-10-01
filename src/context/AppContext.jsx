import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useTransition } from 'react';
import { getMeApi, loginApi, fetchPlants } from '../services/plantService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [plantsLoading, setPlantsLoading] = useState(false);

  // startTransition untuk toast — toast adalah UI non-urgent (muncul setelah aksi),
  // tidak perlu blok interaksi / paint utama. Dengan startTransition, React
  // dapat menunda update setToasts jika ada render prioritas lebih tinggi.
  const [, startTransition] = useTransition();

  const [landingSeen, setLandingSeen] = useState(false);
  const markLandingSeen = useCallback(() => setLandingSeen(true), []);

  // Theme state: light / dark
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tmk_theme') || 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', saved);
      document.body.setAttribute('data-theme', saved);
    }
    return saved;
  });

  const toggleTheme = useCallback((targetTheme = null) => {
    setTheme((prev) => {
      const isExplicit = typeof targetTheme === 'string' && (targetTheme === 'light' || targetTheme === 'dark');
      const nextTheme = isExplicit ? targetTheme : (prev === 'dark' ? 'light' : 'dark');
      localStorage.setItem('tmk_theme', nextTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
        document.body.setAttribute('data-theme', nextTheme);
      }
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('tmk_theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Worker/admin: ID user yang sedang dikelola (null = diri sendiri untuk role user)
  const [selectedManagedUserId, setSelectedManagedUserId] = useState(null);

  // Cek sesi saat aplikasi pertama kali dibuka
  useEffect(() => {
    const token = localStorage.getItem('tmk_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    getMeApi()
      .then((userData) => {
        setUser(userData);
        setLoggedIn(true);
      })
      .catch(() => {
        localStorage.removeItem('tmk_token');
        setLoggedIn(false);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  /**
   * loadPlants — fetch tanaman sesuai role:
   *  - role 'user'          : fetch milik sendiri (tidak perlu userId param)
   *  - role 'worker'/'admin': fetch untuk selectedManagedUserId (WAJIB ada,
   *    server menolak tanpa userId → error 400). Kalau belum ada user yang
   *    dipilih, jangan request ke API sama sekali.
   */
  const loadPlants = useCallback(async (overrideUserId = null) => {
    if (!loggedIn) return;
    setPlantsLoading(true);
    try {
      const currentUser = user; // closure snapshot
      let targetId = overrideUserId;

      // Untuk worker/admin, pakai selectedManagedUserId kalau tidak ada override
      if (!targetId && currentUser && currentUser.role !== 'user') {
        targetId = selectedManagedUserId;
      }

      // Worker/admin wajib menyertakan userId — tanpa itu server mengembalikan
      // 400. Kalau belum ada user terpilih, kosongkan list & jangan fetch.
      if (currentUser && currentUser.role !== 'user' && !targetId) {
        setPlants([]);
        return;
      }

      const data = await fetchPlants(targetId || null);
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal load tanaman:', err.message);
      setPlants([]);
    } finally {
      setPlantsLoading(false);
    }
  }, [loggedIn, user, selectedManagedUserId]);

  useEffect(() => {
    if (loggedIn) {
      loadPlants();
    } else {
      setPlants([]);
    }
  }, [loggedIn, loadPlants]);

  // Saat worker/admin ganti user yang dikelola, reload plants otomatis
  useEffect(() => {
    if (loggedIn && user && user.role !== 'user' && selectedManagedUserId) {
      loadPlants(selectedManagedUserId);
    }
  }, [selectedManagedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    // NON-URGENT: toast adalah feedback sekunder, tidak perlu blok paint utama
    startTransition(() => {
      setToasts((prev) => [...prev, { id, message, type }]);
    });
    setTimeout(() => {
      setToasts((prev) => prev.map(t => t.id === id ? { ...t, out: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  }, [startTransition]);

  const loginUser = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    setUser(data.user);
    setLoggedIn(true);
    showToast('Selamat datang kembali! 🌱', 'success');
    return data;
  }, [showToast]);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('tmk_token');
    setLoggedIn(false);
    setUser(null);
    setPlants([]);
    setSelectedManagedUserId(null);
    showToast('Berhasil keluar akun', 'success');
  }, [showToast]);

  const updatePlant = useCallback((updatedPlant) => {
    setPlants((prev) => prev.map(p => p.id === updatedPlant.id ? updatedPlant : p));
  }, []);

  const contextValue = useMemo(() => ({
    user,
    setUser,
    plants,
    setPlants,
    loggedIn,
    setLoggedIn,
    toasts,
    showToast,
    loginUser,
    logoutUser,
    updatePlant,
    loadPlants,
    authLoading,
    plantsLoading,
    selectedManagedUserId,
    setSelectedManagedUserId,
    landingSeen,
    markLandingSeen,
    theme,
    toggleTheme,
  }), [
    user, plants, loggedIn, toasts, authLoading, plantsLoading,
    selectedManagedUserId, landingSeen, theme, toggleTheme,
    showToast, loginUser, logoutUser, updatePlant, loadPlants, markLandingSeen,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {/* Global Toast UI */}
      <div id="toast-container" className="toast-container">
        {toasts.map((toast) => {
          const colors = {
            success: 'var(--color-primary)',
            warning: 'var(--color-warning)',
            error: 'var(--color-danger)',
          };
          const icons = {
            success: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ),
            warning: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
            error: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ),
          };
          return (
            <div
              key={toast.id}
              className={`toast ${toast.type} ${toast.out ? 'toast-out' : ''}`}
              style={{ color: colors[toast.type] }}
            >
              {icons[toast.type]}
              <span style={{ color: 'var(--color-text)' }}>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
