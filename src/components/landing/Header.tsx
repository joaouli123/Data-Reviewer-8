
import React, { useState } from 'react';
import { LogoIcon } from './constants';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: 'A Solução', href: '#solucao' },
    { name: 'Benefícios', href: '#beneficios' },
    { name: 'Recursos', href: '#recursos' },
    { name: 'Planos', href: '#precos' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Login', href: '/login' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <LogoIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
          <a href="/" className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 uppercase">
            HUA<span className="text-blue-600">CONSULTORIA</span>
          </a>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
          {menuItems.map((item) => (
            <a 
              key={item.name} 
              href={item.href} 
              className="hover:text-blue-600 transition-colors py-2"
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a 
            href="/login" 
            className="hidden sm:inline-flex text-slate-600 hover:text-blue-600 text-sm font-bold transition-colors"
          >
            ENTRAR
          </a>
          <a 
            href="#precos" 
            className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            ASSINAR AGORA
          </a>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 transition-all duration-300 ease-in-out ${isMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible'}`}>
        <nav className="flex flex-col p-6 gap-4">
          {menuItems.map((item) => (
            <a 
              key={item.name} 
              href={item.href} 
              onClick={() => setIsMenuOpen(false)}
              className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 last:border-0"
            >
              {item.name}
            </a>
          ))}
          <a 
            href="#precos" 
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 w-full bg-blue-600 text-white text-center py-4 rounded-xl font-bold"
          >
            GARANTIR ACESSO VITALÍCIO
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
