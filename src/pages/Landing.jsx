import { Button } from "@/components/ui/button";
import {
  Check,
  TrendingUp,
  Users,
  Lock,
  Shield,
  Zap,
  ArrowRight,
  BarChart3,
  DollarSign,
  Clock,
  Award,
  Database,
  Eye,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Gauge,
  LineChart,
  PieChart,
  Activity,
  Layers,
  Grid3x3,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const features = [
    {
      icon: Shield,
      title: "Segurança Bancária",
      description: "Criptografia de ponta com isolamento de dados. Controle total sobre permissões.",
    },
    {
      icon: Users,
      title: "Gestão de Equipe",
      description: "Permissões granulares por usuário. Delegar sem expor informações sensíveis.",
    },
    {
      icon: TrendingUp,
      title: "Previsão de Fluxo",
      description: "Antecipe problemas de caixa com 3+ meses de antecedência.",
    },
    {
      icon: Zap,
      title: "Precificação",
      description: "Calculadora automática de margem real por produto/serviço.",
    },
    {
      icon: BarChart3,
      title: "Relatórios",
      description: "DRE, Fluxo de Caixa e análises em tempo real.",
    },
    {
      icon: Lock,
      title: "Conformidade",
      description: "Audit logs completos e rastreamento de todas as operações.",
    },
  ];

  const modules = [
    {
      title: "Dashboard Executivo",
      description: "Visão 360º do seu negócio em tempo real",
      features: [
        "KPIs principais em cards grandes",
        "Saldo de caixa atualizado",
        "Receita vs Despesa do mês",
        "Tendências de 12 meses",
      ],
      icon: Activity,
    },
    {
      title: "Gestão de Transações",
      description: "Controle completo de entradas e saídas",
      features: [
        "Lançamentos manuais ou por importação",
        "Categorização automática",
        "Pagamento parcelado com juros",
        "Reconciliação bancária",
      ],
      icon: DollarSign,
    },
    {
      title: "Fluxo de Caixa",
      description: "Preveja o futuro financeiro do seu negócio",
      features: [
        "Projeção automática de 90 dias",
        "Cenários e simulações",
        "Alertas de falta de caixa",
        "Histórico de períodos passados",
      ],
      icon: LineChart,
    },
    {
      title: "Relatórios & DRE",
      description: "Análise profunda da saúde financeira",
      features: [
        "DRE detalhado por período",
        "Análise de rentabilidade",
        "Comparação de períodos",
        "Exportação em PDF/Excel",
      ],
      icon: PieChart,
    },
    {
      title: "Gestão de Clientes",
      description: "Organize e acompanhe relacionamentos",
      features: [
        "Cadastro de clientes completo",
        "Histórico de vendas",
        "Contas a receber",
        "Filtros e buscas avançadas",
      ],
      icon: Users,
    },
    {
      title: "Gestão de Fornecedores",
      description: "Controle seu pipeline de compras",
      features: [
        "Cadastro com dados bancários",
        "Contas a pagar integradas",
        "Termos de pagamento",
        "Análise de custos",
      ],
      icon: Grid3x3,
    },
  ];

  const systemShowcase = [
    {
      title: "Dashboard com Métricas",
      description: "Visualize todos os KPIs importantes em uma única tela",
      metrics: [
        { label: "Saldo de Caixa", value: "R$ 45.230,00", icon: DollarSign },
        { label: "Receita Mês", value: "R$ 125.900,00", icon: TrendingUp },
        { label: "Despesas", value: "R$ 80.670,00", icon: BarChart3 },
        { label: "Lucro Líquido", value: "R$ 45.230,00", icon: Award },
      ],
    },
    {
      title: "Transações Gerenciadas",
      description: "Controle total sobre cada movimento financeiro",
      preview: true,
    },
    {
      title: "Gráficos de Análise",
      description: "Visualize tendências e padrões de forma clara",
      preview: true,
    },
  ];

  const pains = [
    {
      icon: Eye,
      title: "Cegueira Financeira",
      desc: "Você vende mas não sabe se tem dinheiro no caixa no final do mês.",
    },
    {
      icon: AlertCircle,
      title: "Medo de Delegar",
      desc: "Centraliza tudo porque teme que vejam o lucro. Isso limita o crescimento.",
    },
    {
      icon: Database,
      title: "Dados Vulneráveis",
      desc: "Planilhas no computador, sem backup. Um crash = perda de histórico.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Cadastre sua Empresa",
      desc: "Setup em menos de 2 minutos. Dados básicos e pronto.",
      icon: UserCheck,
    },
    {
      number: "2",
      title: "Configure Usuários",
      desc: "Crie contas para equipe com permissões específicas por função.",
      icon: Users,
    },
    {
      number: "3",
      title: "Importe Histórico",
      desc: "Suba suas transações (CSV, PDF ou manual). Sistema organiza automaticamente.",
      icon: ArrowRight,
    },
    {
      number: "4",
      title: "Análise em Tempo Real",
      desc: "Veja dashboards, relatórios e previsões funcionando em tempo real.",
      icon: BarChart3,
    },
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Proprietário, E-commerce",
      company: "TechShop Brasil",
      text: "Após 2 anos perdendo dinheiro em planilhas desorganizadas, esse sistema me mostrou onde estava vazando caixa. Recuperei 23% em 3 meses.",
      avatar: "CS",
    },
    {
      name: "Mariana Costa",
      role: "Gerente Financeira",
      company: "Manufatura Premium",
      text: "As permissões granulares são um divisor de águas. Delego com confiança e tenho controle total. Ganho 10h por semana.",
      avatar: "MC",
    },
    {
      name: "Roberto Mendes",
      role: "CEO, Distribuidor",
      company: "Dist. Brasil",
      text: "A previsão de fluxo funcionou perfeito. Antecipei falta de caixa em 2 meses e renegociei com fornecedor. Economizei R$ 50k em juros.",
      avatar: "RM",
    },
  ];

  const plans = [
    {
      name: "MENSAL",
      subtitle: "Flexibilidade pura",
      price: "97",
      period: "/ mês",
      features: [
        "Acesso completo ao sistema",
        "Até 3 Usuários",
        "Controle Financeiro",
        "Suporte por E-mail",
      ],
      cta: "Começar Agora",
      highlighted: false,
    },
    {
      name: "VITALÍCIO",
      subtitle: "Investimento inteligente",
      originalPrice: "2.997,00",
      price: "997",
      installments: "ou 12x de R$ 99,70",
      features: [
        "Acesso VITALÍCIO",
        "Usuários ILIMITADOS",
        "Permissões Avançadas",
        "Suporte VIP (WhatsApp)",
        "Todas as atualizações",
        "Limitado a 50 contas",
      ],
      cta: "Quero o Vitalício",
      highlighted: true,
    },
  ];

  const faqs = [
    {
      q: "O plano vitalício é realmente vitalício?",
      a: "Sim, 100%. Você paga uma única vez e tem acesso permanente. Nenhuma mensalidade futura, mesmo que o preço suba.",
    },
    {
      q: "Preciso instalar software no computador?",
      a: "Não. É 100% online. Acessa pelo navegador de qualquer dispositivo, em qualquer lugar do mundo.",
    },
    {
      q: "Meus dados estão realmente seguros?",
      a: "Usamos infraestrutura de segurança bancária, criptografia ponta-a-ponta e audit logs de todas as operações. Você controla quem vê o quê.",
    },
    {
      q: "E se eu não gostar? Tem garantia?",
      a: "Sim. Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas.",
    },
    {
      q: "Como é o suporte?",
      a: "Plano mensal: email em até 24h. Vitalício: canal VIP no WhatsApp com prioridade máxima.",
    },
  ];

  return (
    <div className="bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">FinControl</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              data-testid="button-nav-login"
            >
              Login
            </Button>
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
              onClick={() => setLocation("/signup")}
              data-testid="button-nav-signup"
            >
              Começar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-600/5" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-300 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600 rounded-full opacity-10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-6xl sm:text-7xl font-bold leading-tight">
                  O Fim das <span className="text-yellow-500">Planilhas</span> Quebradas
                </h1>
                <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium">
                  Controle Financeiro de Nível Bancário com Gestão de Equipe Avançada
                </p>
              </div>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Pague uma única vez e tenha acesso vitalício ao sistema mais completo de gestão financeira. Sem mensalidades eternas. Sem surpresas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg px-8 h-14"
                  onClick={() => setLocation("/signup")}
                  data-testid="button-cta-hero"
                >
                  Garantir Vitalício Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 h-14"
                  onClick={() => setLocation("/login")}
                  data-testid="button-login-hero"
                >
                  Já tenho acesso
                </Button>
              </div>

              <div className="flex flex-col gap-3 pt-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  Instalação e setup em 2 minutos
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  Garantia incondicional de 7 dias
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  Nenhum cartão de crédito necessário
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl transform rotate-6 opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl transform -rotate-6 opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 rounded-2xl flex items-center justify-center p-6 overflow-hidden">
                  <div className="space-y-4 w-full">
                    <div className="h-4 bg-yellow-400 rounded w-3/4" />
                    <div className="h-3 bg-blue-600 rounded w-full" />
                    <div className="h-3 bg-blue-600 rounded w-5/6" />
                    <div className="pt-6 grid grid-cols-2 gap-3">
                      <div className="h-24 bg-yellow-400/20 rounded-lg" />
                      <div className="h-24 bg-blue-600/20 rounded-lg" />
                    </div>
                    <div className="pt-4 space-y-2">
                      <div className="h-2 bg-gray-400/30 rounded w-4/5" />
                      <div className="h-2 bg-gray-400/30 rounded w-3/5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Showcase */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-5xl font-bold">Veja o que você consegue fazer</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              6 módulos poderosos integrados em um único sistema
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {modules.slice(0, 2).map((module, idx) => {
              const Icon = module.icon;
              return (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 overflow-hidden hover:border-yellow-400 dark:hover:border-yellow-400 transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{module.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{module.description}</p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-0">
                    {module.features.map((feature, fidx) => (
                      <div key={fidx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.slice(2).map((module, idx) => {
              const Icon = module.icon;
              return (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-hidden hover:border-yellow-400 dark:hover:border-yellow-400 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{module.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {module.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Dashboard em Tempo Real</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Visualize todos os KPIs importantes em uma tela única
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-black rounded-2xl p-8 border border-gray-700 overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <h3 className="text-white font-bold text-lg">Visão Executiva</h3>
                <Layers className="w-5 h-5 text-yellow-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Saldo de Caixa", value: "R$ 45.230,00", icon: DollarSign, color: "text-yellow-400" },
                  { label: "Receita Mês", value: "R$ 125.900,00", icon: TrendingUp, color: "text-green-400" },
                  { label: "Despesas", value: "R$ 80.670,00", icon: BarChart3, color: "text-red-400" },
                  { label: "Lucro Líquido", value: "R$ 45.230,00", icon: Award, color: "text-blue-400" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">{item.label}</p>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <p className="text-white text-xl font-bold">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-6">
                <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-6 border border-gray-700 h-48 flex items-end justify-around">
                  <div className="space-y-4 w-full">
                    <p className="text-gray-400 text-sm">Receita vs Despesa (Últimos 30 dias)</p>
                    <div className="flex items-end justify-around h-24 gap-2">
                      {[40, 65, 35, 60, 75, 55, 70].map((height, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          <div className={`w-3 rounded-sm bg-gradient-to-t from-yellow-400 to-yellow-300`} style={{height: `${height}%`}} />
                          <span className="text-xs text-gray-500">D{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-4">Distribuição de Despesas</p>
                  <div className="space-y-3">
                    {[
                      { label: "Operacional", value: "45%", color: "bg-yellow-400" },
                      { label: "Pessoal", value: "35%", color: "bg-blue-400" },
                      { label: "Impostos", value: "20%", color: "bg-red-400" },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{item.label}</span>
                          <span className="text-gray-400">{item.value}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{width: item.value}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Você enfrenta esses problemas?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A maioria dos empresários enfrenta pelo menos um deles. Deixar sem resolver custa caro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pains.map((pain, idx) => {
              const Icon = pain.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-bold text-xl mb-3">{pain.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{pain.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Como Funciona</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Do setup até análise completa em 4 simples passos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative">
                  <div className="bg-gradient-to-br from-yellow-50 to-blue-50 dark:from-yellow-900/20 dark:to-blue-900/20 p-8 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-yellow-400 text-black font-bold text-lg flex items-center justify-center">
                        {step.number}
                      </div>
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{step.desc}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                      <ChevronRight className="w-6 h-6 text-yellow-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Tecnologia Enterprise Blindada</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Conheça cada benefício que vai revolucionar sua gestão
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-400 transition-all hover:shadow-lg dark:hover:shadow-yellow-500/10 bg-white dark:bg-gray-800"
                >
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Resultado Real de Clientes</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Veja o impacto que o sistema teve em seus negócios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, idx) => (
              <div
                key={idx}
                className="p-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {test.avatar}
                  </div>
                  <div>
                    <p className="font-bold">{test.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{test.role}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{test.company}</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">"{test.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Escolha seu Plano</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Seja um assinante ou dono definitivo do sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            {/* Mensal Card */}
            <div className="rounded-3xl p-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">MENSAL</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-base">Flexibilidade total</p>

              <div className="mb-8 space-y-2">
                <div className="text-5xl font-bold text-gray-900 dark:text-white">
                  R$ 97,00
                  <span className="text-2xl text-gray-600 dark:text-gray-400 font-normal"> / mês</span>
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full mb-8 font-bold text-lg h-14 border-2 border-gray-300 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setLocation("/signup")}
                data-testid="button-plan-mensal"
              >
                ASSINAR MENSAL
              </Button>

              <div className="space-y-4">
                {plans[0].features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-5 h-5 rounded-full border-2 border-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">Sem acesso vitalício</span>
                </div>
              </div>
            </div>

            {/* Vitalício Card - HIGHLIGHTED */}
            <div className="relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                  BEST-SELLER & VITALÍCIO
                </div>
              </div>
              
              <div className="rounded-3xl p-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl border-0">
                <h3 className="text-3xl font-bold mb-2">VITALÍCIO</h3>
                <p className="text-blue-100 mb-8 text-base">Economia brutal a longo prazo</p>

                <div className="mb-8 space-y-2">
                  {plans[1].originalPrice && (
                    <div className="text-lg text-blue-100 line-through">
                      De: R$ {plans[1].originalPrice}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-blue-100">12x de</div>
                    <div className="text-5xl font-bold text-white">
                      R$ 99,70
                    </div>
                    <div className="text-sm text-blue-100">ou R$ 997,00 à vista</div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full mb-6 font-bold text-lg h-14 bg-white text-blue-600 hover:bg-blue-50"
                  onClick={() => setLocation("/signup")}
                  data-testid="button-plan-vitalicio"
                >
                  QUERO O PLANO VITALÍCIO
                </Button>

                <div className="space-y-3 mb-6">
                  {plans[1].features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                      <span className="text-blue-50 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-4 border-t border-blue-400">
                  <p className="text-red-300 text-sm font-semibold">
                    Oferta limitada para as próximas 50 contas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-white text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-5xl font-bold">Garantia de 7 Dias</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Entre no sistema, importe seus dados, teste a gestão de equipe, faça lançamentos. Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas, sem letras miúdas.
          </p>
          <div className="flex justify-center gap-4 pt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Check className="w-5 h-5" />
              Reembolso integral
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Check className="w-5 h-5" />
              Sem burocracia
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Check className="w-5 h-5" />
              Sem perguntas
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold">Perguntas Frequentes</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Dúvidas? Aqui estão as respostas mais comuns.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full text-left"
                data-testid={`button-faq-${idx}`}
              >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-400 transition-all">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold pr-4">{faq.q}</h3>
                    <ChevronDown
                      className={`w-5 h-5 text-yellow-500 flex-shrink-0 transition-transform ${
                        expandedFaq === idx ? "transform rotate-180" : ""
                      }`}
                    />
                  </div>
                  {expandedFaq === idx && (
                    <p className="text-gray-700 dark:text-gray-300 mt-4">{faq.a}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-6xl font-bold">Não deixe a desorganização quebrar sua empresa</h2>
          <p className="text-2xl text-gray-300">
            O controle que você busca está a um clique de distância
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg px-12 h-14"
              onClick={() => setLocation("/signup")}
              data-testid="button-cta-final"
            >
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 h-14 px-12 font-bold text-lg"
              onClick={() => setLocation("/login")}
              data-testid="button-demo-final"
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black border-t border-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold text-lg text-white">FinControl</span>
              </div>
              <p className="text-gray-400 text-sm">
                Controle financeiro de nível bancário para seu negócio.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-yellow-400">Features</a></li>
                <li><a href="#" className="hover:text-yellow-400">Preços</a></li>
                <li><a href="#" className="hover:text-yellow-400">Segurança</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-yellow-400">Blog</a></li>
                <li><a href="#" className="hover:text-yellow-400">Contato</a></li>
                <li><a href="#" className="hover:text-yellow-400">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-yellow-400">Privacidade</a></li>
                <li><a href="#" className="hover:text-yellow-400">Termos</a></li>
                <li><a href="#" className="hover:text-yellow-400">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
              <p>Copyright 2025 FinControl. Todos os direitos reservados.</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-yellow-400">Twitter</a>
                <a href="#" className="hover:text-yellow-400">LinkedIn</a>
                <a href="#" className="hover:text-yellow-400">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
