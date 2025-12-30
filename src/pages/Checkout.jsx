import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock } from 'lucide-react';
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
          body: JSON.stringify({
            ...cardFormData,
            metadata: {
              plan: selectedPlan,
              companyName: formData.companyName,
              email: formData.email
            }
          }),
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E7AA1C] rounded-md flex items-center justify-center font-bold text-black">H</div>
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
          className="flex items-center gap-2 text-slate-500 hover:text-[#E7AA1C] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          <span>Voltar para Planos</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-slate-200 p-6 sticky top-24 shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-slate-900">Resumo do Pedido</h2>
              
              <div className="bg-[#E7AA1C]/5 rounded-xl p-6 mb-6 border border-[#E7AA1C]/20">
                <p className="text-[#E7AA1C] text-xs font-bold uppercase tracking-wider mb-2">Plano Selecionado</p>
                <h3 className="text-2xl font-bold mb-1 text-slate-900">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
                
                {!plan.contact && (
                  <div className="pt-4 border-t border-[#E7AA1C]/10">
                    <p className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-500">/mês</span></p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/#pricing')} 
                  className="w-full mt-6 border-[#E7AA1C]/30 text-[#E7AA1C] hover:bg-[#E7AA1C] hover:text-white transition-all"
                >
                  Alterar Plano
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">O que está incluso:</p>
                <div className="space-y-3">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="mt-1 bg-green-100 p-0.5 rounded-full">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
                <Lock className="w-4 h-4" />
                <span>Pagamento processado com segurança criptografada</span>
              </div>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-slate-200 p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Checkout Seguro</h2>
                <p className="text-slate-500">Insira os dados do cartão para finalizar sua assinatura.</p>
              </div>

              {plan.contact ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <h3 className="text-xl font-bold mb-4 text-slate-900">Plano Sob Medida</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8">
                    Nossa equipe de especialistas entrará em contato para entender seu volume de transações e oferecer a melhor condição.
                  </p>
                  <Button 
                    onClick={() => window.location.href = 'mailto:vendas@hua.com'}
                    className="bg-[#E7AA1C] hover:bg-[#E7AA1C]/90 text-white font-bold h-12 px-8"
                  >
                    Falar com Especialista
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Informações do Cartão</h3>
                      <div className="flex gap-2">
                        <div className="w-8 h-5 bg-slate-200 rounded-sm"></div>
                        <div className="w-8 h-5 bg-slate-200 rounded-sm"></div>
                        <div className="w-8 h-5 bg-slate-200 rounded-sm"></div>
                      </div>
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
                              baseColor: '#E7AA1C',
                              buttonTextColor: '#ffffff',
                              textPrimaryColor: '#0f172a',
                              textSecondaryColor: '#64748b',
                              inputBorderWidth: '1px',
                              borderRadiusLarge: '8px'
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
                      Ao finalizar a compra, você concorda com nossos <a href="#" className="underline hover:text-slate-600">Termos de Uso</a> e <a href="#" className="underline hover:text-slate-600">Política de Privacidade</a>.
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
