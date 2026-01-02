
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
        className="w-full py-7 flex items-center justify-between text-left group"
      >
        <span className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight pr-8">
          {question}
        </span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'}`}>
          {isOpen ? <Minus className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-[500px] opacity-100 pb-8' : 'max-h-0 opacity-0'}`}>
        <p className="text-lg text-slate-600 leading-relaxed font-normal">
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
    <section className="py-20 md:py-32 px-4 bg-slate-50" id="faq">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-blue-600 font-bold text-xs md:text-sm uppercase tracking-[0.3em] mb-4">FAQ</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">Dúvidas Frequentes</h3>
        </div>
        <div className="bg-white rounded-[3rem] p-8 md:p-16 border border-slate-200 shadow-2xl">
          {faqs.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
