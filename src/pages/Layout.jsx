
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Users, Brain, Building2, TrendingUp, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LogoHUA from '@assets/Logo_HUA-removebg-preview_1766188863277.webp';

export default function Layout({ children }) {
  const location = useLocation();

  const navigation = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { name: 'Transações', icon: Receipt, path: '/transactions' },
    { name: 'Clientes', icon: Users, path: '/customers' },
    { name: 'Fornecedores', icon: Building2, path: '/suppliers' },
    { name: 'Fluxo de Caixa', icon: TrendingUp, path: '/cashflowforecast' },
    { name: 'IA Analista', icon: Brain, path: '/reports' },
    { name: 'Calc. Preços', icon: Settings, path: '/pricingcalculator' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Header with Logo and Navigation */}
      <header className="text-white sticky top-0 z-50" style={{ backgroundColor: '#040303' }}>
        <div className="flex items-center justify-between px-2 py-1 max-w-7xl mx-auto">
          {/* Logo */}
          <img 
            src={LogoHUA} 
            alt="HUA Logo" 
            className="h-12 w-auto object-contain"
            title="HUA - Consultoria e Análise"
          />
          
          {/* Navigation */}
          <nav className="flex items-center gap-0 flex-1 ml-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.name} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-none px-2 py-1 text-xs font-medium transition-colors h-auto ${
                      isActive
                        ? 'text-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    style={{ backgroundColor: isActive ? '#E7AA1C' : 'transparent' }}
                  >
                    <item.icon className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Profile - Minimal */}
          <div className="flex items-center gap-2 ml-4 pl-2 border-l border-slate-700 flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-medium text-xs flex-shrink-0">
              US
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">Pro</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-7xl mx-auto p-2 sm:p-3 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
