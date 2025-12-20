import React, { useState } from 'react';
import { Transaction, Category } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Download, Search, Trash2, Pencil, Wallet, TrendingUp, TrendingDown, Upload, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isBefore, parse, subDays, startOfDay, endOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionForm from '../components/transactions/TransactionForm';
import BankStatementUpload from '../components/transactions/BankStatementUpload';
import BankReconciliation from '../components/transactions/BankReconciliation';
import PeriodFilter from '../components/dashboard/PeriodFilter';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
    label: 'Hoje'
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);


  // Categories not implemented, use static list
  const categories = [
    { id: 'venda', name: 'Venda' },
    { id: 'compra', name: 'Compra' },
    { id: 'devolucao', name: 'Devolução' },
    { id: 'ajuste', name: 'Ajuste' },
    { id: 'pagamento', name: 'Pagamento' }
  ];
  
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => Transaction.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsFormOpen(false);
      toast.success('Transação criada com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsFormOpen(false);
      setEditingTransaction(null);
      toast.success('Transação atualizada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação removida.');
    }
  });

  const handleSubmit = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item) => {
    setEditingTransaction(item);
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
    
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => 
        `${t.date},"${t.description}",${t.type},${t.category},${t.amount}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredTransactions = transactions
    .filter(t => {
      const tDate = parseISO(t.date);
      const typeMap = { 'income': 'venda', 'expense': 'compra', 'all': 'all' };
      const mappedType = typeMap[typeFilter] || typeFilter;
      const matchesType = mappedType === 'all' || t.type === mappedType;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = tDate >= dateRange.startDate && tDate <= dateRange.endDate;

      return matchesType && matchesCategory && matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate Balances
  const calculateBalances = () => {
    let openingBalance = 0;
    let periodIncome = 0;
    let periodExpense = 0;

    transactions.forEach(t => {
      const tDate = parseISO(t.date);
      const amount = parseFloat(t.amount) || 0;
      
      if (tDate < dateRange.startDate) {
        // Transaction is before the selected period -> contributes to opening balance
        if (t.type === 'venda') openingBalance += amount;
        else openingBalance -= amount;
      } else if (tDate >= dateRange.startDate && tDate <= dateRange.endDate) {
        // Transaction is within period
        if (t.type === 'venda') periodIncome += amount;
        else periodExpense += amount;
      }
    });

    return {
      opening: openingBalance,
      income: periodIncome,
      expense: periodExpense,
      closing: openingBalance + periodIncome - periodExpense
    };
  };

  const balances = calculateBalances();

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Transações</h1>
            <p className="text-slate-500">Gerencie suas receitas e despesas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
            <PeriodFilter 
              onPeriodChange={setDateRange}
              mode="days"
              defaultPeriod="today"
            />
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button 
              onClick={() => setUploadOpen(true)} 
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Extrato
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="bg-primary hover:bg-primary">
                <Plus className="w-4 h-4 mr-2" /> Nova Transação
            </Button>
        </div>
      </div>

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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Buscar transações..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
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
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <Table className="pl-6">
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="pl-6">Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((t) => (
                            <TableRow key={t.id} className="hover:bg-slate-50/50 group">
                                <TableCell className="font-medium text-slate-600">
                                    {format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">{t.description}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                                        {t.category}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                        Concluído
                                    </span>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${t.type === 'venda' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'venda' ? '+' : '-'} R$ {parseFloat(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEdit(t)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(t.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-500">
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
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
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