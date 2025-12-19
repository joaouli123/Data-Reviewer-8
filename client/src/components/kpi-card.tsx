import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    period: string;
  };
}

export function KPICard({ label, value, icon, trend }: KPICardProps) {
  return (
    <Card className="hover-elevate border border-[#001F47]/20 bg-white dark:bg-slate-900" data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide" data-testid={`label-${label.toLowerCase()}`}>
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#001F47] dark:text-white" data-testid={`value-${label.toLowerCase()}`}>
              {value}
            </p>
            {trend && (
              <div className="mt-3 flex items-center gap-1">
                <div className="flex items-center gap-1">
                  {trend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-accent" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${trend.isPositive ? "text-accent" : "text-destructive"}`}>
                    {trend.value}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{trend.period}</span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#001F47]/10 dark:bg-[#001F47]/20" data-testid={`icon-${label.toLowerCase()}`}>
            <div className="text-[#001F47] dark:text-white">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
