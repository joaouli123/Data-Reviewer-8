
import React from 'react';
import { Check, Star } from 'lucide-react';

const Pricing: React.FC = () => {
  return (
    <section className="py-20 md:py-32 bg-white" id="precos">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
          <h2 className="text-blue-600 font-bold text-xs md:text-sm uppercase tracking-[0.3em] mb-4 text-center">Tabela de Investimento</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            Escolha seu Plano de <span className="text-blue-600">Liberdade Financeira.</span>
          </h3>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal">
            Pague mensalmente ou livre-se de taxas para sempre com o plano <span className="font-semibold text-blue-600">Vitalício.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Monthly Plan */}
          <div className="p-10 rounded-[3rem] border-2 border-slate-100 bg-slate-50/50 flex flex-col hover:border-slate-300 transition-all">
            <div className="mb-10">
              <h4 className="text-2xl font-bold text-slate-900 mb-2">Plano Mensal</h4>
              <p className="text-slate-500 font-medium text-sm">Ideal para testar a ferramenta.</p>
            </div>
            
            <div className="mb-10">
              <span className="text-6xl font-bold text-slate-900 tracking-tighter">R$ 97</span>
              <span className="text-slate-500 font-bold ml-1">/mês</span>
            </div>

            <ul className="space-y-5 mb-12 flex-grow">
              {['Acesso completo ao sistema', 'Até 3 Usuários ativos', 'Controle de Fluxo de Caixa', 'Suporte via E-mail'].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-700 font-semibold">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" /> {item}
                </li>
              ))}
              <li className="flex items-center gap-4 text-slate-400 font-medium italic">
                <span className="text-xl">×</span> Sem acesso vitalício
              </li>
            </ul>

            <a 
              href="/checkout?plan=monthly" 
              className="w-full py-5 rounded-2xl border-2 border-slate-300 text-slate-900 font-bold text-center text-lg hover:bg-slate-100 transition-all"
            >
              ASSINAR MENSAL
            </a>
          </div>

          {/* Lifetime Plan */}
          <div className="relative p-10 rounded-[3rem] bg-blue-600 text-white border-8 border-blue-400 shadow-3xl transform md:scale-105 transition-all">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-900 px-8 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-2 shadow-2xl border-2 border-white">
              <Star className="w-4 h-4 fill-current" /> MAIS VENDIDO & VITALÍCIO
            </div>
            
            <div className="mb-10 mt-4">
              <h4 className="text-2xl font-bold text-white mb-2 tracking-tight">Plano Vitalício</h4>
              <p className="text-blue-100 font-medium text-sm">Pague uma vez, seja dono para sempre.</p>
            </div>
            
            <div className="mb-2 line-through text-blue-300 font-bold">De: R$ 2.997,00</div>
            <div className="mb-10">
              <span className="text-sm font-bold text-blue-200 align-top mt-2 inline-block">12x de </span>
              <span className="text-7xl font-bold text-white tracking-tighter ml-1">R$ 99,70</span>
              <div className="text-white mt-2 font-bold text-xl">ou R$ 997,00 à vista</div>
            </div>

            <ul className="space-y-5 mb-12 flex-grow">
              {[
                {text: 'ACESSO VITALÍCIO LIBERADO', highlight: true},
                {text: 'Usuários ILIMITADOS', highlight: false},
                {text: 'Módulo de Equipe Avançado', highlight: false},
                {text: 'Suporte VIP via WhatsApp', highlight: false},
                {text: 'Todas as atualizações futuras', highlight: false}
              ].map((item, i) => (
                <li key={i} className={`flex items-center gap-4 ${item.highlight ? 'text-white font-bold' : 'text-blue-100 font-semibold'}`}>
                  <Check className={`w-6 h-6 shrink-0 ${item.highlight ? 'text-yellow-400' : 'text-blue-300'}`} /> {item.text}
                </li>
              ))}
            </ul>

            <a 
              href="/checkout?plan=pro" 
              className="w-full py-6 rounded-2xl bg-white text-blue-600 font-bold text-center text-2xl shadow-xl hover:bg-blue-50 transition-all active:scale-95"
            >
              QUERO O VITALÍCIO
            </a>
            <p className="text-center mt-6 text-xs font-bold text-blue-200 uppercase tracking-widest animate-pulse">
              ⚡ Oferta limitada para este lote.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
