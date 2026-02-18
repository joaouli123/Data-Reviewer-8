
import React, { useEffect, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { Link } from "wouter";

const formatPlanPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const Pricing: React.FC = () => {
  const [monthlyPrice, setMonthlyPrice] = useState<number>(215);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/plans')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to fetch plans'))))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        const monthly = list.find((p: any) => p?.key === 'monthly');
        const price = Number(monthly?.price);
        if (Number.isFinite(price) && price >= 0) setMonthlyPrice(price);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-16 md:py-24 bg-white" id="precos">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
          <h2 className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-3 text-center">Tabela de Investimento</h2>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
            Assuma o <span className="text-blue-600">Controle</span> do seu Financeiro.
          </h3>
          <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto font-normal">
            Escolha o plano ideal para governar sua empresa com precisão e <span className="font-semibold text-blue-600">previsibilidade.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-6 max-w-xl mx-auto items-stretch">
          {/* Monthly Plan */}
          <div className="relative p-8 rounded-[2rem] bg-blue-600 text-white border-4 border-blue-400 shadow-2xl transition-all">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-900 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-2 shadow-xl border-2 border-white">
              <Star className="w-3.5 h-3.5 fill-current" /> PLANO ÚNICO
            </div>
            
            <div className="mb-8 mt-4">
              <h4 className="text-xl font-bold text-white mb-1 tracking-tight">Plano Mensal</h4>
              <p className="text-blue-100 font-medium text-xs">Acesso completo ao sistema.</p>
            </div>
            
            <div className="mb-8">
              <span className="text-6xl font-bold text-white tracking-tighter">{formatPlanPrice(monthlyPrice)}</span>
              <span className="text-white font-bold text-sm ml-1">/mês</span>
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
              {['Acesso completo ao sistema', 'Usuários ativos', 'Controle de Fluxo de Caixa', 'Suporte via E-mail'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-blue-100 text-sm font-semibold">
                  <Check className="w-5 h-5 shrink-0 text-yellow-400" /> {item}
                </li>
              ))}
            </ul>

            <Link 
              href="/signup?plan=monthly" 
              className="w-full py-5 rounded-xl bg-white text-blue-600 font-bold text-center text-lg sm:text-xl shadow-xl hover:bg-blue-50 transition-all active:scale-95 px-4 flex items-center justify-center whitespace-nowrap"
            >
              QUERO ACESSO COMPLETO
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
