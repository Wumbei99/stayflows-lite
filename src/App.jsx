import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PostLoginRedirect from './components/auth/PostLoginRedirect';
import Login from './components/auth/Login';
import GuestFeedback from './components/guest/GuestFeedback';
import DashboardLayout from './components/dashboard/DashboardLayout';
import FeedbackDashboard from './components/dashboard/FeedbackDashboard';
import CrmDashboard from './components/dashboard/CrmDashboard';
import SuperAdmin from './components/admin/SuperAdmin';
import RoomManagement from './components/dashboard/RoomManagement';
import ServiceKanban from './components/dashboard/ServiceKanban';
import ChatInbox from './components/dashboard/ChatInbox';
import SettingsDashboard from './components/dashboard/SettingsDashboard';

function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/guest-feedback" element={<GuestFeedback />} />
          
          {/* Smart post-login redirect based on role */}
          <Route path="/post-login" element={<PostLoginRedirect />} />

          {/* Protected Hotel Staff Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="feedback" replace />} />
              <Route path="feedback" element={<FeedbackDashboard />} />
              <Route path="tickets" element={<ServiceKanban />} />
              <Route path="inbox" element={<ChatInbox />} />
              <Route path="rooms" element={<RoomManagement />} />
              <Route path="crm" element={<CrmDashboard />} />
              <Route path="settings" element={<SettingsDashboard />} />
            </Route>
          </Route>

          {/* Protected Super Admin Platform Routes */}
          <Route element={<ProtectedRoute requireSuperAdmin={true} />}>
            <Route path="/admin" element={<SuperAdmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </NetworkProvider>
  );
}

export default App;
