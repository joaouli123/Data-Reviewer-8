
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
      question: "1. O plano vitalício é vitalício mesmo?",
      answer: "Sim. Ao adquirir hoje, você garante que nunca mais será cobrado mensalmente. Esta é uma oferta estratégica de lançamento para capitalizar o desenvolvimento do software. Uma vez comprado, você é dono da licença para sempre."
    },
    {
      question: "2. Preciso instalar algum programa?",
      answer: "Não. O software da HUA Consultoria é 100% online (SaaS). Você acessa pelo navegador de qualquer dispositivo, garantindo que suas finanças estejam na palma da mão em qualquer lugar do mundo."
    },
    {
      question: "3. Meus dados financeiros estão realmente seguros?",
      answer: "Utilizamos a mesma infraestrutura de segurança das maiores fintechs mundiais. Além disso, nosso sistema de Audit Logs registra quem fez cada alteração, garantindo total transparência e segurança para o dono do negócio."
    },
    {
      question: "4. Como funciona o suporte após a compra?",
      answer: "No plano mensal, o suporte é via ticket com resposta em 24h. No plano Vitalício, você recebe acesso ao nosso canal exclusivo no WhatsApp, com atendimento prioritário e consultores especializados em gestão."
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
