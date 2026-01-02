
import React from 'react';
import { Zap, ArrowRight, ShieldCheck, Play } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 md:px-6 overflow-hidden bg-white">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 animate-fade-in">
              <Zap className="w-3.5 h-3.5 fill-blue-600" />
              <span className="uppercase tracking-wider">Acesso Vitalício Liberado</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-8">
              Controle sua empresa como os <span className="text-blue-600">gigantes do mercado.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              A ferramenta de gestão financeira enterprise que sua PME precisa. <span className="text-slate-900 font-bold underline decoration-blue-500/30">Pague uma vez, use para sempre.</span> Sem mensalidades, sem limites.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <a 
                href="#precos" 
                className="group relative inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-5 rounded-2xl font-bold transition-all shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 active:scale-95"
              >
                Garantir Acesso Agora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="/signup" 
                className="inline-flex items-center justify-center bg-white border-2 border-slate-200 hover:border-blue-600 text-slate-900 text-lg px-10 py-5 rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-95"
              >
                Teste Grátis
              </a>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-50 rounded-full">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">Dados 100% Protegidos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 rounded-full">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">Set-up em 2 minutos</span>
              </div>
            </div>
          </div>

          {/* Right Content - Visual */}
          <div className="flex-1 w-full lg:max-w-none max-w-2xl mx-auto">
            <div className="relative group">
              {/* Decorative elements behind image */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition duration-700"></div>
              
              <div className="relative rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-900 aspect-[4/3] sm:aspect-video lg:aspect-square xl:aspect-video flex items-center justify-center group-hover:-rotate-1 transition-transform duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop" 
                  alt="HUA Gestão Financeira" 
                  className="w-full h-full object-cover brightness-[0.8] group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group/play border border-white/20 hover:scale-110 transition-all duration-300">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover/play:bg-blue-600 transition-colors">
                      <Play className="w-6 h-6 text-blue-600 fill-current ml-1 group-hover/play:text-white transition-colors" />
                    </div>
                  </button>
                </div>

                {/* Floating UI Elements */}
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl hidden sm:block translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lucro Operacional</p>
                      <p className="text-2xl font-black text-slate-900">+ R$ 42.500,00</p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-xl">
                      <Zap className="w-6 h-6 text-white fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
