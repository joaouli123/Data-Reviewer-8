import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from "@/lib/utils";

export default function KPIWidget({ title, value, trend, trendValue, icon: Icon, className, onClick }) {
  return (
    <div 
      className={cn(
        "bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground tracking-wider mb-1">{title}</p>
          <p className={cn("text-2xl font-bold text-foreground", className)}>{value}</p>
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
          {onClick && <span className="ml-1 text-muted-foreground">(clique para ver)</span>}
        </div>
      )}
    </div>
  );
}
