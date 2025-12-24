import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import Layout from '@/components/Layout';
import SuperAdminDashboard from './admin/super-dashboard';
import AdminCustomers from './admin/customers';
import AdminUsers from './admin/users';

export default function SuperAdmin() {
  const { user } = useAuth();
  const [pathname] = useLocation();

  if (!user?.isSuperAdmin) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {pathname === '/' && <SuperAdminDashboard />}
      {pathname.startsWith('/admin/customers') && <AdminCustomers />}
      {pathname.startsWith('/admin/users') && <AdminUsers />}
    </Layout>
  );
}
