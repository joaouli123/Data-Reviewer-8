import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, Zap, Shield, Headphones, CreditCard, Wallet2, Barcode } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

const PLANS = {
  monthly: {
    name: 'Mensal',
    price: 215,
    currency: 'BRL',
    description: 'Acesso completo ao sistema',
    features: ['Acesso completo ao sistema', 'Usuários ativos', 'Controle de Fluxo de Caixa', 'Suporte via E-mail'],
    badge: 'Completo',
    isPopular: true
  }
};

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

// Card brands SVG logos
const CardBrands = {
  visa: (
    <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text x="24" y="20" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">VISA</text>
    </svg>
  ),
  mastercard: (
    <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#FF5F00" />
      <circle cx="18" cy="16" r="8" fill="#EB001B" />
      <circle cx="30" cy="16" r="8" fill="#F79E1B" />
    </svg>
  ),
  elo: (
    <svg className="w-8 h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#111111" />
      <text x="24" y="20" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">ELO</text>
    </svg>
  )
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, company, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [mp, setMp] = useState(null);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: user?.name || '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [cardErrors, setCardErrors] = useState({});

  useEffect(() => {
    const initMP = async () => {
      if (publicKey && window.MercadoPago) {
        const instance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        setMp(instance);
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
    setSelectedPlan(plan && PLANS[plan] ? plan : 'monthly');
    setPaymentMethod('boleto');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      setCardData(prev => ({
        ...prev,
        cardholderName: user.name || ''
      }));
    }
  }, [user]);

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'cardNumber') {
      processedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    } else if (name === 'expiryMonth') {
      // Remove non-digits
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 2) {
        processedValue = digits;
      } else {
        processedValue = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
      }
    } else if (name === 'cvv') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    
    setCardData(prev => ({ ...prev, [name]: processedValue }));
    if (cardErrors[name]) {
      setCardErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateCardData = () => {
    const errors = {};
    const cleanNumber = cardData.cardNumber.replace(/\s/g, '');
    if (!cleanNumber || cleanNumber.length < 13) errors.cardNumber = 'Cartão inválido';
    if (!cardData.cardholderName) errors.cardholderName = 'Nome obrigatório';
    
    const expiry = cardData.expiryMonth;
    if (!expiry || !expiry.includes('/') || expiry.length < 5) {
      errors.expiry = 'Data obrigatória';
    } else {
      const [month, year] = expiry.split('/');
      const m = parseInt(month);
      const y = parseInt(year);
      if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
        errors.expiry = 'Data inválida';
      }
    }

    if (!cardData.cvv || cardData.cvv.length < 3) errors.cvv = 'CVV inválido';
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log("handlePayment triggered", { paymentMethod, selectedPlan });

    if (!paymentMethod) {
      toast.error('Por favor, selecione uma forma de pagamento');
      return;
    }

    if (!mp && paymentMethod === 'credit_card') return;

    try {
      setIsProcessing(true);
      toast.loading('Processando pagamento com segurança...');

      let payload = {
        companyId: company?.id,
        plan: selectedPlan,
        email: user?.email,
        total_amount: PLANS[selectedPlan].price.toFixed(2),
        payment_method_id: 'bolbradesco',
        recurring: true,
        payer: {
          email: user?.email,
          first_name: user?.name?.split(' ')[0] || '',
          last_name: user?.name?.split(' ').slice(1).join(' ') || 'Admin',
          identification: {
            type: company?.document?.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF',
            number: company?.document?.replace(/\D/g, '') || ''
          },
          address: {
            zip_code: user?.cep?.replace(/\D/g, '') || '',
            street_name: user?.rua || '',
            street_number: user?.numero || '',
            neighborhood: user?.bairro || user?.complemento || '',
            city: user?.cidade || '',
            federal_unit: user?.estado || ''
          }
        }
      };

      if (paymentMethod === 'credit_card') {
        const [month, year] = cardData.expiryMonth.split('/');
        try {
          const cardToken = await mp.createCardToken({
            cardNumber: cardData.cardNumber.replace(/\s/g, ''),
            cardholderName: cardData.cardholderName,
            cardExpirationMonth: month,
            cardExpirationYear: year.length === 2 ? `20${year}` : year,
            securityCode: cardData.cvv
          });
          payload.token = cardToken.id;
          payload.payment_method_id = 'master';
        } catch (tokenErr) {
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
          // ... existing logic for approved ...
        } else if (result.ticket_url) {
          toast.success('Boleto gerado com sucesso!');
          // Redirect to a page that shows the ticket or open it directly
          window.open(result.ticket_url, '_blank');
          setLocation(`/payment-success?payment_id=${result.paymentId || result.id}&ticket_url=${encodeURIComponent(result.ticket_url)}`);
        } else {
          toast.success('Instruções de pagamento foram enviadas para seu email!');
          setLocation(`/payment-success?payment_id=${result.paymentId || result.id}`);
        }
      } else {
        const missing = Array.isArray(result.missingFields) ? ` Campos faltando: ${result.missingFields.join(', ')}` : '';
        const details = result.details || result.error || result.message || 'Erro no processamento';
        console.error('Erro pagamento:', result);
        toast.error(`${details}${missing}`);
      }
    } catch (error) {
      toast.error('Falha na comunicação com o servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !selectedPlan) return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Carregando...</div></div>;
  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'} 
            className="gap-2 text-slate-600 hover:text-slate-900"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium">Pagamento Seguro</span>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 border border-slate-200">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Escolha a forma de pagamento</h2>
                  <p className="text-slate-500">Clique para expandir</p>
                </div>

                {/* Payment Method Selection - Only Boleto */}
                <form onSubmit={handlePayment} className="space-y-3">
                  {[
                    { id: 'boleto', label: 'Boleto', desc: 'Prazo de 3 dias', icon: Barcode }
                  ].map(({ id, label, desc, icon: Icon }) => (
                    <div key={id} className={`border rounded-lg overflow-hidden transition-all ${
                      id === 'boleto' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                    }`}>
                      {/* Tab Header */}
                      <div
                        onClick={() => setPaymentMethod(id)}
                        className={`w-full flex items-start gap-4 p-4 cursor-pointer transition-all ${
                          paymentMethod === id
                            ? 'bg-blue-50'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                        data-testid={`button-payment-method-${id}`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={id}
                          checked={paymentMethod === id}
                          onChange={() => setPaymentMethod(id)}
                          className="w-5 h-5 mt-1 cursor-pointer"
                        />
                        <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${paymentMethod === id ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${paymentMethod === id ? 'text-blue-900' : 'text-slate-900'}`}>{label}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                      </div>

                      {/* Tab Content - Boleto */}
                      {paymentMethod === id && id === 'boleto' && (
                        <div className="border-t border-slate-200 p-6 bg-white space-y-5">
                          <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200 text-center">
                            <Barcode className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-slate-900">Boleto Bancário</p>
                            <p className="text-slate-600 mt-2">Você receberá o código para pagar em seu banco</p>
                          </div>

                          {/* Submit Button for Boleto */}
                          <Button
                            type="button"
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-base font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            data-testid="button-complete-payment"
                          >
                            <Lock className="w-4 h-4" />
                            {isProcessing ? 'Processando...' : `Gerar Boleto ${formatCurrency(plan.price)}/mês`}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </form>

                {/* Privacy Info */}
                  <p className="text-center text-xs text-slate-500">
                  Ao prosseguir, você concorda com nossos <a href="/terms" className="text-slate-600 hover:text-blue-600 underline">Termos de Uso</a> e <a href="/privacy" className="text-slate-600 hover:text-blue-600 underline">Política de Privacidade</a>
                </p>
              </div>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            {/* Mobile Compact Summary */}
            <Card className="lg:hidden p-4 mb-8 border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Plano selecionado</p>
                  <p className="text-lg font-bold text-slate-900">{plan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(plan.price)}</p>
                  <p className="text-xs text-slate-500">/mês</p>
                </div>
              </div>
            </Card>

            {/* Desktop Full Summary */}
            <Card className={`hidden lg:block p-6 sticky top-24 border ${plan.isPopular ? 'border-blue-300' : 'border-slate-200'} bg-white`}>
              {plan.isPopular && (
                <div className="mb-4 inline-block">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-600 text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                {plan.contact ? (
                  <p className="text-slate-600">Entre em contato para cotação</p>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                      <span className="text-slate-600">{selectedPlan === 'pro' ? ' (Pagamento Único)' : '/mês'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">✓ {selectedPlan === 'pro' ? 'Pagamento único sem renovação' : 'Cobrança recorrente automática'}</p>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase">Incluso no plano</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Trust Badges */}
              <div className="space-y-3 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Pagamento Seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Headphones className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Suporte Rápido</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Ativação Imediata</span>
                </div>
              </div>

              {/* Guarantee */}
              {!plan.contact && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-xs text-green-900 font-semibold">
                    Garantia de 7 dias<br />ou seu dinheiro de volta
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
