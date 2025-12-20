import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPIWidget({ title, value, trend, trendValue, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className="ml-3 text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-primary' : 'text-muted-foreground'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
