
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Users, Settings, Menu, X, Brain, Building2, TrendingUp, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LogoHUA from '@assets/Logo_HUA_1766187037233.png';

export default function Layout({ children }) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const navigation = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { name: 'Transações', icon: Receipt, path: '/transactions' },
    { name: 'Clientes', icon: Users, path: '/customers' },
    { name: 'Fornecedores', icon: Building2, path: '/suppliers' },
    { name: 'Categorias', icon: Tag, path: '/categories' },
    { name: 'Fluxo de Caixa', icon: TrendingUp, path: '/cashflowforecast' },
    { name: 'IA Analista', icon: Brain, path: '/reports' },
    { name: 'Calc. Preços', icon: Settings, path: '/pricingcalculator' },
  ];

  const NavContent = ({ onNavigate }) => (
    <div className="flex flex-col h-full py-3 px-4 text-white" style={{ backgroundColor: '#040303' }}>
      <div className="flex items-center pt-3 pb-2 mb-2">
        <img 
          src={LogoHUA} 
          alt="HUA Logo" 
          className="w-36 h-22 object-contain flex-shrink-0"
          title="HUA - Consultoria e Análise"
        />
      </div>
      
      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
                <Link key={item.name} to={item.path} onClick={onNavigate}>
                <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive 
                        ? 'text-black shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    style={{ backgroundColor: isActive ? '#E7AA1C' : 'transparent' }}
                >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="font-medium text-sm">{item.name}</span>
                </div>
                </Link>
            );
        })}
      </nav>

      <div className="pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-blue-400 font-medium text-xs">
            US
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Empresário</p>
            <p className="text-xs text-slate-400 truncate">Plano Pro</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <NavContent onNavigate={() => {}} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 text-white sticky top-0 z-20" style={{ backgroundColor: '#040303' }}>
        <img 
          src={LogoHUA} 
          alt="HUA Logo" 
          className="w-16 h-16 object-contain"
          title="HUA - Consultoria e Análise"
        />
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="w-8 h-8" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-slate-800 w-64" style={{ backgroundColor: '#040303' }}>
            <NavContent onNavigate={closeMobileMenu} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
