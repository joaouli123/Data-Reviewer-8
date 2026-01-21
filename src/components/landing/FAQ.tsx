
import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight pr-8">
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'}`}>
          {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-[500px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-base text-slate-600 leading-relaxed font-normal">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "O que é o HUACONTROL?",
      answer: "O HUACONTROL é um ERP financeiro completo com inteligência artificial, criado para dar controle, previsibilidade e apoio estratégico às decisões financeiras da empresa."
    },
    {
      question: "Por que o HUACONTROL é diferente dos demais ERPs do mercado?",
      answer: "Enquanto ERPs tradicionais focam apenas em registro e operação, o HUACONTROL vai além. Ele atua como plataforma de inteligência financeira, usando IA para analisar dados, antecipar riscos e apoiar decisões, entregando visão clara do presente e do futuro do caixa."
    },
    {
      question: "Para que tipo de empresa o HUACONTROL é indicado?",
      answer: "Para empresas em crescimento, empresários, CFOs e diretores financeiros que precisam profissionalizar a gestão e tomar decisões baseadas em dados confiáveis."
    },
    {
      question: "Como a inteligência artificial é utilizada na prática?",
      answer: "A IA analisa continuamente fluxo de caixa, DRE, capital de giro e endividamento, gerando insights, alertas e análises objetivas para apoiar decisões estratégicas."
    },
    {
      question: "O HUACONTROL substitui a equipe financeira ou o contador?",
      answer: "Não. O HUACONTROL apoia pessoas, não substitui. Ele organiza e interpreta os dados para que gestores e equipes atuem de forma mais estratégica."
    },
    {
      question: "O sistema é seguro?",
      answer: "Sim. O HUACONTROL foi desenvolvido para ambiente corporativo, com controle de acessos e foco em segurança e confiabilidade das informações financeiras."
    },
    {
      question: "Quanto tempo leva para começar a usar?",
      answer: "A implantação é simples e orientada. Em pouco tempo, a empresa já tem dados organizados, visão gerencial e análises financeiras disponíveis."
    },
    {
      question: "Como contratar ou conhecer o HUACONTROL?",
      answer: "Você pode solicitar uma apresentação do sistema, onde mostramos na prática como o HUACONTROL entrega controle e decisões inteligentes. 👉 Solicite uma apresentação do HUACONTROL."
    }
  ];

  return (
    <section className="py-16 md:py-24 px-4 bg-slate-50" id="faq">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mb-3">FAQ</h2>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">Dúvidas Frequentes</h3>
        </div>
        <div className="bg-white rounded-[2rem] p-6 md:p-12 border border-slate-200 shadow-xl">
          {faqs.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
