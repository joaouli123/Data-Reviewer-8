
import React from 'react';
<<<<<<< HEAD
import { LayoutGrid, Clock, EyeOff } from 'lucide-react';
=======
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

const PainPoints: React.FC = () => {
  const pains = [
    {
<<<<<<< HEAD
      icon: <LayoutGrid className="w-10 h-10 text-red-500" />,
      title: "Informações descentralizadas",
      desc: "Dados espalhados dificultam a visão real do negócio e atrasam relatórios essenciais para o crescimento."
    },
    {
      icon: <Clock className="w-10 h-10 text-red-500" />,
      title: "Relatórios demorados",
      desc: "Perda de tempo precioso consolidando planilhas manuais que já nascem desatualizadas e sujeitas a erros."
    },
    {
      icon: <EyeOff className="w-10 h-10 text-red-500" />,
      title: "Falta de visão do futuro do caixa",
      desc: "Dificuldade em antecipar riscos e projetar o caixa, gerando insegurança na hora de tomar decisões importantes."
=======
      icon: "❌",
      title: "Cegueira Financeira",
      desc: "Você vende, mas não vê a cor do dinheiro? O lucro parece sumir no meio de taxas ocultas e má gestão de custos."
    },
    {
      icon: "❌",
      title: "Medo de Delegar",
      desc: "Você centraliza tudo porque tem medo que funcionários vejam o lucro real ou dados estratégicos da sua empresa?"
    },
    {
      icon: "❌",
      title: "Dados Vulneráveis",
      desc: "O que acontece se seu computador queimar hoje? Suas planilhas locais são bombas-relógio para o seu histórico."
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-100" id="solucao">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
<<<<<<< HEAD
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight px-4 tracking-tight uppercase">
            O DESAFIO DAS EMPRESAS EM <span className="text-blue-600 underline underline-offset-8">CRESCIMENTO</span>
          </h2>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
            À medida que o negócio cresce, o financeiro se torna mais complexo. O impacto é direto na estratégia, no crescimento e na segurança da empresa.
=======
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight px-4 tracking-tight">
            Sua empresa cresceu, mas seu <span className="text-blue-600 underline underline-offset-8">controle financeiro</span> parou no tempo?
          </h2>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
            Se você ainda depende de planilhas que travam ou sistemas que cobram por usuário, <span className="text-red-600 font-bold">você está sangrando dinheiro.</span>
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {pains.map((pain, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1">
<<<<<<< HEAD
              <div className="mb-6 group-hover:scale-110 transition-transform inline-block">
=======
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform inline-block">
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
                {pain.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{pain.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-normal">{pain.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
