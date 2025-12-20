import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, DollarSign, Users, TrendingUp, FileText, Calculator, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import TransactionForm from '../transactions/TransactionForm';
import BankStatementUpload from '../transactions/BankStatementUpload';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@/api/entities';
import { toast } from 'sonner';

export default function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const createTransactionMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTransactionFormOpen(false);
      toast.success('Transação criada!');
    },
    onError: (error) => {
      console.error('Transaction mutation failed:', error);
      toast.error(`Erro ao criar transação: ${error.message}`);
    }
  });

  const handleTransactionSubmit = (data) => {
    createTransactionMutation.mutate(data);
  };

  const handleStatementExtracted = (data) => {
    toast.success(`${data.length} transações extraídas!`);
    setUploadOpen(false);
  };

  // Fechar ao clicar em um item
  const handleActionClick = (callback) => {
    if (callback) callback();
    setIsOpen(false);
  };

  const actions = [
    {
      label: 'Nova Transação',
      icon: Plus,
      onClick: () => setTransactionFormOpen(true)
    },
    {
      label: 'Importar Extrato',
      icon: Upload,
      onClick: () => setUploadOpen(true)
    },
    {
      label: 'Ver Transações',
      icon: DollarSign,
      link: '/transactions'
    },
    {
      label: 'Clientes',
      icon: Users,
      link: '/customers'
    },
    {
      label: 'Fluxo de Caixa',
      icon: TrendingUp,
      link: '/cashflowforecast'
    },
    {
      label: 'IA Analista',
      icon: FileText,
      link: '/reports'
    },
    {
      label: 'Calc. Preços',
      icon: Calculator,
      link: '/pricingcalculator'
    }
  ];

  return (
    <>
      <div className="fixed bottom-8 right-8 z-40">
        <div className="relative">
          {/* Menu Expandido com Animação */}
          <div
            className={`absolute bottom-20 right-0 origin-bottom-right transition-all duration-300 ease-out transform ${
              isOpen
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-border overflow-hidden min-w-56">
              <div className="space-y-1 p-2">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  
                  if (action.link) {
                    return (
                      <Link
                        key={action.label}
                        to={action.link}
                        onClick={() => handleActionClick()}
                      >
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-all duration-200 text-left hover:translate-x-1 whitespace-nowrap"
                          style={{
                            transitionDelay: isOpen ? `${index * 30}ms` : '0ms'
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
                          <span className="text-sm font-medium text-foreground">{action.label}</span>
                        </button>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={action.label}
                      onClick={() => handleActionClick(action.onClick)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 text-left hover:translate-x-1 whitespace-nowrap"
                      style={{
                        transitionDelay: isOpen ? `${index * 30}ms` : '0ms'
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
                      <span className="text-sm font-medium text-foreground">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Overlay para fechar ao clicar fora */}
          {isOpen && (
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Botão FAB com Animação */}
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-quick-actions-fab"
          >
            <Plus
              className={`w-6 h-6 transition-transform duration-300 ${
                isOpen ? 'rotate-45' : 'rotate-0'
              }`}
            />
          </Button>
        </div>
      </div>

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={setTransactionFormOpen}
        onSubmit={handleTransactionSubmit}
      />

      <BankStatementUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onExtracted={handleStatementExtracted}
      />
    </>
  );
}
