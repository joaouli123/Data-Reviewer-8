import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, ShoppingCart } from 'lucide-react';
import SuperAdminDashboard from './admin/super-dashboard';
import AdminCustomers from './admin/customers';
import AdminUsers from './admin/users';

export default function SuperAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'customers', label: 'Clientes', icon: ShoppingCart },
    { id: 'users', label: 'Usuários', icon: Users },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="border-b bg-background sticky top-0 z-40">
          <div className="flex overflow-x-auto p-4 md:p-8 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2 whitespace-nowrap"
                  data-testid={`button-tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          {activeTab === 'dashboard' && <SuperAdminDashboard />}
          {activeTab === 'customers' && <AdminCustomers />}
          {activeTab === 'users' && <AdminUsers />}
        </div>
      </div>
    </Layout>
  );
}
