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
    last90Days: {
      label: 'Últimos 90 dias',
      getValue: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(new Date(), 89));
        return { startDate: start, endDate: end, label: 'Últimos 90 dias' };
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
      const isMonthMode = mode === 'months';
      const newRange = {
        startDate: isMonthMode ? startOfMonth(customStart) : startOfDay(customStart),
        endDate: isMonthMode ? endOfMonth(customEnd) : endOfDay(customEnd),
        label: isMonthMode 
          ? `${format(customStart, 'MMM/yy', { locale: ptBR })} - ${format(customEnd, 'MMM/yy', { locale: ptBR })}`
          : `${format(customStart, 'dd/MM/yyyy')} - ${format(customEnd, 'dd/MM/yyyy')}`
      };
      setPeriod('custom');
      onPeriodChange(newRange);
      setCustomOpen(false);
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
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto">
            <Calendar className="w-4 h-4" />
            {currentLabel}
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {Object.entries(periodOptions).map(([key, option]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => handlePeriodChange(key)}
              className={period === key ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto">
            Personalizado
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4">
          <div className="space-y-4">
            <div className="flex flex-row gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">De:</p>
                <CalendarComponent
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Até:</p>
                <CalendarComponent
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                />
              </div>
            </div>
            <Button
              onClick={handleCustom}
              disabled={!customStart || !customEnd}
              className="w-full bg-primary text-primary-foreground no-default-hover-elevate"
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
