import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Public
import LandingPage from '../pages/public/LandingPage';
import LoginPage from '../pages/public/LoginPage';
import SignupPage from '../pages/public/SignupPage';
import AdminSignupPage from '../pages/public/AdminSignupPage';
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage';
import ResetPasswordPage from '../pages/public/ResetPasswordPage';

// Member
import MemberLayout from '../components/layout/MemberLayout';
import MemberDashboard from '../pages/member/MemberDashboard';
import ContentLibrary from '../pages/member/ContentLibrary';
import LiveSessions from '../pages/member/LiveSessions';
import MembershipPage from '../pages/member/MembershipPage';
import ProfilePage from '../pages/member/ProfilePage';

// Admin
import AdminLayout from '../components/layout/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProductsManager from '../pages/admin/ProductsManager';
import MembersManager from '../pages/admin/MembersManager';
import RevenuePage from '../pages/admin/RevenuePage';
import LiveManager from '../pages/admin/LiveManager';
import SettingsPage from '../pages/admin/SettingsPage';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!adminOnly && user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  return children;
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
        <Route path="/admin-signup" element={<GuestRoute><AdminSignupPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        {/* Member */}
        <Route path="/" element={<PrivateRoute><MemberLayout /></PrivateRoute>}>
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="content" element={<ContentLibrary />} />
          <Route path="live" element={<LiveSessions />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="members" element={<MembersManager />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="live" element={<LiveManager />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
