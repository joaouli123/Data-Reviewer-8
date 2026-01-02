
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
      icon: <ShieldCheck className="w-7 h-7" />,
      title: "Segurança Bancária",
      desc: "Criptografia de ponta com isolamento total. Seus dados financeiros protegidos por blindagem enterprise."
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Gestão de Equipe",
      desc: "Permissões granulares. Delegue o operacional sem expor seus lucros ou dados estratégicos."
    },
    {
      icon: <LineChart className="w-7 h-7" />,
      title: "Previsão de Fluxo",
      desc: "Antecipe o futuro. Saiba hoje se vai faltar dinheiro daqui a 3 meses com inteligência preditiva."
    },
    {
      icon: <Calculator className="w-7 h-7" />,
      title: "Precificação Real",
      desc: "Margem real automática. Pare de chutar preços e comece a faturar com lucro real em cada serviço."
    },
    {
      icon: <FileBarChart className="w-7 h-7" />,
      title: "DRE Automático",
      desc: "Informação limpa em um clique. Gere relatórios de saúde financeira instantaneamente para decisões rápidas."
    },
    {
      icon: <Fingerprint className="w-7 h-7" />,
      title: "Registro de Auditoria",
      desc: "Audit logs completos. Rastreie cada alteração feita no sistema com registro de autoria e horário."
    }
  ];

  return (
    <section className="py-20 md:py-32 px-4 bg-white" id="beneficios">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
          <h2 className="text-blue-600 font-bold text-xs md:text-sm uppercase tracking-[0.3em] mb-4">Poder de Gestão</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            Tecnologia <span className="text-blue-600">Enterprise</span> Blindada para o seu Negócio.
          </h3>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal">
            Conheça os recursos que vão revolucionar sua gestão e trazer a paz financeira definitiva.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className="group p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                {benefit.icon}
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">{benefit.title}</h4>
              <p className="text-slate-500 leading-relaxed text-base font-normal">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner Padronizado */}
        <div className="mt-24 md:mt-32 bg-blue-600 rounded-[3rem] p-8 md:p-20 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-400/20 blur-[120px]"></div>
          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <h3 className="text-3xl md:text-5xl font-bold mb-8 leading-tight tracking-tight">
                Pronto para assumir o controle real do seu negócio?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                {[
                  'DRE em tempo real', 
                  'Gestão de Inadimplência', 
                  'Conciliação Bancária', 
                  'Suporte Prioritário'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 font-semibold text-blue-50">
                    <CheckCircle2 className="w-6 h-6 text-yellow-400" />
                    {item}
                  </div>
                ))}
              </div>
              <a 
                href="#precos" 
                className="inline-flex items-center justify-center bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-xl hover:bg-blue-50 active:scale-95"
              >
                VER PLANOS AGORA
              </a>
            </div>
            <div className="hidden lg:block relative">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" 
                className="rounded-3xl border-4 border-blue-400 shadow-2xl" 
                alt="FinControl Software Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
