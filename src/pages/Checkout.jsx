import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, company } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dados do usuário autenticado ou da URL
  const companyName = company?.name || '';
  const email = user?.email || '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan && PLANS[plan]) {
      setSelectedPlan(plan);
    } else {
      setSelectedPlan('pro');
    }
    setLoading(false);
  }, []);

  const initialization = {
    amount: selectedPlan ? PLANS[selectedPlan].price : 100,
    currency: 'BRL',
    payer: {
      email: email || 'customer@example.com',
      address: {
        zipCode: '00000000'
      }
    },
    processingMode: 'aggregator'
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
    <div className="min-h-screen bg-white lg:bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header - Minimalist and Secure */}
      <header className="border-b border-slate-100 bg-white lg:border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Ambiente Seguro</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-0 lg:px-4 py-0 lg:py-12">
        <div className="hidden lg:block px-4">
          <button 
            onClick={() => setLocation('/')} 
            className="flex items-center gap-2 text-slate-500 hover:text-[#2563eb] mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            <span>Voltar para Planos</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 lg:gap-8 items-start">
          {/* Order Summary - Fixed/Sticky on mobile? No, let's keep it top but cleaner */}
          <div className="lg:col-span-1 order-1 lg:order-1">
            <Card className="bg-[#F8FAFC] lg:bg-white border-0 lg:border-slate-200 lg:sticky top-24 shadow-none lg:shadow-sm rounded-none lg:rounded-xl overflow-hidden z-40">
              {/* Mobile Header - High Conversion Style */}
              <div 
                className="lg:hidden p-4 flex items-center justify-between bg-slate-50 border-b border-slate-200 cursor-pointer shadow-sm"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#2563eb] px-2 py-1 rounded text-[10px] font-bold text-white uppercase">
                    {plan.name}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Total: {formatCurrency(plan.price)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#2563eb] text-xs font-semibold">
                  <span>{isSummaryExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
                  {isSummaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </div>

              {/* Collapsible Content */}
              <div className={`${!isSummaryExpanded ? 'hidden lg:block' : 'block animate-in fade-in slide-in-from-top-2 duration-200'} p-6`}>
                <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4 hidden lg:block">Resumo do Pedido</h2>
                
                <div className="bg-white lg:bg-[#2563eb]/5 rounded-xl p-6 mb-6 border border-slate-200 lg:border-[#2563eb]/10 shadow-sm lg:shadow-none">
                  <p className="text-[#2563eb] text-xs font-bold uppercase tracking-wider mb-2">Plano Selecionado</p>
                  <h3 className="text-2xl font-bold mb-1 text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
                  
                  {!plan.contact && (
                    <div className="pt-4 border-t border-slate-100 lg:border-slate-200">
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-500">/mês</span></p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/#pricing')} 
                    className="w-full mt-6 border-slate-300 lg:border-[#2563eb]/30 text-slate-600 lg:text-[#2563eb] hover:bg-slate-50 lg:hover:bg-[#2563eb] lg:hover:text-white transition-all rounded-lg"
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
                  <span>Pagamento 100% seguro</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Checkout Form - Priority on Mobile */}
          <div className="lg:col-span-2 order-2 lg:order-2">
            <Card className="bg-white border-0 lg:border-slate-200 p-6 lg:p-8 shadow-none lg:shadow-sm rounded-none lg:rounded-xl">
              <div className="mb-6 lg:mb-8 lg:border-b lg:pb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">Finalizar Assinatura</h2>
                <p className="text-sm lg:text-base text-slate-500">Ative sua conta em menos de 1 minuto.</p>
              </div>

              {plan.contact ? (
                <div className="text-center py-12 lg:py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <h3 className="text-lg lg:text-xl font-bold mb-4 text-slate-900 px-4">Plano Sob Medida</h3>
                  <p className="text-sm lg:text-base text-slate-500 max-w-sm mx-auto mb-8 px-6">
                    Nossa equipe de especialistas entrará em contato para oferecer a melhor condição para sua empresa.
                  </p>
                  <Button 
                    onClick={() => window.location.href = 'mailto:vendas@hua.com'}
                    className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-bold h-11 lg:h-12 px-6 lg:px-8 rounded-lg"
                  >
                    Falar com Especialista
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  <div className="p-2 lg:p-3 bg-slate-50 lg:bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm lg:shadow-inner">
                    <Payment
                      initialization={initialization}
                      onSubmit={onSubmit}
                      onReady={onReady}
                      onError={onError}
                      customization={{
                        visual: {
                          fontFamily: 'system-ui',
                          style: {
                            theme: 'default',
                            customVariables: {
                              formBackgroundColor: 'transparent',
                              inputBackgroundColor: '#ffffff',
                              baseColor: '#2563eb',
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
                          creditCard: 'all',
                          pix: 'all',
                          ticket: 'all'
                        },
                        walletInstallments: false
                      }}
                      preferredPaymentMethod="credit_card"
                    />
                  </div>

                  <div className="text-center px-4 pt-2">
                    <p className="text-[10px] lg:text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Ao finalizar, você aceita nossos <a href="#" className="underline text-[#2563eb]">Termos</a> e <a href="#" className="underline text-[#2563eb]">Privacidade</a>.
                      <br className="lg:hidden" /> O pagamento é processado pelo Mercado Pago.
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
