
import React from 'react';
import { ShieldCheck } from './constants';

const Guarantee: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-slate-50" id="garantia">
      <div className="container mx-auto max-w-4xl mb-16">
        <div className="bg-blue-600 p-8 md:p-16 rounded-[2.5rem] text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-500/30 blur-[100px]"></div>
          <div className="absolute bottom-0 right-0 w-1/3 h-full bg-blue-400/20 blur-[80px]"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-tight">Assuma o controle do seu financeiro agora</h2>
            <p className="text-blue-100 mb-10 max-w-2xl text-sm md:text-lg font-normal leading-relaxed">
              Fale com um de nossos consultores e descubra como o HUACONTROL pode transformar a gestão da sua empresa com inteligência e previsibilidade.
            </p>
            <a 
              href="https://wa.me/5554996231432?text=Olá,%20gostaria%20de%20saber%20o%20valor!"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-xl active:scale-95 uppercase gap-3"
            >
              Consultar preços no whatsapp
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl bg-white border border-blue-100 p-8 md:p-16 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100/50 blur-[60px] rounded-full"></div>
        
        <div className="w-48 h-48 flex-shrink-0 relative">
          <ShieldCheck className="w-full h-full text-blue-600" />
          <div className="absolute inset-0 bg-blue-600/5 rounded-full animate-ping"></div>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Risco <span className="text-blue-600">ZERO</span> para Você.</h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-6 font-normal">
            Sabemos que trocar de sistema é uma decisão importante para sua empresa. Por isso, oferecemos uma <strong className="text-blue-700 underline decoration-blue-200 underline-offset-8 font-semibold">Garantia Incondicional de 7 Dias.</strong>
          </p>
          <p className="text-slate-500 italic border-l-4 border-blue-600 pl-6 py-2 font-normal">
            Entre, cadastre seus dados, teste a gestão de equipe, faça lançamentos. Se você achar que o sistema não é para você, devolvemos 100% do seu dinheiro. Sem perguntas, sem letras miúdas.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Guarantee;
