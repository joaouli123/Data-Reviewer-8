import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

const PLANS = {
  basic: {
    name: 'Basic',
    price: 99,
    currency: 'BRL',
    description: 'Perfeito para pequenas empresas',
    features: ['Até 100 clientes', 'Gestão básica de vendas', 'Relatórios simples', 'Suporte por email', '5GB de armazenamento']
  },
  pro: {
    name: 'Pro',
    price: 299,
    currency: 'BRL',
    description: 'Para empresas em crescimento',
    features: ['Até 500 clientes', 'Gestão avançada com IA', 'Relatórios inteligentes', 'Suporte prioritário', '100GB de armazenamento', 'Múltiplos usuários', 'Integração com banco']
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    currency: 'BRL',
    description: 'Para grandes corporações',
    features: ['Clientes ilimitados', 'Customizável 100%', 'Analytics avançado', 'Suporte 24/7', 'Armazenamento ilimitado', 'Usuários ilimitados', 'APIs personalizadas', 'SLA garantido'],
    contact: true
  }
};

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
if (publicKey) {
  initMercadoPago(publicKey, { locale: 'pt-BR' });
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan && PLANS[plan]) {
      setSelectedPlan(plan);
    } else {
      setSelectedPlan('pro');
    }

    const email = params.get('email');
    const company = params.get('company');
    if (email) setFormData(prev => ({ ...prev, email }));
    if (company) setFormData(prev => ({ ...prev, companyName: company }));
    setLoading(false);
  }, []);

  const initialization = {
    amount: selectedPlan ? PLANS[selectedPlan].price : 100,
    payer: {
      email: formData.email || 'customer@example.com',
    }
  };

  const onSubmit = async (cardFormData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/payment/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardFormData), // Sending the exact body structure expected by the backend and MP SDK
        });

        const result = await response.json();
        if (response.ok && (result.status === 'approved' || result.id)) {
          setLocation(`/payment-success?payment_id=${result.id || result.data?.id}`);
          resolve();
        } else {
          const errorMsg = result.error || 'Erro ao processar pagamento';
          toast.error(errorMsg);
          reject(errorMsg);
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast.error('Erro ao processar pagamento');
        reject(error);
      }
    });
  };

  const onError = async (error) => {
    console.error('Card Payment Brick Error:', error);
  };

  const onReady = async () => {
    console.log('Card Payment Brick Ready');
  };

  if (loading || !selectedPlan) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563eb] rounded-md flex items-center justify-center font-bold text-white">H</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">HUA Analytics</h1>
          </div>
          <Button variant="ghost" onClick={() => setLocation('/')} className="hover:bg-slate-100 text-slate-600">
            Cancelar
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <button 
          onClick={() => setLocation('/')} 
          className="flex items-center gap-2 text-slate-500 hover:text-[#2563eb] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          <span>Voltar para Planos</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-slate-200 sticky top-24 shadow-sm rounded-xl overflow-hidden">
              {/* Mobile Header - Always Visible */}
              <div 
                className="lg:hidden p-4 flex items-center justify-between bg-white border-b border-slate-100 cursor-pointer"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#2563eb]/10 p-2 rounded-lg">
                    <span className="font-bold text-[#2563eb] text-sm">{plan.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(plan.price)}/mês
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Collapsible Content */}
              <div className={`${!isSummaryExpanded ? 'hidden lg:block' : 'block'} p-6`}>
                <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4 hidden lg:block">Resumo do Pedido</h2>
                
                <div className="bg-[#2563eb]/5 rounded-xl p-6 mb-6 border border-[#2563eb]/10">
                  <p className="text-[#2563eb] text-xs font-bold uppercase tracking-wider mb-2">Plano Selecionado</p>
                  <h3 className="text-2xl font-bold mb-1 text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
                  
                  {!plan.contact && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-500">/mês</span></p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/#pricing')} 
                    className="w-full mt-6 border-[#2563eb]/30 text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all rounded-lg"
                  >
                    Alterar Plano
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700">O que está incluso:</p>
                  <div className="space-y-3">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <div className="mt-1 bg-blue-50 p-0.5 rounded-full">
                          <Check className="w-3 h-3 text-[#2563eb]" />
                        </div>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
                  <Lock className="w-4 h-4" />
                  <span>Pagamento processado com segurança via Mercado Pago</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-slate-200 p-8 shadow-sm rounded-xl">
              <div className="mb-8 border-b pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Pagamento Seguro</h2>
                <p className="text-slate-500">Insira os dados do seu cartão para ativar sua assinatura agora mesmo.</p>
              </div>

              {plan.contact ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <h3 className="text-xl font-bold mb-4 text-slate-900">Plano Sob Medida</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8">
                    Nossa equipe de especialistas entrará em contato para oferecer a melhor condição para sua empresa.
                  </p>
                  <Button 
                    onClick={() => window.location.href = 'mailto:vendas@hua.com'}
                    className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-bold h-12 px-8 rounded-lg"
                  >
                    Falar com Especialista
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-[#2563eb] rounded-full"></span>
                        Dados do Cartão
                      </h3>
                    </div>
                    
                    <CardPayment
                      initialization={initialization}
                      onSubmit={onSubmit}
                      onReady={onReady}
                      onError={onError}
                      customization={{
                        visual: {
                          style: {
                            theme: 'default',
                            customVariables: {
                              formBackgroundColor: 'transparent',
                              inputBackgroundColor: '#ffffff',
                              baseColor: '#2563eb', // Primary Blue
                              buttonTextColor: '#ffffff',
                              textPrimaryColor: '#0f172a',
                              textSecondaryColor: '#64748b',
                              inputBorderWidth: '1px',
                              borderRadiusLarge: '8px',
                              fontSizeLarge: '16px',
                              inputBorderColor: '#e2e8f0',
                              inputFocusedBorderColor: '#2563eb'
                            }
                          }
                        },
                        paymentMethods: {
                          maxInstallments: 1
                        }
                      }}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Ao finalizar, você aceita nossos <a href="#" className="underline text-[#2563eb] hover:text-[#2563eb]/80">Termos</a> e <a href="#" className="underline text-[#2563eb] hover:text-[#2563eb]/80">Privacidade</a>.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
