import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadMercadoPago } from "@mercadopago/sdk-js";
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

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, company, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [identificationTypes, setIdentificationTypes] = useState([]);
  const [mp, setMp] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    payerFirstName: '',
    payerLastName: '',
    email: user?.email || '',
    identificationType: 'CPF',
    identificationNumber: '',
    zipCode: '',
    streetName: '',
    streetNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  useEffect(() => {
    const initMP = async () => {
      if (publicKey) {
        await loadMercadoPago();
        const instance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        setMp(instance);
        
        try {
          const types = await instance.getIdentificationTypes();
          setIdentificationTypes(types);
        } catch (e) {
          console.error("Error fetching identification types", e);
        }
      }
    };
    initMP();
  }, []);

  useEffect(() => {
    if (!authLoading && !company && !user) {
      setLocation('/signup');
    }
  }, [authLoading, company, user, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    setSelectedPlan(plan && PLANS[plan] ? plan : 'pro');
    setLoading(false);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!mp) return;

    try {
      setIsProcessing(true);
      toast.loading('Processando pagamento...');

      let payload = {
        companyId: company?.id,
        plan: selectedPlan,
        email: formData.email,
        total_amount: PLANS[selectedPlan].price.toFixed(2),
        payment_method_id: paymentMethod,
        payer: {
          email: formData.email,
          first_name: formData.payerFirstName,
          last_name: formData.payerLastName,
          identification: {
            type: formData.identificationType,
            number: formData.identificationNumber
          },
          address: {
            zip_code: formData.zipCode,
            street_name: formData.streetName,
            street_number: formData.streetNumber,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state
          }
        }
      };

      if (paymentMethod === 'credit_card') {
        try {
          // Tokenization logic for Mercado Pago v2
          const cardToken = await mp.createCardToken({
            cardNumber: formData.cardNumber,
            cardholderName: formData.payerFirstName + ' ' + formData.payerLastName,
            cardExpirationMonth: formData.expiryMonth,
            cardExpirationYear: formData.expiryYear,
            securityCode: formData.cvv,
            identificationType: formData.identificationType,
            identificationNumber: formData.identificationNumber
          });
          payload.token = cardToken.id;
          payload.payment_method_id = 'master'; // Should ideally be dynamic
        } catch (tokenErr) {
          console.error("Tokenization error", tokenErr);
          toast.error("Erro ao processar dados do cartão");
          setIsProcessing(false);
          return;
        }
      }

      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      toast.dismiss();

      if (response.ok) {
        if (result.status === 'approved') {
          toast.success('Assinatura ativada!');
          setLocation(`/payment-success?payment_id=${result.id}`);
        } else {
          toast.info('Pagamento pendente ou em processamento.');
          // Logic for Pix/Boleto display would go here
        }
      } else {
        toast.error(result.message || 'Erro no processamento');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Falha na comunicação com o servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !selectedPlan) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <header className="border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Ambiente Seguro</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Dados do Pagamento</h2>
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome</label>
                  <input name="payerFirstName" value={formData.payerFirstName} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Sobrenome</label>
                  <input name="payerLastName" value={formData.payerLastName} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo Doc.</label>
                  <select name="identificationType" value={formData.identificationType} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                    {identificationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Número Doc.</label>
                  <input name="identificationNumber" value={formData.identificationNumber} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-bold mb-3 uppercase text-slate-500">Endereço</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-1">
                    <label className="text-sm font-medium">CEP</label>
                    <input name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium">Cidade</label>
                    <input name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border rounded-md" required />
                  </div>
                </div>
              </div>

              {paymentMethod === 'credit_card' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold uppercase text-slate-500">Dados do Cartão</h3>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Número do Cartão</label>
                    <input name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Mês (MM)</label>
                      <input name="expiryMonth" value={formData.expiryMonth} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="MM" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ano (YY)</label>
                      <input name="expiryYear" value={formData.expiryYear} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="YYYY" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CVV</label>
                      <input name="cvv" value={formData.cvv} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="123" />
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-[#2563eb] h-12 text-lg font-bold mt-6" disabled={isProcessing}>
                {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(plan.price)}`}
              </Button>
            </form>
          </Card>

          <Card className="p-6 bg-slate-50 h-fit">
            <h2 className="text-xl font-bold mb-4">Resumo</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{plan.name}</span>
                <span className="font-bold">{formatCurrency(plan.price)}</span>
              </div>
              <p className="text-sm text-slate-500">{plan.description}</p>
              <ul className="space-y-2">
                {plan.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
