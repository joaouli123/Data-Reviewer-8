import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { LayoutDashboard, Receipt, Users, Settings, Menu, X, Brain, Building2, TrendingUp, Tag, LogOut, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import LogoHUA from '@assets/Logo_HUA_1766187037233.png';

export default function Layout({ children }) {
  const [pathname] = useLocation();
  const { user, company, logout } = useAuth();
  const { hasPermission } = usePermission();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  // Super Admin navigation
  const superAdminNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['super_admin'], permission: null },
    { name: 'Clientes', icon: Users, path: '/admin/customers', roles: ['super_admin'], permission: null },
    { name: 'Usuários', icon: Users, path: '/admin/users', roles: ['super_admin'], permission: null },
  ];

  // Regular user navigation
  const baseNavigation = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'user', 'operational'], permission: null },
    { name: 'Transações', icon: Receipt, path: '/transactions', roles: ['admin', 'manager', 'user', 'operational'], permission: 'view_transactions' },
    { name: 'Clientes', icon: Users, path: '/customers', roles: ['admin', 'manager', 'user', 'operational'], permission: 'view_customers' },
    { name: 'Fornecedores', icon: Building2, path: '/suppliers', roles: ['admin', 'manager', 'user', 'operational'], permission: 'view_suppliers' },
    { name: 'Categorias', icon: Tag, path: '/categories', roles: ['admin', 'manager'], permission: null },
    { name: 'Fluxo de Caixa', icon: TrendingUp, path: '/cashflowforecast', roles: ['admin', 'manager', 'user'], permission: 'view_reports' },
    { name: 'IA Analista', icon: Brain, path: '/reports', roles: ['admin', 'manager', 'user'], permission: 'view_reports' },
    { name: 'Calc. Preços', icon: Settings, path: '/pricingcalculator', roles: ['admin', 'manager', 'user', 'operational'], permission: null },
    { name: 'Gestão de Usuários', icon: Users, path: '/users', roles: ['admin'], permission: 'manage_users' },
  ];

  // Choose navigation based on user type
  const navigationList = user?.isSuperAdmin ? superAdminNavigation : baseNavigation;

  const navigation = navigationList.filter(item => {
    const hasRole = item.roles.includes(user?.role || 'user') || (user?.isSuperAdmin && item.roles.includes('super_admin'));
    const hasPermissionCheck = item.permission ? hasPermission(item.permission) : true;
    return hasRole && hasPermissionCheck;
  });

  const NavContent = ({ onNavigate }) => (
    <div className="flex flex-col h-full py-3 px-4 text-white" style={{ backgroundColor: '#040303' }}>
      <div className="flex items-center pt-3 pb-2 mb-2">
        <img src={LogoHUA} alt="HUA Logo" className="w-36 h-22 object-contain flex-shrink-0" title="HUA - Consultoria e Análise" />
      </div>
      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
                <Link key={item.name} href={item.path} onClick={onNavigate}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? 'text-black shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    style={{ backgroundColor: isActive ? '#E7AA1C' : 'transparent' }} data-testid={`link-nav-${item.name.toLowerCase()}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="font-medium text-sm">{item.name}</span>
                </div>
                </Link>
            );
        })}
        <Link href="/profile" onClick={onNavigate}>
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${pathname === '/profile' ? 'text-black shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              style={{ backgroundColor: pathname === '/profile' ? '#E7AA1C' : 'transparent' }} data-testid="link-nav-meu-perfil">
              <User className={`w-5 h-5 ${pathname === '/profile' ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-medium text-sm">Meu Perfil</span>
          </div>
        </Link>
        <div onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer" data-testid="button-logout">
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-white" />
          <span className="font-medium text-sm">Logout</span>
        </div>
      </nav>
      <div className="pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-blue-400 font-medium text-xs">{user?.name?.substring(0, 2).toUpperCase() || 'US'}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-slate-400 truncate">{company?.name || 'Empresa'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <NavContent onNavigate={() => {}} />
      </div>
      <div className="md:hidden flex items-center justify-between p-3 text-white sticky top-0 z-20" style={{ backgroundColor: '#040303' }}>
        <img src={LogoHUA} alt="HUA Logo" className="w-16 h-16 object-contain" title="HUA - Consultoria e Análise" />
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              {isMobileOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-slate-800 w-64" style={{ backgroundColor: '#040303' }}>
            <NavContent onNavigate={() => setIsMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <main className="md:pl-64 min-h-screen transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
