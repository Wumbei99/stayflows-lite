import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ requireSuperAdmin = false }) {
  const { user, loading, isSuperAdmin, tenantId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Super admin trying to access a hotel dashboard without a tenant — send them to /admin
  if (!requireSuperAdmin && isSuperAdmin && !tenantId) {
    return <Navigate to="/admin" replace />;
  }

  if (!requireSuperAdmin && !tenantId && !isSuperAdmin) {
    // Logged in but not assigned to a tenant
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account Pending</h2>
          <p className="text-slate-500">Your account has not been assigned to a hotel yet. Please contact support.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
