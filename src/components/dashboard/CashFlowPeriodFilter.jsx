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

export default function CashFlowPeriodFilter({ onPeriodChange }) {
  const [period, setPeriod] = useState('last30Days');
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const periodOptions = {
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

  // Initialize with last 30 days on first render
  useEffect(() => {
    if (!initialized) {
      const periodData = periodOptions.last30Days.getValue();
      onPeriodChange(periodData);
      setInitialized(true);
    }
  }, [initialized, onPeriodChange]);

  return (
    <div className="flex flex-col gap-4 w-full sm:w-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 no-default-hover-elevate">
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
      </div>

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
