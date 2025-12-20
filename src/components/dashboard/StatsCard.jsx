import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function StatsCard({ title, value, trend, trendValue, icon: Icon, type = "neutral" }) {
  const colors = {
    positive: "text-emerald-600",
    negative: "text-rose-600",
    neutral: "text-blue-600",
    warning: "text-amber-600"
  };

  const bgColors = {
    positive: "bg-emerald-50",
    negative: "bg-rose-50",
    neutral: "bg-blue-50",
    warning: "bg-amber-50"
  };

  const trendColors = {
    up: "text-emerald-600",
    down: "text-rose-600",
    flat: "text-slate-500"
  };

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColors[type]}`}>
          <Icon className={`h-4 w-4 ${colors[type]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {trendValue && (
          <div className={`flex items-center text-xs mt-1 ${trendColors[trend]}`}>
            <TrendIcon className="h-3 w-3 mr-1" />
            <span className="font-medium">{trendValue}</span>
            <span className="text-slate-400 ml-1">vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}