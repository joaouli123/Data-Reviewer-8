
import React, { useState } from 'react';
import { LogoIcon } from './constants';
import { Menu, X } from 'lucide-react';
import { Link } from "wouter";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Início', href: '/' },
    { name: 'A Solução', href: '#solucao' },
    { name: 'Benefícios', href: '#beneficios' },
    { name: 'Recursos', href: '#recursos' },
    { name: 'Planos', href: '#precos' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 shrink-0 group transition-transform">
          <span className="text-lg md:text-xl font-bold tracking-tighter text-slate-900">
            <span className="text-blue-600">HUA</span><span className="text-[#D4AF37]">CONTROL</span>
          </span>
        </a>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600 tracking-tight">
          {menuItems.map((item) => (
            item.href.startsWith('#') ? (
              <a 
                key={item.name} 
                href={item.href} 
                className="hover:text-blue-600 transition-colors relative py-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-blue-600 hover:after:w-full after:transition-all first-letter:uppercase lowercase"
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className="hover:text-blue-600 transition-colors relative py-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-blue-600 hover:after:w-full after:transition-all first-letter:uppercase lowercase"
              >
                {item.name}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="hidden sm:inline-flex text-slate-600 hover:text-blue-600 text-sm font-bold transition-colors px-4 py-2"
          >
            Entrar
          </Link>
          <a 
            href="#precos" 
            className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            Começar Agora
          </a>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden absolute top-[80px] left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 transition-all duration-300 ease-in-out ${isMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible'}`}>
        <nav className="flex flex-col p-6 gap-2">
          {menuItems.map((item) => (
            item.href.startsWith('#') ? (
              <a 
                key={item.name} 
                href={item.href} 
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-semibold text-slate-900 p-4 hover:bg-slate-50 rounded-xl transition-colors"
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-semibold text-slate-900 p-4 hover:bg-slate-50 rounded-xl transition-colors"
              >
                {item.name}
              </Link>
            )
          ))}
          <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-3">
            <Link 
              href="/login" 
              className="w-full text-center py-4 text-slate-900 font-bold"
            >
              Entrar
            </Link>
            <Link 
              href="/signup?plan=pro" 
              onClick={() => setIsMenuOpen(false)}
              className="w-full bg-blue-600 text-white text-center py-4 rounded-xl font-bold shadow-lg"
            >
              Garantir Acesso Vitalício
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
