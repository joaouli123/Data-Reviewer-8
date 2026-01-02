
import React from 'react';
import { Zap, ArrowRight, ShieldCheck, Play } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-56 md:pb-32 px-4 md:px-6 blue-mesh overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[5%] w-72 md:w-[600px] h-72 md:h-[600px] bg-blue-200/40 blur-[120px] rounded-full"></div>
      </div>

      <div className="container mx-auto text-center max-w-6xl relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] md:text-xs font-semibold mb-8 tracking-[0.2em] uppercase">
          <Zap className="w-3.5 h-3.5 fill-blue-600" />
          OFERTA ESPECIAL: <span className="text-blue-900">ACESSO VITALÍCIO LIBERADO</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-8 text-balance">
          O Fim das Planilhas Quebradas e das <span className="text-blue-600">Mensalidades Eternas.</span>
        </h1>
        
        <p className="text-lg md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed px-4 font-normal">
          Assuma o controle financeiro de nível bancário com gestão de equipe avançada. <span className="text-blue-700 font-semibold">Pague uma única vez e use para sempre.</span>
        </p>
        
        <div className="flex flex-col items-center gap-8 mb-20">
          <a 
            href="#precos" 
            className="group w-full sm:w-auto relative inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-lg md:text-xl px-12 py-5 rounded-2xl font-bold transition-all shadow-2xl shadow-blue-500/30 active:scale-95"
          >
            GARANTIR ACESSO VITALÍCIO AGORA
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Dados Blindados
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Ativação Imediata
            </span>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative group max-w-5xl mx-auto">
          <div className="absolute -inset-4 bg-blue-500 rounded-[2rem] md:rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition duration-700"></div>
          <div className="relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-900 aspect-video flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop" 
              alt="HUA Consultoria Dashboard Interface" 
              className="w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-32 md:h-32 bg-blue-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                <Play className="w-8 h-8 md:w-14 md:h-14 text-white fill-current ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
