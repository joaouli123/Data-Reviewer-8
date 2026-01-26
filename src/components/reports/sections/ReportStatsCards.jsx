import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function ReportStatsCards({ balances }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="hover-elevate">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
            <h3 className="text-xl font-bold">R$ {balances.opening.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg"><Wallet className="w-5 h-5 text-slate-600" /></div>
        </CardContent>
      </Card>
      <Card className="hover-elevate">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600">Entradas</p>
            <h3 className="text-xl font-bold text-emerald-600">+ R$ {balances.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-2 bg-emerald-100 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
        </CardContent>
      </Card>
      <Card className="hover-elevate">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-rose-600">Saídas</p>
            <h3 className="text-xl font-bold text-rose-600">- R$ {balances.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-2 bg-rose-100 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-600" /></div>
        </CardContent>
      </Card>
      <Card className={balances.closing >= 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Saldo Final</p>
            <h3 className="text-xl font-bold">R$ {balances.closing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-2 bg-white/20 rounded-lg"><Wallet className="w-5 h-5" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
