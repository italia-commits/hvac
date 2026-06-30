import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import TwoFactorPage from './pages/auth/TwoFactorPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerProfilePage from './pages/customers/CustomerProfilePage';
import EquipmentPage from './pages/equipment/EquipmentPage';
import AgreementsPage from './pages/agreements/AgreementsPage';
import ServiceCallsPage from './pages/service/ServiceCallsPage';
import OpportunitiesPage from './pages/opportunities/OpportunitiesPage';
import ReportsPage from './pages/reports/ReportsPage';
import AIInsightsPage from './pages/insights/AIInsightsPage';
import AdminPortalPage from './pages/admin/AdminPortalPage';
import CompaniesPage from './pages/companies/CompaniesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/2fa" element={<PublicRoute><TwoFactorPage /></PublicRoute>} />
            <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />

            {/* Protected App Routes */}
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerProfilePage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route path="agreements" element={<AgreementsPage />} />
              <Route path="service-calls" element={<ServiceCallsPage />} />
              <Route path="opportunities" element={<OpportunitiesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="insights" element={<AIInsightsPage />} />
              <Route path="admin" element={<AdminPortalPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}