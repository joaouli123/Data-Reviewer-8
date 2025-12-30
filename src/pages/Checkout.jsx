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
  };

  const onSubmit = async (cardFormData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/payment/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...cardFormData,
            plan: selectedPlan,
            companyName: formData.companyName,
            email: formData.email,
          }),
        });

        const result = await response.json();
        if (response.ok && result.id) {
          setLocation(`/payment-success?payment_id=${result.id}`);
          resolve();
        } else {
          toast.error(result.error || 'Erro ao processar pagamento');
          reject();
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast.error('Erro ao processar pagamento');
        reject();
      }
    });
  };

  const onError = async (error) => {
    console.error('Card Payment Brick Error:', error);
    toast.error('Erro no formulário de pagamento');
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
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">HUA Analytics</h1>
          <Button variant="outline" onClick={() => setLocation('/')}>Cancelar</Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Resumo</h2>
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6 border border-slate-600/50">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                {!plan.contact && <p className="text-3xl font-bold text-blue-400">{formatCurrency(plan.price)}</p>}
                <Button variant="outline" onClick={() => setLocation('/#pricing')} className="w-full mt-4">Mudar Plano</Button>
              </div>
              <div className="space-y-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> {f}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700/50 p-8">
              <h2 className="text-2xl font-bold mb-8">Pagamento</h2>
              {plan.contact ? (
                <div className="text-center py-12">
                  <Button onClick={() => window.location.href = 'mailto:vendas@hua.com'}>Contatar Vendas</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Empresa" className="bg-slate-900 border-slate-700" />
                    <Input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="bg-slate-900 border-slate-700" />
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
                        }
                      }
                    }}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
