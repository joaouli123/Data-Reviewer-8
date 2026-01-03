import React, { useState } from 'react';
import { Transaction, Category } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Download, Search, Trash2, Pencil, Wallet, TrendingUp, TrendingDown, Upload, ChevronRight, Check, Clock, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isBefore, parse, subDays, startOfDay, endOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionForm from '../components/transactions/TransactionForm';
import BankStatementUpload from '../components/transactions/BankStatementUpload';
import BankReconciliation from '../components/transactions/BankReconciliation';
import PeriodFilter from '../components/dashboard/PeriodFilter';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  // Initialize with local date (not UTC) to respect user timezone
  const getInitialDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    return {
      startDate: startOfDay(thirtyDaysAgo),
      endDate: endOfDay(today),
      label: 'Últimos 30 dias'
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => apiRequest('GET', '/api/categories'),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => apiRequest('GET', '/api/transactions'),
    initialData: [],
    enabled: !!company?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);

  const categoryMap = React.useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      setIsFormOpen(false);
      toast.success('Transação criada com sucesso!', { duration: 5000 });
    },
    onError: (error) => {
      console.error('Erro ao criar transação:', error);
      toast.error(error.message || 'Erro ao salvar transação. Tente novamente.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      setIsFormOpen(false);
      setEditingTransaction(null);
      toast.success('Transação atualizada!', { duration: 5000 });
    },
    onError: (error) => {
      console.error('Erro ao atualizar transação:', error);
      toast.error(error.message || 'Erro ao atualizar transação. Tente novamente.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      toast.success('Transação removida.', { duration: 5000 });
    },
    onError: (error) => {
      console.error('Erro ao deletar transação:', error);
      toast.error(error.message || 'Erro ao remover transação. Tente novamente.');
    }
  });

  const handleSubmit = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      // Handle array of transactions (for installments)
      if (Array.isArray(data)) {
        data.forEach(transaction => {
          createMutation.mutate(transaction);
        });
      } else {
        createMutation.mutate(data);
      }
    }
  };

  const handleEdit = (item) => {
    // Ensure we have a copy with all data intact
    const transactionToEdit = { ...item };
    setEditingTransaction(transactionToEdit);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatementExtracted = (data) => {
    setStatementData(data);
    setReconciliationOpen(true);
  };

    const handleExport = () => {
    if (!transactions.length) return;
    
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Forma de Pagamento', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const categoryName = t.categoryId ? (categoryMap[t.categoryId] || 'Outros') : (t.categoryName || t.category || 'Outros');
        
        // Format date as DD/MM/YYYY (extract from ISO format YYYY-MM-DD)
        const dateStr = t.date ? new Date(t.date).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
        
        // Format amount as R$ with proper Brazilian format
        const amount = parseFloat(t.amount || 0);
        const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Map transaction type to Receita/Despesa
        const typeLabel = t.type === 'venda' ? 'Receita' : t.type === 'compra' ? 'Despesa' : t.type;
        
        // Ensure no undefined values
        const description = t.description || '';
        const paymentMethod = t.paymentMethod || '-';
        
        return `${dateStr},"${description}",${typeLabel},${categoryName},${paymentMethod},${formattedAmount}`;
      })
    ].join('\n');

    // UTF-8 with BOM (Byte Order Mark) for proper Excel compatibility
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(csvContent);
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blobData = new Uint8Array(BOM.length + uint8Array.length);
    blobData.set(BOM, 0);
    blobData.set(uint8Array, BOM.length);
    
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const txArray = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);
    
    const calculateBalances = () => {
      let openingBalance = 0;
      let periodIncome = 0;
      let periodExpense = 0;
      
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const startTime = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0);
      const endTime = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59);

      txArray.forEach(t => {
        if (!t) return;
        const isPaid = t.status === 'pago' || t.status === 'completed';
        const relevantDate = isPaid && t.paymentDate ? t.paymentDate : t.date;
        if (!relevantDate) return;
        
        let tDate;
        try {
          const d = new Date(relevantDate);
          if (isNaN(d.getTime())) return;
          tDate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
        } catch (e) {
          return;
        }
        
        const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);

        if (tDate < startTime) {
          if (t.type === 'venda' || t.type === 'income') openingBalance += amount;
          else openingBalance -= amount;
        } else if (tDate >= startTime && tDate <= endTime) {
          if (t.type === 'venda' || t.type === 'income') periodIncome += amount;
          else periodExpense += Math.abs(amount);
        }
      });

      return {
        opening: openingBalance,
        income: periodIncome,
        expense: periodExpense,
        closing: openingBalance + periodIncome - periodExpense
      };
    };

    // Memoize calculations to prevent lag
    const balances = React.useMemo(() => calculateBalances(), [txArray, dateRange]);

    const filteredTransactions = React.useMemo(() => {
      return txArray
        .filter(t => {
          if (!t) return false;
          
          // 1. Filtrar por Tipo
          const typeMap = { 'income': 'venda', 'expense': 'compra', 'all': 'all' };
          const mappedType = typeMap[typeFilter] || typeFilter;
          const matchesType = mappedType === 'all' || t.type === mappedType || (mappedType === 'venda' && t.type === 'income') || (mappedType === 'compra' && t.type === 'expense');
          if (!matchesType) return false;

          // 2. Filtrar por Status
          if (statusFilter === 'paid') {
            const isPaidOrPartial = t.status === 'pago' || t.status === 'completed' || t.status === 'parcial';
            if (!isPaidOrPartial) return false;
          } else if (statusFilter === 'pending') {
            const isPending = t.status === 'pendente';
            if (!isPending) return false;
          }
          
          // 3. Filtrar por Categoria
          const tCategoryName = t.categoryId ? categoryMap[t.categoryId] : (t.categoryName || t.category || 'Outros');
          const matchesCategory = categoryFilter === 'all' || 
                                 tCategoryName === categoryFilter ||
                                 t.categoryId === categoryFilter;
          if (!matchesCategory) return false;

          // 4. Filtrar por Busca
          const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (tCategoryName && tCategoryName.toLowerCase().includes(searchTerm.toLowerCase()));
          if (!matchesSearch) return false;

          // 5. Filtrar por Forma de Pagamento
          const matchesPaymentMethod = paymentMethodFilter === 'all' || t.paymentMethod === paymentMethodFilter;
          if (!matchesPaymentMethod) return false;

          // 6. Filtrar por Data (UTC Midday approach)
          const isPaid = t.status === 'pago' || t.status === 'completed';
          const relevantDate = isPaid && t.paymentDate ? t.paymentDate : t.date;
          if (!relevantDate) return true; // Show by default if date is missing to avoid disappearing

          let tDate;
          try {
            const d = new Date(relevantDate);
            if (isNaN(d.getTime())) return true;
            // Normalizar para meio-dia UTC para evitar problemas de fuso horário
            tDate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
          } catch (e) {
            return true;
          }
          
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          const startTime = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0);
          const endTime = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59);

          return tDate >= startTime && tDate <= endTime;
        })
      .sort((a, b) => {
        // Sort by relevant date (paymentDate for paid, date for pending)
        const aIsPaid = a.status === 'pago' || a.status === 'completed';
        const bIsPaid = b.status === 'pago' || b.status === 'completed';
        const aDate = aIsPaid && a.paymentDate ? a.paymentDate : a.date;
        const bDate = bIsPaid && b.paymentDate ? b.paymentDate : b.date;
        return new Date(bDate) - new Date(aDate);
      });
    }, [txArray, typeFilter, statusFilter, categoryFilter, searchTerm, paymentMethodFilter, dateRange, categories]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Transações</h1>
            <p className="text-xs sm:text-sm text-slate-500">Gerencie suas receitas e despesas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <PeriodFilter 
              onPeriodChange={setDateRange}
              mode="days"
              defaultPeriod="last30Days"
            />
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button 
              onClick={() => setUploadOpen(true)} 
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4" /> Importar Extrato
            </Button>
            <Button 
              onClick={() => setReconciliationOpen(true)} 
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <CheckCircle2 className="w-4 h-4" /> Conciliação
            </Button>
            <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="bg-primary hover:bg-primary w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Nova Transação
            </Button>
        </div>
      </div>

      <BankStatementUpload 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        onExtracted={() => setReconciliationOpen(true)} 
      />
      
      <BankReconciliation 
        open={reconciliationOpen} 
        onOpenChange={setReconciliationOpen} 
      />

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">Saldo Inicial</p>
                    <h3 className="text-xl font-bold text-slate-700">R$ {balances.opening.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Wallet className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-emerald-600">Entradas</p>
                    <h3 className="text-xl font-bold text-emerald-600">+ R$ {balances.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-rose-600">Saídas</p>
                    <h3 className="text-xl font-bold text-rose-600">- R$ {balances.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                    <TrendingDown className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className={balances.closing >= 0 ? "bg-emerald-600 border-emerald-600 shadow-md" : "bg-rose-600 border-rose-600 shadow-md"}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-white/80">Saldo Final</p>
                    <h3 className="text-xl font-bold text-white">R$ {balances.closing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className={`p-2 rounded-lg text-white ${balances.closing >= 0 ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                    <Wallet className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-start">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Buscar transações..." 
                    className="pl-9 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas categorias</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-[140px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="paid">Pagas</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                        <SelectValue placeholder="Forma de Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Formas</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                        <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="Crediário">Crediário</SelectItem>
                        <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="pl-6 text-left">Data</TableHead>
                        <TableHead className="text-left">Descrição</TableHead>
                        <TableHead className="text-left">Categoria</TableHead>
                        <TableHead className="text-left">Forma</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Conciliação</TableHead>
                        <TableHead className="text-right pr-6">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((t) => (
                            <TableRow key={t.id} className="hover:bg-slate-50/50 group">
                                <TableCell className="font-medium text-slate-600 pl-6 text-left">
                                    {/* For paid transactions, show payment date; otherwise show due date */}
                                    {(() => {
                                      const isPaid = t.status === 'pago' || t.status === 'completed';
                                      const dateToDisplay = isPaid && t.paymentDate ? t.paymentDate : t.date;
                                      return format(parseISO(dateToDisplay.split('T')[0] + 'T12:00:00Z'), "dd/MM/yyyy", { locale: ptBR });
                                    })()}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 text-left">
                                    {t.description}
                                    {t.installmentNumber && t.installmentTotal && (
                                        <span className="ml-2 text-xs text-slate-500 font-normal">
                                            ({t.installmentNumber}/{t.installmentTotal})
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-left">
                                    <Badge variant="secondary" className="capitalize font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                                        {t.categoryId ? (categoryMap[t.categoryId] || 'Outros') : (t.categoryName || t.category || 'Outros')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-left">
                                    <span className="text-xs font-medium text-slate-600">
                                        {t.paymentMethod && t.paymentMethod !== '-' ? t.paymentMethod : 'Outros'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-left">
                                    <Badge 
                                        className={`font-normal ${
                                            t.status === 'pago' || t.status === 'completed' 
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                : t.status === 'parcial'
                                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        }`}
                                    >
                                        {t.status === 'pago' || t.status === 'completed' ? 'Pago' : t.status === 'parcial' ? 'Parcial' : 'Pendente'}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${t.type === 'venda' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'venda' ? '+' : '-'} R$ {Math.abs(parseFloat(t.amount || 0) + parseFloat(t.interest || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center" data-testid={`status-reconciliation-${t.id}`}>
                                    <div className="flex items-center justify-center gap-1">
                                        {t.isReconciled ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-medium text-emerald-600">Sim</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 text-rose-600" />
                                                <span className="text-xs font-medium text-rose-600">Não</span>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem 
                                                    className="cursor-pointer"
                                                    onClick={() => handleEdit(t)}
                                                >
                                                    <Pencil className="w-4 h-4 mr-2" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                                    onClick={() => handleDelete(t.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" /> Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                                Nenhuma transação encontrada.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredTransactions.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      <TransactionForm 
        key={editingTransaction?.id || 'new'}
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingTransaction}
      />

      <BankStatementUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onExtracted={handleStatementExtracted}
      />

      {statementData && (
        <BankReconciliation
          open={reconciliationOpen}
          onOpenChange={setReconciliationOpen}
          statementData={statementData}
          transactions={transactions}
        />
      )}
    </div>
  );
}