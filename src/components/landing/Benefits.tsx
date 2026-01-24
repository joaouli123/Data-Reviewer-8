
import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  LineChart, 
  Calculator, 
  FileBarChart, 
  Fingerprint,
  CheckCircle2
} from 'lucide-react';

const Benefits: React.FC = () => {
  const benefits = [
    {
      icon: <LineChart className="w-6 h-6" />,
      title: "Analisar fluxo de caixa e projeções",
      desc: "Visão clara do realizado e projetado para antecipar cenários e garantir a saúde financeira do negócio."
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: "Interpretar DRE gerencial",
      desc: "Interpretação automática dos resultados para entender a lucratividade real da operação em tempo real."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Avaliar capital de giro",
      desc: "Análise inteligente das necessidades de caixa para suportar o crescimento sustentável da empresa."
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Identificar riscos de endividamento",
      desc: "Identificação proativa de riscos de crédito e gestão de obrigações para evitar surpresas no orçamento."
    },
    {
      icon: <FileBarChart className="w-6 h-6" />,
      title: "Indicadores financeiros",
      desc: "Painéis de controle com as métricas que realmente importam para quem decide o futuro do negócio."
    },
    {
      icon: <Fingerprint className="w-6 h-6" />,
      title: "Apoiar decisões estratégicas",
      desc: "Camada de IA que interpreta dados, identifica riscos e apoia gestores com recomendações estratégicas."
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-white" id="beneficios">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
          <h2 className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-3">INTELIGÊNCIA ARTIFICIAL A SERVIÇO DA GESTÃO</h2>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
            CONTROLE FINANCEIRO EM UM <span className="text-blue-600">ÚNICO AMBIENTE.</span>
          </h3>
          <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto font-normal">
            O HUACONTROL entrega uma gestão financeira estruturada, com visão clara do presente e do futuro da empresa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className="group p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                {benefit.icon}
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{benefit.title}</h4>
              <p className="text-slate-500 leading-relaxed text-sm font-normal">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner Padronizado */}
        <div className="mt-20 md:mt-24 bg-blue-600 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-400/20 blur-[120px]"></div>
          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <h3 className="text-2xl md:text-4xl font-extrabold mb-6 leading-tight tracking-tight">
                Pronto para assumir o controle real do seu negócio?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {[
                  'DRE em tempo real', 
                  'Gestão de Inadimplência', 
                  'Conciliação Bancária', 
                  'Suporte Prioritário'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 font-semibold text-sm text-blue-50">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                    {item}
                  </div>
                ))}
              </div>
              <a 
                href="https://wa.me/5554996231432?text=Olá,%20gostaria%20saber%20mais%20informações%20sobre%20o%20sistema."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl hover:bg-blue-50 active:scale-95"
              >
                SOLICITAR APRESENTAÇÃO
              </a>
            </div>
            <div className="hidden lg:block relative">
              <img 
                src="/desktop.png" 
                className="rounded-3xl border-4 border-blue-400 shadow-2xl" 
                alt="HUACONTROL Dashboard Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
