import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPIWidget({ title, value, trend, trendValue, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    secondary: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-primary">{value}</p>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-accent' : 'text-destructive'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
