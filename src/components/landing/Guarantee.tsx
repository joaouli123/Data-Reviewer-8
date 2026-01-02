
import React from 'react';
import { ShieldCheck } from '../constants';

const Guarantee: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-slate-50">
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
