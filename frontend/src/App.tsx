import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetListPage from './pages/AssetListPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AssetFormPage from './pages/AssetFormPage';
import AccountListPage from './pages/AccountListPage';
import AccountFormPage from './pages/AccountFormPage';
import DiscoveryJobsPage from './pages/DiscoveryJobsPage';
import DiscoveryJobDetailPage from './pages/DiscoveryJobDetailPage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ProtectedRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/assets/new" element={<AdminRoute><AssetFormPage /></AdminRoute>} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/assets/:id/edit" element={<AdminRoute><AssetFormPage /></AdminRoute>} />
          <Route path="/accounts" element={<AccountListPage />} />
          <Route path="/accounts/new" element={<AdminRoute><AccountFormPage /></AdminRoute>} />
          <Route path="/accounts/:id/edit" element={<AdminRoute><AccountFormPage /></AdminRoute>} />
          <Route path="/discovery" element={<DiscoveryJobsPage />} />
          <Route path="/discovery/:id" element={<DiscoveryJobDetailPage />} />
          <Route path="/settings" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
