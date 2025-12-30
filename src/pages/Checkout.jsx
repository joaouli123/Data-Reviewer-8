import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Check, Lock, Zap, Shield, Headphones, CreditCard, QrCode, Barcode } from 'lucide-react';
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
  pro: {
    name: 'Pro',
    price: 299,
    currency: 'BRL',
    description: 'Para empresas em crescimento',
    features: ['Até 500 clientes', 'Gestão avançada com IA', 'Relatórios inteligentes', 'Suporte prioritário', '100GB de armazenamento', 'Múltiplos usuários', 'Integração com banco'],
    badge: 'Popular',
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

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, company, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [identificationTypes, setIdentificationTypes] = useState([]);
  const [mp, setMp] = useState(null);
  const [step, setStep] = useState(1);
  const [isRecurring, setIsRecurring] = useState(true);

  // Form states - Inicializar com dados do usuário
  const [formData, setFormData] = useState({
    payerFirstName: '',
    payerLastName: '',
    email: '',
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

  const [formErrors, setFormErrors] = useState({});

  // Puxar dados do cadastro
  useEffect(() => {
    if (user && company) {
      const nameparts = (user.name || '').split(' ');
      const firstName = nameparts[0] || '';
      const lastName = nameparts.slice(1).join(' ') || '';
      
      setFormData(prev => ({
        ...prev,
        payerFirstName: firstName,
        payerLastName: lastName,
        email: user.email || '',
        identificationType: 'CPF'
      }));
    }
  }, [user, company]);

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
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.payerFirstName) errors.payerFirstName = 'Nome obrigatório';
    if (!formData.payerLastName) errors.payerLastName = 'Sobrenome obrigatório';
    if (!formData.email) errors.email = 'Email obrigatório';
    if (!formData.identificationType) errors.identificationType = 'Tipo de documento obrigatório';
    if (!formData.identificationNumber) errors.identificationNumber = 'Documento obrigatório';
    if (!formData.city) errors.city = 'Cidade obrigatória';
    if (paymentMethod === 'credit_card') {
      if (!formData.cardNumber) errors.cardNumber = 'Número do cartão obrigatório';
      if (!formData.expiryMonth || !formData.expiryYear) errors.expiry = 'Data de validade obrigatória';
      if (!formData.cvv) errors.cvv = 'CVV obrigatório';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!mp && paymentMethod === 'credit_card') return;

    try {
      setIsProcessing(true);
      const paymentMsg = isRecurring ? 'assinatura' : 'pagamento';
      toast.loading(`Processando ${paymentMsg} com segurança...`);

      let payload = {
        companyId: company?.id,
        plan: selectedPlan,
        email: formData.email,
        total_amount: PLANS[selectedPlan].price.toFixed(2),
        payment_method_id: paymentMethod,
        recurring: isRecurring,
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
          const cardToken = await mp.createCardToken({
            cardNumber: formData.cardNumber.replace(/\s/g, ''),
            cardholderName: formData.payerFirstName + ' ' + formData.payerLastName,
            cardExpirationMonth: formData.expiryMonth,
            cardExpirationYear: formData.expiryYear,
            securityCode: formData.cvv,
            identificationType: formData.identificationType,
            identificationNumber: formData.identificationNumber
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
        if (result.status === 'approved') {
          toast.success(`${paymentMethod === 'credit_card' ? 'Assinatura' : 'Pagamento'} confirmado com sucesso!`);
          setLocation(`/payment-success?payment_id=${result.id}`);
        } else {
          toast.info('Pagamento pendente ou em processamento. Você receberá as instruções de pagamento no seu email.');
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
            onClick={() => setLocation('/')} 
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
        {/* Progress Steps */}
        <div className="flex justify-center gap-8 mb-12">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </div>
            <span className="text-xs font-medium text-slate-600">Dados</span>
          </div>
          <div className="flex items-end gap-2 flex-1 max-w-xs">
            <div className={`h-1 flex-1 rounded transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </div>
            <span className="text-xs font-medium text-slate-600">Pagamento</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 border border-slate-200">
              {step === 1 ? (
                // Step 1: Personal Data
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Seus Dados</h2>
                    <p className="text-slate-500">Informações pessoais para a assinatura</p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Nome *</label>
                        <input
                          name="payerFirstName"
                          value={formData.payerFirstName}
                          onChange={handleInputChange}
                          placeholder="João"
                          className={`w-full px-4 py-3 rounded-lg border ${formErrors.payerFirstName ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                          data-testid="input-first-name"
                        />
                        {formErrors.payerFirstName && <p className="text-red-600 text-xs">{formErrors.payerFirstName}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Sobrenome *</label>
                        <input
                          name="payerLastName"
                          value={formData.payerLastName}
                          onChange={handleInputChange}
                          placeholder="Silva"
                          className={`w-full px-4 py-3 rounded-lg border ${formErrors.payerLastName ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                          data-testid="input-last-name"
                        />
                        {formErrors.payerLastName && <p className="text-red-600 text-xs">{formErrors.payerLastName}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">E-mail *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="seu@email.com"
                        className={`w-full px-4 py-3 rounded-lg border ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        data-testid="input-email"
                      />
                      {formErrors.email && <p className="text-red-600 text-xs">{formErrors.email}</p>}
                    </div>

                    {/* Document */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Tipo de Documento *</label>
                        <select
                          name="identificationType"
                          value={formData.identificationType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          data-testid="select-doc-type"
                        >
                          {identificationTypes.length > 0 ? (
                            identificationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                          ) : (
                            <>
                              <option value="CPF">CPF</option>
                              <option value="CNPJ">CNPJ</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Número *</label>
                        <input
                          name="identificationNumber"
                          value={formData.identificationNumber}
                          onChange={handleInputChange}
                          placeholder="123.456.789-00"
                          className={`w-full px-4 py-3 rounded-lg border ${formErrors.identificationNumber ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                          data-testid="input-doc-number"
                        />
                        {formErrors.identificationNumber && <p className="text-red-600 text-xs">{formErrors.identificationNumber}</p>}
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="pt-6 border-t border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">Endereço (Opcional)</h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-1 space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">CEP</label>
                          <input
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={handleInputChange}
                            placeholder="06233-903"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            data-testid="input-zipcode"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Cidade *</label>
                          <input
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="São Paulo"
                            className={`w-full px-4 py-3 rounded-lg border ${formErrors.city ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                            data-testid="input-city"
                          />
                          {formErrors.city && <p className="text-red-600 text-xs">{formErrors.city}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Rua</label>
                          <input
                            name="streetName"
                            value={formData.streetName}
                            onChange={handleInputChange}
                            placeholder="Av. das Nações Unidas"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            data-testid="input-street"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Número</label>
                          <input
                            name="streetNumber"
                            value={formData.streetNumber}
                            onChange={handleInputChange}
                            placeholder="3003"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            data-testid="input-street-number"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-4 pt-6 border-t border-slate-200">
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg rounded-lg transition-all"
                        data-testid="button-next-payment"
                      >
                        Próximo: Pagamento
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                // Step 2: Payment Method
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Forma de Pagamento</h2>
                    <p className="text-slate-500">Escolha como deseja pagar</p>
                  </div>

                  {/* Payment Method Tabs */}
                  <div className="grid grid-cols-3 gap-4 pb-6 border-b border-slate-200">
                    {[
                      { id: 'credit_card', label: 'Cartão', icon: CreditCard, desc: isRecurring ? 'Recorrente' : 'Único' },
                      { id: 'pix', label: 'PIX', icon: QrCode, desc: isRecurring ? 'Recorrente' : 'Instantâneo' },
                      { id: 'boleto', label: 'Boleto', icon: Barcode, desc: 'Única vez' }
                    ].map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        onClick={() => {
                          setPaymentMethod(id);
                          if (id === 'boleto') setIsRecurring(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          paymentMethod === id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        data-testid={`button-payment-method-${id}`}
                      >
                        <Icon className={`w-6 h-6 ${paymentMethod === id ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-semibold ${paymentMethod === id ? 'text-blue-600' : 'text-slate-700'}`}>
                          {label}
                        </span>
                        <span className="text-xs text-slate-500">{desc}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handlePayment} className="space-y-6">
                    {/* Recurring Option */}
                    {paymentMethod !== 'boleto' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <Checkbox
                          checked={isRecurring}
                          onCheckedChange={setIsRecurring}
                          id="recurring-payment"
                          data-testid="checkbox-recurring"
                        />
                        <label htmlFor="recurring-payment" className="cursor-pointer flex-1">
                          <div className="font-semibold text-blue-900">Ativar cobrança automática</div>
                          <div className="text-sm text-blue-700">Renova automaticamente todo mês sem preocupações</div>
                        </label>
                      </div>
                    )}

                    {paymentMethod === 'credit_card' && (
                      <div className="space-y-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-900">Dados do Cartão</h3>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Número do Cartão *</label>
                          <input
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleInputChange}
                            placeholder="0000 0000 0000 0000"
                            className={`w-full px-4 py-3 rounded-lg border ${formErrors.cardNumber ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-lg tracking-wider`}
                            maxLength="19"
                            data-testid="input-card-number"
                          />
                          {formErrors.cardNumber && <p className="text-red-600 text-xs">{formErrors.cardNumber}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-900">Mês *</label>
                            <input
                              name="expiryMonth"
                              value={formData.expiryMonth}
                              onChange={handleInputChange}
                              placeholder="MM"
                              maxLength="2"
                              className={`w-full px-4 py-3 rounded-lg border ${formErrors.expiry ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center font-mono`}
                              data-testid="input-expiry-month"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-900">Ano *</label>
                            <input
                              name="expiryYear"
                              value={formData.expiryYear}
                              onChange={handleInputChange}
                              placeholder="YYYY"
                              maxLength="4"
                              className={`w-full px-4 py-3 rounded-lg border ${formErrors.expiry ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center font-mono`}
                              data-testid="input-expiry-year"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-900">CVV *</label>
                            <input
                              name="cvv"
                              value={formData.cvv}
                              onChange={handleInputChange}
                              placeholder="123"
                              maxLength="4"
                              className={`w-full px-4 py-3 rounded-lg border ${formErrors.cvv ? 'border-red-400 bg-red-50' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center font-mono`}
                              data-testid="input-cvv"
                            />
                            {formErrors.cvv && <p className="text-red-600 text-xs">{formErrors.cvv}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'pix' && (
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-center">
                        <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                        <p className="text-slate-700 font-medium mb-1">PIX Instantâneo</p>
                        <p className="text-sm text-slate-600">{isRecurring ? 'Você receberá um código PIX de autenticação para ativar cobranças automáticas.' : 'Você receberá um QR Code PIX para copiar e colar.'}</p>
                      </div>
                    )}

                    {paymentMethod === 'boleto' && (
                      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 text-center">
                        <Barcode className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                        <p className="text-slate-700 font-medium mb-1">Boleto Bancário</p>
                        <p className="text-sm text-slate-600">Você receberá um código de boleto para pagar até a data de vencimento (geralmente 3 dias úteis)</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6 border-t border-slate-200">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 py-3 text-lg rounded-lg font-semibold"
                        onClick={() => setStep(1)}
                        data-testid="button-back-data"
                      >
                        Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-lg font-semibold transition-all disabled:opacity-50"
                        data-testid="button-complete-payment"
                      >
                        {isProcessing ? 'Processando...' : `Confirmar Pagamento`}
                      </Button>
                    </div>
                  </form>

                  {/* Security Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Transação 100% Segura</p>
                      <p className="text-blue-700">Seus dados são criptografados e processados de forma segura pelo Mercado Pago</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className={`p-6 sticky top-24 border ${plan.isPopular ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-white' : 'border-slate-200'}`}>
              {plan.isPopular && (
                <div className="mb-4 inline-block">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-600 text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                {plan.contact ? (
                  <p className="text-slate-600">Entre em contato para cotação</p>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                      <span className="text-slate-600">/mês</span>
                    </div>
                    {step === 2 && (
                      <p className="text-xs text-slate-500 mt-2">
                        {isRecurring ? '✓ Renovação automática' : 'Pagamento único'}
                      </p>
                    )}
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
