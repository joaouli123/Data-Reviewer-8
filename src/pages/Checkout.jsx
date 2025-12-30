import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, Loader } from 'lucide-react';
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
    phone: '',
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
      email: formData.email,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading || !selectedPlan) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-[#040303] text-white">
      {/* Header */}
      <header className="border-b border-border/40 bg-[#040303]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E7AA1C] rounded-md flex items-center justify-center font-bold text-black">H</div>
            <h1 className="text-xl font-bold tracking-tight">HUA Analytics</h1>
          </div>
          <Button variant="ghost" onClick={() => setLocation('/')} className="hover:bg-white/10">
            Cancelar
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <button 
          onClick={() => setLocation('/')} 
          className="flex items-center gap-2 text-slate-400 hover:text-[#E7AA1C] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          <span>Voltar para Planos</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/40 border-border/40 p-6 sticky top-24 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 text-slate-200">Resumo do Pedido</h2>
              
              <div className="bg-[#E7AA1C]/10 rounded-xl p-6 mb-6 border border-[#E7AA1C]/20">
                <p className="text-[#E7AA1C] text-xs font-bold uppercase tracking-wider mb-2">Plano Selecionado</p>
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                
                {!plan.contact && (
                  <div className="pt-4 border-t border-[#E7AA1C]/10">
                    <p className="text-3xl font-bold text-white">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-400">/mês</span></p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/#pricing')} 
                  className="w-full mt-6 border-[#E7AA1C]/30 text-[#E7AA1C] hover:bg-[#E7AA1C] hover:text-black transition-all"
                >
                  Alterar Plano
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-300">O que está incluso:</p>
                <div className="space-y-3">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                      <div className="mt-1 bg-green-500/20 p-0.5 rounded-full">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 flex items-center gap-3 text-xs text-slate-500">
                <Lock className="w-4 h-4" />
                <span>Pagamento processado com segurança criptografada</span>
              </div>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/40 border-border/40 p-8 backdrop-blur-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Checkout Seguro</h2>
                <p className="text-slate-400">Preencha as informações abaixo para ativar sua conta.</p>
              </div>

              {plan.contact ? (
                <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-dashed border-border/40">
                  <h3 className="text-xl font-bold mb-4">Plano Sob Medida</h3>
                  <p className="text-slate-400 max-w-sm mx-auto mb-8">
                    Nossa equipe de especialistas entrará em contato para entender seu volume de transações e oferecer a melhor condição.
                  </p>
                  <Button 
                    onClick={() => window.location.href = 'mailto:vendas@hua.com'}
                    className="bg-[#E7AA1C] hover:bg-[#E7AA1C]/90 text-black font-bold h-12 px-8"
                  >
                    Falar com Especialista
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">Nome da Empresa</label>
                      <Input 
                        name="companyName" 
                        value={formData.companyName} 
                        onChange={handleChange} 
                        placeholder="Ex: Minha Empresa LTDA" 
                        className="bg-black/40 border-slate-700 h-11 focus:border-[#E7AA1C] transition-colors" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">E-mail para Cobrança</label>
                      <Input 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        placeholder="email@empresa.com" 
                        className="bg-black/40 border-slate-700 h-11 focus:border-[#E7AA1C] transition-colors" 
                      />
                    </div>
                  </div>
                  
                  <div className="p-6 bg-black/20 rounded-2xl border border-border/40">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-200">Informações do Cartão</h3>
                      <div className="flex gap-2">
                        <div className="w-8 h-5 bg-slate-700 rounded-sm opacity-50"></div>
                        <div className="w-8 h-5 bg-slate-700 rounded-sm opacity-50"></div>
                        <div className="w-8 h-5 bg-slate-700 rounded-sm opacity-50"></div>
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
                            theme: 'dark',
                            customVariables: {
                              formBackgroundColor: 'transparent',
                              inputBackgroundColor: '#00000040',
                              baseColor: '#E7AA1C',
                              buttonTextColor: '#000000',
                              textPrimaryColor: '#ffffff',
                              textSecondaryColor: '#94a3b8',
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
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Ao finalizar a compra, você concorda com nossos <a href="#" className="underline hover:text-slate-300">Termos de Uso</a> e <a href="#" className="underline hover:text-slate-300">Política de Privacidade</a>.
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
