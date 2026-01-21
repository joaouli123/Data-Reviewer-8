
import React from 'react';
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from "wouter";

const Hero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-12 md:pt-36 md:pb-20 px-4 md:px-6 overflow-hidden bg-white">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="container mx-auto max-w-6xl relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] md:text-xs font-semibold mb-8 tracking-[0.2em] uppercase">
          <Zap className="w-3.5 h-3.5 fill-blue-600" />
          HUACONTROL
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8 text-balance">
          Controle absoluto. <span className="text-blue-600">Decisões inteligentes.</span>
        </h1>
        
        <p className="text-base md:text-lg text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed px-4 font-normal">
          ERP financeiro com inteligência artificial para empresas que exigem controle, previsibilidade e decisões seguras.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a 
              href="https://wa.me/5554996231432?text=Olá,%20gostaria%20de%20saber%20o%20valor!"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto relative inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-base md:text-lg px-10 py-5 rounded-xl font-bold transition-all shadow-xl shadow-blue-500/30 active:scale-95"
            >
              SOLICITAR APRESENTAÇÃO AGORA
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#solucao" 
              className="w-full sm:w-auto inline-flex items-center justify-center bg-white border-2 border-slate-200 hover:border-blue-600 text-slate-900 text-base md:text-lg px-10 py-5 rounded-xl font-bold transition-all active:scale-95 shadow-sm"
            >
              CONHEÇA O SISTEMA
            </a>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Dados Blindados
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Ativação Imediata
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
