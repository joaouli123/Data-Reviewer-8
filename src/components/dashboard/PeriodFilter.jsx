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

export default function PeriodFilter({ 
  onPeriodChange, 
  mode = 'months', // 'days' ou 'months'
  defaultPeriod = mode === 'months' ? 'last6Months' : 'today'
}) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const periodOptionsMonths = {
    last3Months: {
      label: 'Últimos 3 Meses',
      getValue: () => {
        const end = endOfMonth(new Date());
        const start = startOfMonth(subMonths(new Date(), 2));
        return { startDate: start, endDate: end, label: 'Últimos 3 Meses' };
      }
    },
    last6Months: {
      label: 'Últimos 6 Meses',
      getValue: () => {
        const end = endOfMonth(new Date());
        const start = startOfMonth(subMonths(new Date(), 5));
        return { startDate: start, endDate: end, label: 'Últimos 6 Meses' };
      }
    },
    lastYear: {
      label: 'Último Ano',
      getValue: () => {
        const end = endOfMonth(new Date());
        const start = startOfMonth(subMonths(new Date(), 11));
        return { startDate: start, endDate: end, label: 'Último Ano' };
      }
    },
    all: {
      label: 'Todo o Período',
      getValue: () => ({ 
        startDate: new Date('2000-01-01'), 
        endDate: endOfMonth(new Date()),
        label: 'Todo o Período' 
      })
    }
  };

  const periodOptionsDays = {
    today: {
      label: 'Hoje',
      getValue: () => {
        // Use UTC normalization to avoid timezone issues
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T00:00:00Z');
        return { 
          startDate: today, 
          endDate: new Date(todayStr + 'T23:59:59Z'),
          label: 'Hoje' 
        };
      }
    },
    last7Days: {
      label: 'Últimos 7 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T23:59:59Z');
        const sevenDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0];
        const sevenDaysAgo = new Date(sevenDaysAgoStr + 'T00:00:00Z');
        return { startDate: sevenDaysAgo, endDate: today, label: 'Últimos 7 dias' };
      }
    },
    last30Days: {
      label: 'Últimos 30 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T23:59:59Z');
        const thirtyDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(thirtyDaysAgoStr + 'T00:00:00Z');
        return { startDate: thirtyDaysAgo, endDate: today, label: 'Últimos 30 dias' };
      }
    },
    last90Days: {
      label: 'Últimos 90 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T23:59:59Z');
        const ninetyDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 89)).toISOString().split('T')[0];
        const ninetyDaysAgo = new Date(ninetyDaysAgoStr + 'T00:00:00Z');
        return { startDate: ninetyDaysAgo, endDate: today, label: 'Últimos 90 dias' };
      }
    }
  };

  const periodOptions = mode === 'months' ? periodOptionsMonths : periodOptionsDays;
  const currentLabel = periodOptions[period]?.label || 'Selecionar período';

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    const periodData = periodOptions[newPeriod].getValue();
    onPeriodChange(periodData);
  };

  const handleCustom = () => {
    if (customStart && customEnd) {
      // Ensure startDate <= endDate
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start > end) {
        alert('Data inicial não pode ser maior que a data final');
        return;
      }
      
      const isMonthMode = mode === 'months';
      const newRange = {
        startDate: isMonthMode ? startOfMonth(start) : startOfDay(start),
        endDate: isMonthMode ? endOfMonth(end) : endOfDay(end),
        label: isMonthMode 
          ? `${format(start, 'MMM/yy', { locale: ptBR })} - ${format(end, 'MMM/yy', { locale: ptBR })}`
          : `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`
      };
      setPeriod('custom');
      onPeriodChange(newRange);
      setCustomOpen(false);
      // Reset custom dates after applying
      setCustomStart(null);
      setCustomEnd(null);
    }
  };

  // Initialize with default period on first render
  useEffect(() => {
    if (!initialized) {
      const periodData = periodOptions[defaultPeriod].getValue();
      onPeriodChange(periodData);
      setInitialized(true);
    }
  }, [initialized, defaultPeriod, onPeriodChange, periodOptions]);

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
