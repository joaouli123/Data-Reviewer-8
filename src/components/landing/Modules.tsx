
import React from 'react';
import { LayoutDashboard, ArrowRightLeft, TrendingUp, FileBarChart, Users, Truck } from 'lucide-react';

const Modules: React.FC = () => {
  const modules = [
    {
      icon: <LayoutDashboard className="w-8 h-8" />,
      title: "Dashboard Executivo",
      subtitle: "Visão macro e estratégica",
      features: ["KPIs: Receita, Despesa e Pendências", "Gráfico Comparativo (6 meses)", "Fluxo de Caixa Futuro (30 dias)", "Monitoramento de Transações"]
    },
    {
      icon: <ArrowRightLeft className="w-8 h-8" />,
      title: "Gestão de Transações",
      subtitle: "Controle inteligente de caixa",
      features: ["Importação Inteligente (OFX/PDF/IA)", "Reconciliação Bancária Automática", "Gestão de Parcelamentos Múltiplos", "Filtros Avançados e Exportação CSV"]
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Fluxo de Caixa",
      subtitle: "Previsibilidade financeira",
      features: ["Projeção de Receitas e Despesas", "Gráfico de Saldo Acumulado", "Visão Detalhada por Período", "Análise de Tendências de Saldo"]
    },
    {
      icon: <FileBarChart className="w-8 h-8" />,
      title: "Relatórios & DRE",
      subtitle: "Inteligência Artificial Financeira",
      features: ["IA Analista & Simulação (What-If)", "DRE Gerencial Detalhado", "Análise de Capital de Giro e Dívidas", "Exportação Profissional PDF/Excel"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Gestão de Clientes",
      subtitle: "CRM de Vendas Integrado",
      features: ["Cadastro Completo (CPF/Email)", "Histórico de Vendas Detalhado", "Lançamento de Vendas Parceladas", "Busca Rápida e Organização"]
    },
    {
      icon: <Truck className="w-8 h-8" />,
      title: "Gestão de Fornecedores",
      subtitle: "Controle de compras",
      features: ["Cadastro de Fornecedores (CNPJ)", "Histórico de Compras Realizadas", "Gestão de Compras Parceladas", "Controle de Cadastro e Contato"]
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-slate-50 border-y border-slate-100" id="recursos">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
          <h2 className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-3">Ecossistema Completo</h2>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 px-4 md:px-0 tracking-tight">
            Um sistema, <span className="text-blue-600 italic font-medium">infinitas</span> possibilidades
          </h3>
          <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto px-4 font-normal">
            6 módulos poderosos integrados para você dominar as finanças sem precisar de várias ferramentas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2 md:px-0">
          {modules.map((mod, idx) => (
            <div key={idx} className="group p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
              <div className="text-blue-600 mb-6 group-hover:scale-110 transition-transform origin-left">
                <div className="w-10 h-10">
                  {React.cloneElement(mod.icon as React.ReactElement, { className: "w-full h-full" })}
                </div>
              </div>
              <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">{mod.title}</h4>
              <p className="text-blue-600/80 text-[9px] font-bold uppercase tracking-wider mb-5">{mod.subtitle}</p>
              <ul className="space-y-2.5">
                {mod.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-500 text-xs font-normal">
                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Modules;
