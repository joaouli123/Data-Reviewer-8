import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, Lock, Zap, Shield, Check } from 'lucide-react';
import LogoHUA from '@assets/Logo_HUA_1766187037233.png';

export default function Home() {
  const [, setLocation] = useLocation();

  const plans = [
    {
      name: 'Basic',
      price: 'R$ 99',
      period: '/mês',
      description: 'Perfeito para pequenas empresas começarem',
      features: [
        'Até 100 clientes',
        'Gestão básica de vendas',
        'Relatórios simples',
        'Suporte por email',
        '5GB de armazenamento'
      ],
      popular: false,
      buttonText: 'Escolher Plano Basic'
    },
    {
      name: 'Pro',
      price: 'R$ 299',
      period: '/mês',
      description: 'Para empresas em crescimento',
      features: [
        'Até 500 clientes',
        'Gestão avançada de vendas',
        'Relatórios inteligentes com IA',
        'Suporte prioritário',
        '100GB de armazenamento',
        'Múltiplos usuários',
        'Integração com banco'
      ],
      popular: true,
      buttonText: 'Escolher Plano Pro'
    },
    {
      name: 'Enterprise',
      price: 'Customizado',
      period: '/mês',
      description: 'Para grandes corporações',
      features: [
        'Clientes ilimitados',
        'Gestão completa e customizável',
        'Analytics avançado com IA',
        'Suporte 24/7 dedicado',
        'Armazenamento ilimitado',
        'Usuários ilimitados',
        'APIs personalizadas',
        'SLA garantido'
      ],
      popular: false,
      buttonText: 'Contatar Vendas'
    }
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'Gestão de Vendas',
      description: 'Acompanhe todas as suas vendas, parcelas e recebimentos em tempo real'
    },
    {
      icon: Users,
      title: 'Clientes & Fornecedores',
      description: 'Organize sua base de clientes e fornecedores com controle total'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Inteligentes',
      description: 'Análises detalhadas com DRE, fluxo de caixa e previsões financeiras'
    },
    {
      icon: Lock,
      title: 'Segurança Multi-Tenant',
      description: 'Dados isolados e protegidos com autenticação avançada'
    },
    {
      icon: Zap,
      title: 'IA Analista',
      description: 'Recomendações automáticas usando inteligência artificial'
    },
    {
      icon: Shield,
      title: 'Backup & Recuperação',
      description: 'Seus dados sempre seguros com backup automático'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header/Navigation */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LogoHUA} alt="HUA Logo" className="w-12 h-12 object-contain" />
            <span className="text-xl font-bold">HUA Analytics</span>
          </div>
          <Button 
            onClick={() => setLocation('/login')}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-header-login"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Gestão Financeira Inteligente
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Controle total sobre suas vendas, clientes e finanças. Análises em tempo real com inteligência artificial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-lg"
              onClick={() => setLocation('/login')}
              data-testid="button-hero-login"
            >
              Acessar Sistema
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-slate-500 text-white hover:bg-slate-800 px-8 py-6 text-lg rounded-lg"
              onClick={() => setLocation('/signup')}
              data-testid="button-hero-signup"
            >
              Criar Conta
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-3xl rounded-3xl"></div>
          <Card className="relative bg-slate-800/50 border-slate-700/50 backdrop-blur overflow-hidden">
            <div className="p-8 sm:p-12">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">Receita Total</p>
                  <p className="text-2xl font-bold text-blue-400">R$ 125.430,80</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">Recebido</p>
                  <p className="text-2xl font-bold text-green-400">R$ 98.500,00</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">Pendente</p>
                  <p className="text-2xl font-bold text-orange-400">R$ 26.930,80</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600/50">
                  <div>
                    <p className="font-medium">Cliente ABC</p>
                    <p className="text-sm text-slate-400">3 parcelas - Venda em 15/12</p>
                  </div>
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm">Pago</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600/50">
                  <div>
                    <p className="font-medium">Empresa XYZ</p>
                    <p className="text-sm text-slate-400">2 parcelas - Venda em 20/12</p>
                  </div>
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded text-sm">Parcial</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600/50">
                  <div>
                    <p className="font-medium">Fornecedor Tech</p>
                    <p className="text-sm text-slate-400">1 parcela - Venda em 28/12</p>
                  </div>
                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm">Pendente</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Recursos Poderosos</h2>
          <p className="text-xl text-slate-400">Tudo que você precisa para controlar suas finanças</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="bg-slate-800/50 border-slate-700/50 backdrop-blur hover:border-slate-600 transition-all p-8">
                <div className="mb-4 w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Planos Simples e Transparentes</h2>
          <p className="text-xl text-slate-400">Escolha o plano perfeito para seu negócio</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <Card 
              key={idx} 
              className={`relative bg-slate-800/50 border backdrop-blur transition-all hover:border-blue-500/50 ${
                plan.popular 
                  ? 'border-blue-500/50 ring-1 ring-blue-500/20 md:scale-105' 
                  : 'border-slate-700/50'
              } overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1 text-sm font-semibold rounded-bl">
                  Popular
                </div>
              )}
              
              <div className="p-8 h-full flex flex-col">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-blue-400">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                <Button
                  onClick={() => setLocation(`/signup?plan=${plan.name.toLowerCase()}`)}
                  className={`w-full mb-6 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' 
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                  data-testid={`button-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.buttonText}
                </Button>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Card className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30 backdrop-blur p-12 sm:p-16">
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Acesse agora e transforme a forma como você gerencia suas finanças
          </p>
          <Button 
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-10 py-6 text-lg rounded-lg"
            onClick={() => setLocation('/login')}
            data-testid="button-cta-login"
          >
            Entrar no Sistema
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>&copy; 2024 HUA Analytics. Todos os direitos reservados.</p>
          <p className="mt-2 text-sm">Gestão financeira inteligente para sua empresa</p>
        </div>
      </footer>
    </div>
  );
}
