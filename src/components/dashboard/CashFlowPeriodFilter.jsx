import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CashFlowPeriodFilter({ onPeriodChange, minDate = new Date('2000-01-01'), maxDate = new Date('2099-12-31') }) {
  const [period, setPeriod] = useState('allTime');
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const periodOptions = {
    allTime: {
      label: 'Todo período',
      getValue: () => {
        return { 
          startDate: minDate, 
          endDate: maxDate,
          label: 'Todo período' 
        };
      }
    },
    today: {
      label: 'Hoje',
      getValue: () => {
        const now = new Date();
        return { 
          startDate: startOfDay(now), 
          endDate: endOfDay(now),
          label: 'Hoje' 
        };
      }
    },
    last7Days: {
      label: 'Últimos 7 dias',
      getValue: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(new Date(), 6));
        return { startDate: start, endDate: end, label: 'Últimos 7 dias' };
      }
    },
    last30Days: {
      label: 'Últimos 30 dias',
      getValue: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(new Date(), 29));
        return { startDate: start, endDate: end, label: 'Últimos 30 dias' };
      }
    },
    last3Months: {
      label: 'Últimos 3 meses',
      getValue: () => {
        const end = endOfMonth(new Date());
        const start = startOfMonth(subMonths(new Date(), 2));
        return { startDate: start, endDate: end, label: 'Últimos 3 meses' };
      }
    },
    last6Months: {
      label: 'Últimos 6 meses',
      getValue: () => {
        const end = endOfMonth(new Date());
        const start = startOfMonth(subMonths(new Date(), 5));
        return { startDate: start, endDate: end, label: 'Últimos 6 meses' };
      }
    }
  };

  const currentLabel = periodOptions[period]?.label || 'Selecionar período';

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    const periodData = periodOptions[newPeriod].getValue();
    onPeriodChange(periodData);
  };

  const handleCustom = () => {
    if (customStart && customEnd) {
      const newRange = {
        startDate: startOfDay(customStart),
        endDate: endOfDay(customEnd),
        label: `${format(customStart, 'dd/MM/yyyy')} - ${format(customEnd, 'dd/MM/yyyy')}`
      };
      setPeriod('custom');
      onPeriodChange(newRange);
      setCustomOpen(false);
    }
  };

  // Initialize with all time on first render
  useEffect(() => {
    if (!initialized) {
      const periodData = periodOptions.allTime.getValue();
      onPeriodChange(periodData);
      setInitialized(true);
    }
  }, [initialized, onPeriodChange]);

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto">
            <Calendar className="w-4 h-4" />
            {currentLabel}
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto">
          {Object.entries(periodOptions).map(([key, option]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => handlePeriodChange(key)}
              className={period === key ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          
          <Popover open={customOpen} onOpenChange={(open) => {
            setCustomOpen(open);
            if (open) {
              setCustomStart(null);
              setCustomEnd(null);
            }
          }}>
            <PopoverTrigger asChild>
              <div className="px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent">
                Personalizado
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 max-w-[95vw]" side="bottom" align="start">
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Selecione o período desejado</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-2">
                      De: <span className="text-primary">{customStart ? format(customStart, 'dd/MM/yyyy') : 'Selecione'}</span>
                    </p>
                    <CalendarComponent
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className="rounded-md border"
                      initialFocus
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-2">
                      Até: <span className="text-primary">{customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Selecione'}</span>
                    </p>
                    <CalendarComponent
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                {customStart && customEnd && customStart > customEnd && (
                  <p className="text-sm text-red-500">Data inicial não pode ser maior que a final</p>
                )}
                <Button
                  onClick={handleCustom}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  className="w-full bg-primary text-primary-foreground no-default-hover-elevate"
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
