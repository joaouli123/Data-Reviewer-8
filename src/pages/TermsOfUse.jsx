
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl prose dark:prose-invert">
          <h1 className="text-4xl font-black text-slate-900 mb-8">Termos de Uso</h1>
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p>Bem-vindo à HUA Control. Ao acessar e usar este sistema, você concorda com os seguintes termos e condições.</p>
            
            <h2 className="text-2xl font-bold text-slate-800 mt-10">1. Aceitação dos Termos</h2>
            <p>Ao utilizar nossos serviços, você confirma que leu, compreendeu e aceita estar vinculado por estes termos. Se você não concordar com qualquer parte destes termos, não deverá utilizar o sistema.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">2. Uso da Licença</h2>
            <p>Concedemos a você uma licença pessoal, não exclusiva e intransferível para usar o software conforme o plano adquirido. O uso indevido, engenharia reversa ou tentativa de copiar o código fonte é estritamente proibido.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">3. Responsabilidades do Usuário</h2>
            <p>Você é responsável por manter a confidencialidade de sua senha e conta, bem como por todas as atividades que ocorram sob sua conta. A precisão dos dados financeiros inseridos é de sua inteira responsabilidade.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">4. Pagamentos e Reembolsos</h2>
            <p>O plano vitalício garante acesso permanente às funcionalidades atuais e atualizações futuras do sistema. Reembolsos podem ser solicitados dentro do prazo legal de 7 dias após a compra.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">5. Limitação de Responsabilidade</h2>
            <p>A HUA Control fornece ferramentas de auxílio à gestão, mas não se responsabiliza por decisões de negócio tomadas com base nas informações do sistema ou por eventuais perdas financeiras.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
