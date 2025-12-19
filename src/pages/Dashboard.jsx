import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Settings, DollarSign, TrendingUp, Wallet, AlertCircle, PieChart, Zap } from 'lucide-react';
import { subMonths, startOfMonth, parseISO } from 'date-fns';
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';
import KPIWidget from '../components/dashboard/KPIWidget';
import RevenueChart from '../components/dashboard/RevenueChart';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function DashboardPage() {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  // Default widget configuration
  const defaultWidgets = [
    { id: 'kpis', title: 'KPIs Principais', icon: PieChart, visible: true, description: 'Métricas financeiras essenciais' },
    { id: 'quickActions', title: 'Ações Rápidas', icon: Zap, visible: true, description: 'Atalhos para funções mais usadas' },
    { id: 'revenueChart', title: 'Gráfico de Receita', icon: TrendingUp, visible: true, description: 'Evolução de receitas e despesas' },
    { id: 'cashFlow', title: 'Fluxo de Caixa Futuro', icon: Wallet, visible: true, description: 'Previsão próximos 30 dias' },
    { id: 'recentTransactions', title: 'Transações Recentes', icon: DollarSign, visible: true, description: 'Últimas movimentações' }
  ];

  // Load widget preferences from localStorage
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
  }, [widgets]);

  // Fetch data
  const { data: transactions } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => base44.entities.Transaction.list(),
    initialData: []
  });

  const { data: saleInstallments } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
    initialData: []
  });

  const { data: purchaseInstallments } = useQuery({
    queryKey: ['purchaseInstallments'],
    queryFn: () => base44.entities.PurchaseInstallment.list(),
    initialData: []
  });

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date();
    const threeMonthsAgo = subMonths(startOfMonth(now), 2);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);

    const totalRevenue = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const totalExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Working Capital (Receivables - Payables)
    const receivables = saleInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);
    
    const payables = purchaseInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);

    const workingCapital = receivables - payables;

    // Debt
    const totalDebt = purchaseInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);

    // Future Cash Flow (30 days)
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const futureRevenue = saleInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);
    
    const futureExpenses = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);

    // Chart data
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
      
      const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      chartData.push({
        name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        income,
        expense
      });
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      workingCapital,
      totalDebt,
      futureRevenue,
      futureExpenses,
      chartData
    };
  };

  const metrics = calculateMetrics();

  const handleToggleWidget = (id) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  const renderWidget = (widget, index) => {
    const widgetContent = {
      kpis: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPIWidget
            title="Receita (3 meses)"
            value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="emerald"
            trend="up"
            trendValue="12% vs período anterior"
          />
          <KPIWidget
            title="Despesas (3 meses)"
            value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="rose"
          />
          <KPIWidget
            title="Lucro Líquido"
            value={`R$ ${metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Wallet}
            color={metrics.netProfit >= 0 ? 'emerald' : 'rose'}
          />
          <KPIWidget
            title="Capital de Giro"
            value={`R$ ${metrics.workingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Wallet}
            color={metrics.workingCapital >= 0 ? 'blue' : 'amber'}
          />
          <KPIWidget
            title="Endividamento"
            value={`R$ ${metrics.totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={AlertCircle}
            color="purple"
          />
          <KPIWidget
            title="Saúde Financeira"
            value={metrics.netProfit >= 0 && metrics.workingCapital >= 0 ? 'Saudável' : 'Atenção'}
            icon={PieChart}
            color={metrics.netProfit >= 0 && metrics.workingCapital >= 0 ? 'emerald' : 'amber'}
          />
        </div>
      ),
      quickActions: <QuickActionsWidget />,
      revenueChart: <RevenueChart data={metrics.chartData} />,
      cashFlow: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-600 font-medium">Receitas Previstas</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              R$ {metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <p className="text-sm text-rose-600 font-medium">Despesas Previstas</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">
              R$ {metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <p className="text-sm text-indigo-600 font-medium">Saldo Projetado</p>
            </div>
            <p className={`text-2xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {(metrics.futureRevenue - metrics.futureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ),
      recentTransactions: (
        <div className="space-y-3">
          {transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t.description}</p>
                  <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">Nenhuma transação recente</p>
          )}
        </div>
      )
    };

    return (
      <Draggable key={widget.id} draggableId={widget.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
          >
            <WidgetWrapper
              title={widget.title}
              icon={widget.icon}
              isVisible={widget.visible}
              onToggle={() => handleToggleWidget(widget.id)}
              dragHandleProps={provided.dragHandleProps}
            >
              {widgetContent[widget.id]}
            </WidgetWrapper>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão completa do seu negócio</p>
        </div>
        <Button
          onClick={() => setCustomizerOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Personalizar
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {widgets.map((widget, index) => renderWidget(widget, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <DashboardCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        widgets={widgets}
        onToggleWidget={handleToggleWidget}
      />
    </div>
  );
}