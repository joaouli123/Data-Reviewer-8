
import React from 'react';
import { LogoIcon } from './constants';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from "wouter";

// Custom WhatsApp Icon to match Lucide style
const WhatsApp = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
  </svg>
);

import LogoHUACONTROL from '@assets/unnamed-removebg-preview_1767731241199.png';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-blue-900 text-white pt-20 pb-12 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 opacity-30"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 md:w-96 md:h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 md:mb-20">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <Link href="/" className="flex items-center">
                <img src={LogoHUACONTROL} alt="HUACONTROL Logo" className="h-12 w-auto object-contain" />
              </Link>
            </div>
            <p className="text-blue-100/70 mb-8 leading-relaxed text-sm md:text-base font-normal">
              O HUACONTROL é um ERP financeiro completo com inteligência artificial, desenvolvido para empresas que precisam de controle absoluto, visão estratégica e decisões seguras.
            </p>
            <div className="flex gap-4">
              {[Instagram, Facebook, WhatsApp].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all border border-blue-700">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links - Aligned with Header */}
          <div>
            <h4 className="text-base md:text-lg font-bold mb-6 md:mb-8 text-blue-200 uppercase tracking-widest">Navegação</h4>
            <ul className="space-y-4 text-blue-100/80 text-sm md:text-base font-normal">
              <li><a href="#solucao" className="hover:text-white transition-colors">A Solução</a></li>
              <li><a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a></li>
              <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Dúvidas Frequentes</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-base md:text-lg font-bold mb-6 md:mb-8 text-blue-200 uppercase tracking-widest">Suporte</h4>
            <ul className="space-y-4 text-blue-100/80 text-sm md:text-base font-normal">
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="truncate">huaconsultoriaeanalise@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400 shrink-0" />
                <span>(54) 99623-1432</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Nova Prata/RS</span>
              </li>
            </ul>
          </div>

          {/* CTA Card */}
          <div className="bg-blue-800/50 p-6 md:p-8 rounded-3xl border border-blue-700 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <h4 className="text-lg md:text-xl font-bold mb-4">Pronto para começar?</h4>
            <p className="text-xs md:text-sm text-blue-100/70 mb-6 font-normal">
              Assuma o controle do seu financeiro. Conheça como a inteligência artificial pode apoiar sua gestão financeira.
            </p>
            <a 
              href="https://wa.me/5554996231432?text=Olá,%20gostaria%20de%20saber%20o%20valor!"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 uppercase"
            >
              Solicitar apresentação
            </a>
          </div>
        </div>
        
        <div className="pt-10 border-t border-blue-800 flex flex-col md:flex-row justify-between items-center gap-6 text-blue-300 text-[10px] md:text-xs font-medium text-center md:text-left">
          <p>© {currentYear} HUACONTROL. Todos os direitos reservados. Tecnologia Enterprise para PMEs.</p>
          <div className="flex gap-6 md:gap-8 font-normal">
            <Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
