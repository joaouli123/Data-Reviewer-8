import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Plus, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function BankReconciliation({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("unmatched");
  const [lastFileName, setLastFileName] = useState(localStorage.getItem('lastBankStatementFile'));

  // Fetch categories to use as default
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Falha ao carregar categorias');
      return res.json();
    }
  });

  // Fetch bank statement items
  const { data: bankItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/bank/items'],
    queryFn: async () => {
      const res = await fetch('/api/bank/items');
      if (!res.ok) throw new Error('Falha ao carregar itens');
      return res.json();
    },
    enabled: open
  });

  // Fetch potential matches for a selected item
  const [selectedBankItemId, setSelectedBankItemId] = useState(null);
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['/api/bank/suggest', selectedBankItemId],
    queryFn: async () => {
      if (!selectedBankItemId) return [];
      const res = await fetch(`/api/bank/suggest/${selectedBankItemId}`);
      if (!res.ok) throw new Error('Falha ao carregar sugestões');
      return res.json();
    },
    enabled: !!selectedBankItemId
  });

  const matchMutation = useMutation({
    mutationFn: async ({ bankItemId, transactionId }) => {
      const res = await fetch('/api/bank/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankItemId, transactionId })
      });
      if (!res.ok) throw new Error('Falha ao conciliar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      toast.success('Conciliação realizada com sucesso!');
      setSelectedBankItemId(null);
      setActiveTab("unmatched");
    },
    onError: () => {
      toast.error('Erro ao realizar conciliação');
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (item) => {
      const defaultCategory = categories.length > 0 ? categories[0].id : null;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: item.description,
          amount: Math.abs(parseFloat(item.amount)),
          type: parseFloat(item.amount) > 0 ? 'income' : 'expense',
          date: item.date,
          status: 'completed',
          categoryId: defaultCategory
        })
      });
      if (!res.ok) throw new Error('Erro ao criar transação');
      const transaction = await res.json();
      
      // Auto-match after creation
      return matchMutation.mutateAsync({ 
        bankItemId: item.id, 
        transactionId: transaction.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
    }
  });

  const clearBankDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bank/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Erro ao limpar dados bancários');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      localStorage.removeItem('lastBankStatementFile');
      setLastFileName(null);
      toast.success('Dados bancários removidos com sucesso');
    },
    onError: () => {
      toast.error('Erro ao remover dados bancários');
    }
  });

  const pendingItems = bankItems.filter(item => item.status === 'PENDING');
  const reconciledItems = bankItems.filter(item => item.status === 'RECONCILED');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conciliação Bancária</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {lastFileName && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Último arquivo carregado</p>
                <p className="text-sm font-medium text-blue-900" data-testid="text-last-file">{lastFileName}</p>
              </div>
              <Button 
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => clearBankDataMutation.mutate()}
                disabled={clearBankDataMutation.isPending}
                data-testid="button-clear-file"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-900">Pendentes</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{pendingItems.length}</p>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">Conciliados</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{reconciledItems.length}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unmatched">Pendentes ({pendingItems.length})</TabsTrigger>
              <TabsTrigger value="reconciled">Conciliados ({reconciledItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="unmatched" className="space-y-4 mt-4">
              {isLoadingItems ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : pendingItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum item pendente</div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded-lg border space-y-3" data-testid={`card-pending-${item.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          parseFloat(item.amount) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {parseFloat(item.amount) > 0 ? '+' : '-'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900" data-testid={`text-description-${item.id}`}>{item.description}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span data-testid={`text-date-${item.id}`}>{format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                            <span className="font-semibold" data-testid={`text-amount-${item.id}`}>
                              R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1" data-testid={`status-pending-${item.id}`}>
                          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                          <span className="text-xs font-medium text-rose-600">Pendente</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedBankItemId(selectedBankItemId === item.id ? null : item.id)}
                        >
                          {selectedBankItemId === item.id ? 'Fechar' : 'Buscar Match'}
                        </Button>
                        <Button 
                          size="sm"
                          disabled={createTransactionMutation.isPending}
                          onClick={() => createTransactionMutation.mutate(item)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Criar Transação
                        </Button>
                      </div>
                    </div>

                    {selectedBankItemId === item.id && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                        <h4 className="text-sm font-semibold mb-2">Sugestões do Sistema:</h4>
                        {isLoadingSuggestions ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : suggestions.length === 0 ? (
                          <p className="text-xs text-slate-500">Nenhuma transação similar encontrada.</p>
                        ) : (
                          <div className="space-y-2">
                            {suggestions.map((t) => (
                              <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                                <div>
                                  <p className="font-medium">{t.description}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(t.date), "dd/MM/yyyy")} - R$ {Math.abs(parseFloat(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-emerald-600"
                                  onClick={() => matchMutation.mutate({ bankItemId: item.id, transactionId: t.id })}
                                >
                                  Conciliar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="reconciled" className="space-y-2 mt-4">
              {reconciledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200" data-testid={`card-reconciled-${item.id}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.description}</p>
                    <p className="text-xs text-slate-600">
                      {format(new Date(item.date), "dd/MM/yyyy")} - 
                      R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Conciliado</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}