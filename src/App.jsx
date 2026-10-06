import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AuthGuard from './components/AuthGuard';

// LandingPage: eager — halaman awal, harus siap tanpa delay
import LandingPage from './pages/LandingPage';

// Semua page lain: lazy — di-load hanya saat route pertama kali dikunjungi
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const GardenOverviewPage = lazy(() => import('./pages/GardenOverviewPage'));
const GardenAnalyticsPage = lazy(() => import('./pages/GardenAnalyticsPage'));
const PlantDetailPage    = lazy(() => import('./pages/PlantDetailPage'));
const HistoryPage        = lazy(() => import('./pages/HistoryPage'));
const ManagePlantsPage   = lazy(() => import('./pages/ManagePlantsPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const AdminApprovalPage  = lazy(() => import('./pages/AdminApprovalPage'));
const TakuChatPage       = lazy(() => import('./pages/TakuChatPage'));

// Import CSS Design system
import './css/style.css';
import './css/taku-hud.css';

// Fallback minimal saat lazy chunk sedang didownload
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-surface, #F6FAF8)',
    }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/"               element={<LandingPage />} />
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/register"       element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Authenticated Routes */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              }
            />
            <Route
              path="/garden"
              element={
                <AuthGuard>
                  <GardenOverviewPage />
                </AuthGuard>
              }
            />
            <Route
              path="/garden-analytics"
              element={
                <AuthGuard>
                  <GardenAnalyticsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/plant-detail"
              element={
                <AuthGuard>
                  <PlantDetailPage />
                </AuthGuard>
              }
            />
            <Route
              path="/history"
              element={
                <AuthGuard>
                  <HistoryPage />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/approval"
              element={
                <AuthGuard>
                  <AdminApprovalPage />
                </AuthGuard>
              }
            />
            <Route
              path="/manage-plants"
              element={
                <AuthGuard>
                  <ManagePlantsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <ProfilePage />
                </AuthGuard>
              }
            />
            <Route
              path="/taku"
              element={
                <AuthGuard>
                  <TakuChatPage />
                </AuthGuard>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
