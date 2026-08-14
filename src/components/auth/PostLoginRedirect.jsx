import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * PostLoginRedirect: A smart routing component that sends users to the right
 * dashboard based on their role after login.
 * - Super Admins → /admin
 * - Hotel Managers → /dashboard
 * - Unknown role → /login
 */
export default function PostLoginRedirect() {
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

  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (tenantId) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fallback: user is logged in but has no role assigned
  return <Navigate to="/login" replace />;
}
