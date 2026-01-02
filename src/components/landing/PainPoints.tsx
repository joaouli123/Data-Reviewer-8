
import React from 'react';

const PainPoints: React.FC = () => {
  const pains = [
    {
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
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-slate-50 border-y border-slate-100" id="solucao">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight px-4 tracking-tight">
            Sua empresa cresceu, mas seu <span className="text-blue-600 underline underline-offset-8">controle financeiro</span> parou no tempo?
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-normal">
            Se você ainda depende de planilhas que travam ou sistemas que cobram por usuário, <span className="text-red-600 font-bold">você está sangrando dinheiro.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {pains.map((pain, idx) => (
            <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-2">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform inline-block">
                {pain.icon}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{pain.title}</h3>
              <p className="text-slate-600 leading-relaxed text-base font-normal">{pain.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
