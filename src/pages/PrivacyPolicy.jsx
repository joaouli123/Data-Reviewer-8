
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl prose dark:prose-invert">
          <h1 className="text-4xl font-black text-slate-900 mb-8">Política de Privacidade</h1>
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p>A sua privacidade é importante para nós. É política da HuaConsultoria respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site.</p>
            
            <h2 className="text-2xl font-bold text-slate-800 mt-10">1. Coleta de Informações</h2>
            <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">2. Uso de Dados</h2>
            <p>Os dados financeiros inseridos no sistema são de propriedade exclusiva do cliente. Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">3. Segurança</h2>
            <p>Protegemos os dados armazenados dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">4. Cookies</h2>
            <p>Utilizamos cookies para melhorar a sua experiência de navegação e entender como você utiliza nossa plataforma.</p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10">5. Retenção de Dados</h2>
            <p>Retemos as informações coletadas apenas pelo tempo necessário para fornecer o serviço solicitado ou conforme exigido por regulamentações financeiras.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
