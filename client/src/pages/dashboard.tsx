import { KPICard } from "@/components/kpi-card";
import { DollarSign, TrendingUp, CreditCard, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary" data-testid="heading-dashboard">
            Visão completa do seu negócio
          </h1>
          <p className="mt-2 text-muted-foreground" data-testid="subheading-dashboard">
            Acompanhe os principais indicadores de desempenho do seu negócio
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Receita (3 meses)"
            value="R$ 4.300,00"
            icon={<DollarSign className="h-6 w-6" />}
            trend={{
              value: "+12%",
              isPositive: true,
              period: "vs período anterior",
            }}
          />

          <KPICard
            label="Despesas (3 meses)"
            value="R$ 850,00"
            icon={<CreditCard className="h-6 w-6" />}
            trend={{
              value: "-5%",
              isPositive: true,
              period: "vs período anterior",
            }}
          />

          <KPICard
            label="Lucro Líquido"
            value="R$ 3.450,00"
            icon={<TrendingUp className="h-6 w-6" />}
          />

          <KPICard
            label="Saúde Financeira"
            value="Saudável"
            icon={<Activity className="h-6 w-6" />}
          />
        </div>

        {/* Additional Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-elevate border-primary/20" data-testid="card-capital-de-giro">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-primary">Capital de Giro</CardTitle>
              <CardDescription>Disponibilidade de caixa</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">R$ 1.800,00</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Fundos disponíveis para operações
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-primary/20" data-testid="card-endividamento">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-primary">Endividamento</CardTitle>
              <CardDescription>Índice de dívida</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">R$ 200,00</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Débitos pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-primary/20" data-testid="card-visibilidade">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-primary">Visibilidade</CardTitle>
              <CardDescription>Análise de transparência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <p className="text-sm font-medium">Completa</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Todos os dados visíveis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <Card className="mt-8 hover-elevate border-primary/20" data-testid="card-summary">
          <CardHeader>
            <CardTitle className="text-primary">Resumo Financeiro</CardTitle>
            <CardDescription>Análise dos últimos 3 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="mt-2 text-2xl font-bold text-primary">R$ 4.300,00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesa Total</p>
                <p className="mt-2 text-2xl font-bold text-primary">R$ 850,00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margem Líquida</p>
                <p className="mt-2 text-2xl font-bold text-accent">80,2%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fluxo de Caixa</p>
                <p className="mt-2 text-2xl font-bold text-accent">Positivo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
