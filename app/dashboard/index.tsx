import { useAuth } from '@/contexts/AuthContext';
import { DispatcherDashboard } from '@/components/dashboard/DispatcherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function DashboardIndex() {
  const { profile } = useAuth();

  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <DispatcherDashboard />;
}
