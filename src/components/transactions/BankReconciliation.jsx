import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { format, parseISO, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BankReconciliation({ open, onOpenChange, statementData, transactions }) {
  const [selectedMatches, setSelectedMatches] = useState({});
  const queryClient = useQueryClient();

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  // Match statement items with existing transactions
  const matchTransactions = () => {
    const matches = {
      exact: [],
      potential: [],
      unmatched: []
    };

    statementData.forEach((stmt) => {
      const stmtDate = stmt.date;
      const stmtAmount = Math.abs(stmt.amount);

      // Find exact matches (same date, amount, and type)
      const exactMatch = transactions.find(t => 
        t.date === stmtDate &&
        Math.abs(t.amount) === stmtAmount &&
        t.type === stmt.type
      );

      if (exactMatch) {
        matches.exact.push({ statement: stmt, transaction: exactMatch });
      } else {
        // Find potential matches (same amount and type, date within 3 days)
        const potentialMatch = transactions.find(t => {
          const dateDiff = Math.abs(new Date(t.date) - new Date(stmtDate)) / (1000 * 60 * 60 * 24);
          return Math.abs(t.amount) === stmtAmount &&
                 t.type === stmt.type &&
                 dateDiff <= 3;
        });

        if (potentialMatch) {
          matches.potential.push({ statement: stmt, transaction: potentialMatch });
        } else {
          matches.unmatched.push(stmt);
        }
      }
    });

    return matches;
  };

  const matched = matchTransactions();

  const handleCreateMissing = async (statementItem) => {
    try {
      await createTransactionMutation.mutateAsync({
        description: statementItem.description,
        amount: Math.abs(statementItem.amount),
        type: statementItem.type,
        date: statementItem.date,
        status: 'completed',
        category: 'outros'
      });
      toast.success('Transação criada!');
    } catch (error) {
      toast.error('Erro ao criar transação');
    }
  };

  const handleCreateAllMissing = async () => {
    try {
      const promises = matched.unmatched.map(item => 
        createTransactionMutation.mutateAsync({
          description: item.description,
          amount: Math.abs(item.amount),
          type: item.type,
          date: item.date,
          status: 'completed',
          category: 'outros'
        })
      );
      await Promise.all(promises);
      toast.success(`${matched.unmatched.length} transações criadas!`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar transações');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conciliação Bancária</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">Correspondências Exatas</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{matched.exact.length}</p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-900">Possíveis Correspondências</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{matched.potential.length}</p>
            </div>
            
            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                <p className="text-sm font-medium text-rose-900">Não Encontradas</p>
              </div>
              <p className="text-2xl font-bold text-rose-700">{matched.unmatched.length}</p>
            </div>
          </div>

          <Tabs defaultValue="unmatched">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="exact">Exatas ({matched.exact.length})</TabsTrigger>
              <TabsTrigger value="potential">Possíveis ({matched.potential.length})</TabsTrigger>
              <TabsTrigger value="unmatched">Não Encontradas ({matched.unmatched.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="exact" className="space-y-2 mt-4">
              {matched.exact.map((match, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{match.statement.description}</p>
                      <p className="text-xs text-slate-600">
                        {format(parseISO(match.statement.date), "dd/MM/yyyy")} - 
                        R$ {Math.abs(match.statement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-700">{match.transaction.description}</p>
                        <Badge variant="outline" className="text-xs">Correspondência Exata</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {matched.exact.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nenhuma correspondência exata encontrada</p>
              )}
            </TabsContent>

            <TabsContent value="potential" className="space-y-2 mt-4">
              {matched.potential.map((match, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{match.statement.description}</p>
                      <p className="text-xs text-slate-600">
                        {format(parseISO(match.statement.date), "dd/MM/yyyy")} - 
                        R$ {Math.abs(match.statement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-amber-700">{match.transaction.description}</p>
                        <p className="text-xs text-slate-600">
                          {format(parseISO(match.transaction.date), "dd/MM/yyyy")}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">Possível Correspondência</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {matched.potential.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nenhuma correspondência potencial encontrada</p>
              )}
            </TabsContent>

            <TabsContent value="unmatched" className="space-y-2 mt-4">
              {matched.unmatched.length > 0 && (
                <div className="mb-4">
                  <Button
                    onClick={handleCreateAllMissing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Todas as {matched.unmatched.length} Transações
                  </Button>
                </div>
              )}
              
              {matched.unmatched.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {item.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span>{format(parseISO(item.date), "dd/MM/yyyy")}</span>
                        <span className="font-semibold">
                          R$ {Math.abs(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge variant={item.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                          {item.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCreateMissing(item)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Criar
                  </Button>
                </div>
              ))}
              {matched.unmatched.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p className="text-slate-700 font-medium">Tudo conciliado!</p>
                  <p className="text-sm text-slate-500">Todas as transações do extrato foram encontradas no sistema.</p>
                </div>
              )}
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