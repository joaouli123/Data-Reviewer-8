import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, DollarSign, Users, TrendingUp, FileText, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TransactionForm from '../transactions/TransactionForm';
import BankStatementUpload from '../transactions/BankStatementUpload';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickActionsWidget() {
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTransactionFormOpen(false);
      toast.success('Transação criada!');
    }
  });

  const handleTransactionSubmit = (data) => {
    createTransactionMutation.mutate(data);
  };

  const handleStatementExtracted = (data) => {
    toast.success(`${data.length} transações extraídas!`);
    setUploadOpen(false);
  };

  const actions = [
    {
      label: 'Nova Transação',
      icon: Plus,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: () => setTransactionFormOpen(true)
    },
    {
      label: 'Importar Extrato',
      icon: Upload,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      onClick: () => setUploadOpen(true)
    },
    {
      label: 'Ver Transações',
      icon: DollarSign,
      color: 'bg-blue-600 hover:bg-blue-700',
      link: createPageUrl('transactions')
    },
    {
      label: 'Clientes',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      link: createPageUrl('customers')
    },
    {
      label: 'Fluxo de Caixa',
      icon: TrendingUp,
      color: 'bg-amber-600 hover:bg-amber-700',
      link: createPageUrl('cashflowforecast')
    },
    {
      label: 'IA Analista',
      icon: FileText,
      color: 'bg-rose-600 hover:bg-rose-700',
      link: createPageUrl('reports')
    },
    {
      label: 'Calc. Preços',
      icon: Calculator,
      color: 'bg-teal-600 hover:bg-teal-700',
      link: createPageUrl('pricingcalculator')
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => {
          const ButtonContent = (
            <>
              <action.icon className="w-5 h-5 mb-2" />
              <span className="text-sm font-medium">{action.label}</span>
            </>
          );

          if (action.link) {
            return (
              <Link key={action.label} to={action.link}>
                <Button
                  className={`w-full h-24 flex flex-col items-center justify-center text-white ${action.color}`}
                >
                  {ButtonContent}
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              className={`w-full h-24 flex flex-col items-center justify-center text-white ${action.color}`}
            >
              {ButtonContent}
            </Button>
          );
        })}
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