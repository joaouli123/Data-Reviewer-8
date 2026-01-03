import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, Zap, Shield, Headphones, CreditCard, Wallet2, Barcode } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

const PLANS = {
  basic: {
    name: 'Basic',
    price: 99,
    currency: 'BRL',
    description: 'Perfeito para pequenas empresas',
    features: ['Até 100 clientes', 'Gestão básica de vendas', 'Relatórios simples', 'Suporte por email', '5GB de armazenamento'],
    badge: 'Iniciante'
  },
  monthly: {
    name: 'Mensal',
    price: 97,
    currency: 'BRL',
    description: 'Ideal para testar a ferramenta',
    features: ['Acesso completo ao sistema', 'Até 3 Usuários ativos', 'Controle de Fluxo de Caixa', 'Suporte via E-mail'],
    badge: 'Individual'
  },
  pro: {
    name: 'Vitalício',
    price: 997,
    currency: 'BRL',
    description: 'Pague uma vez, use para sempre',
    features: ['Acesso vitalício', 'Usuários ilimitados', 'Módulo de Equipe Avançado', 'Suporte VIP via WhatsApp', 'Todas as atualizações futuras'],
    badge: 'Recomendado',
    isPopular: true
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    currency: 'BRL',
    description: 'Para grandes corporações',
    features: ['Clientes ilimitados', 'Customizável 100%', 'Analytics avançado', 'Suporte 24/7', 'Armazenamento ilimitado', 'Usuários ilimitados', 'APIs personalizadas', 'SLA garantido'],
    contact: true,
    badge: 'Enterprise'
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
    setSelectedPlan(plan && PLANS[plan] ? plan : 'pro');
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
    e.preventDefault();

    if (paymentMethod === 'credit_card' && !validateCardData()) {
      toast.error('Por favor, preencha os dados do cartão corretamente');
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
        payment_method_id: paymentMethod,
        recurring: true,
        payer: {
          email: user?.email,
          first_name: cardData.cardholderName?.split(' ')[0] || '',
          last_name: cardData.cardholderName?.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: ''
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
        // Se for uma simulação ou aprovação imediata
        if (result.status === 'approved') {
          // Chamada extra para garantir que o backend atualizou (importante para simulações)
          await fetch('/api/payment/simulate-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: company?.id }),
          });
          
          toast.success('Assinatura ativada com sucesso!');
          setLocation(`/payment-success?payment_id=${result.id || 'simulated_' + Date.now()}`);
        } else {
          toast.success('Instruções de pagamento foram enviadas para seu email!');
          setLocation(`/payment-success?payment_id=${result.id}`);
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

                {/* Payment Method Selection - Expandable Tabs */}
                <form onSubmit={handlePayment} className="space-y-3">
                  {[
                    { id: 'credit_card', label: 'Cartão de crédito', desc: 'Sem acréscimo', icon: CreditCard },
                    { id: 'pix', label: 'PIX', desc: 'Pagamento imediato', icon: Wallet2 },
                    { id: 'boleto', label: 'Boleto', desc: 'Prazo de 3 dias', icon: Barcode }
                  ].map(({ id, label, desc, icon: Icon }) => (
                    <div key={id} className={`border rounded-lg overflow-hidden transition-all ${
                      id === 'credit_card' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                    }`}>
                      {/* Tab Header */}
                      <div
                        onClick={() => setPaymentMethod(paymentMethod === id ? null : id)}
                        className={`w-full flex items-start gap-4 p-4 cursor-pointer transition-all ${
                          paymentMethod === id
                            ? id === 'credit_card' ? 'bg-blue-100/50' : 'bg-blue-50'
                            : id === 'credit_card' ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'bg-white hover:bg-slate-50'
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

                      {/* Tab Content - Cartão de Crédito */}
                      {paymentMethod === id && id === 'credit_card' && (
                        <div className="border-t border-slate-200 p-6 bg-white space-y-5">
                          {/* Card Header with Brands */}
                          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Cartão de crédito ou débito</h3>
                            <div className="flex gap-2">
                              {Object.entries(CardBrands).map(([brand, icon]) => (
                                <div key={brand} className="hover:opacity-80 transition-opacity">
                                  {icon}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Card Form Fields */}
                          <div className="space-y-5">
                            {/* Card Number */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700">Número do cartão</label>
                              <input
                                name="cardNumber"
                                value={cardData.cardNumber}
                                onChange={handleCardInputChange}
                                placeholder="1234 1234 1234 1234"
                                className={`w-full px-4 py-3 text-sm rounded border ${cardErrors.cardNumber ? 'border-red-500 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono`}
                                maxLength="19"
                                data-testid="input-card-number"
                              />
                              {cardErrors.cardNumber && <p className="text-red-600 text-xs">{cardErrors.cardNumber}</p>}
                            </div>

                            {/* Cardholder Name */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700">Nome do titular como aparece no cartão</label>
                              <input
                                name="cardholderName"
                                value={cardData.cardholderName}
                                onChange={handleCardInputChange}
                                placeholder="Maria Santos Pereira"
                                className={`w-full px-4 py-3 text-sm rounded border ${cardErrors.cardholderName ? 'border-red-500 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                                data-testid="input-cardholder-name"
                              />
                              {cardErrors.cardholderName && <p className="text-red-600 text-xs">{cardErrors.cardholderName}</p>}
                            </div>

                            {/* Expiry and CVV */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Data de vencimento</label>
                                <input
                                  name="expiryMonth"
                                  value={cardData.expiryMonth}
                                  onChange={handleCardInputChange}
                                  placeholder="MM/AA"
                                  maxLength="5"
                                  className={`w-full px-4 py-3 text-sm rounded border ${cardErrors.expiry ? 'border-red-500 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono`}
                                  data-testid="input-expiry"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Código de segurança</label>
                                <div className="relative">
                                  <input
                                    name="cvv"
                                    value={cardData.cvv}
                                    onChange={handleCardInputChange}
                                    placeholder="123"
                                    maxLength="4"
                                    className={`w-full px-4 py-3 text-sm rounded border ${cardErrors.cvv ? 'border-red-500 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono`}
                                    data-testid="input-cvv"
                                  />
                                  <svg className="absolute right-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Submit Button for Card */}
                          <Button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-base font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                            data-testid="button-complete-payment"
                          >
                            <Lock className="w-4 h-4" />
                            {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(plan.price)}${selectedPlan === 'pro' ? ' (Único)' : '/mês'}`}
                          </Button>
                        </div>
                      )}

                      {/* Tab Content - PIX */}
                      {paymentMethod === id && id === 'pix' && (
                        <div className="border-t border-slate-200 p-6 bg-white space-y-5">
                          <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 text-center">
                            <Wallet2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-slate-900">PIX Instantâneo</p>
                            <p className="text-slate-600 mt-2">Você receberá um QR Code para confirmar o pagamento</p>
                          </div>

                          {/* Submit Button for PIX */}
                          <Button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-base font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            data-testid="button-complete-payment"
                          >
                            <Lock className="w-4 h-4" />
                            {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(plan.price)}${selectedPlan === 'pro' ? ' (Único)' : '/mês'}`}
                          </Button>
                        </div>
                      )}

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
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-base font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            data-testid="button-complete-payment"
                          >
                            <Lock className="w-4 h-4" />
                            {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(plan.price)}${selectedPlan === 'pro' ? ' (Único)' : '/mês'}`}
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
