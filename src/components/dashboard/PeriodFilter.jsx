import { useState, useEffect } from 'react';
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
import { format, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PeriodFilter({ 
  onPeriodChange, 
  mode = 'months',
  defaultPeriod = mode === 'months' ? 'last6Months' : 'today'
}) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [customLabel, setCustomLabel] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
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
  
  const currentLabel = period === 'custom' && customLabel 
    ? customLabel 
    : (periodOptions[period]?.label || 'Selecionar período');

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCustomLabel(null);
    const periodData = periodOptions[newPeriod].getValue();
    onPeriodChange(periodData);
  };

  const handleCustomApply = () => {
    if (dateRange.from && dateRange.to) {
      const start = dateRange.from;
      const end = dateRange.to;
      
      const isMonthMode = mode === 'months';
      const label = isMonthMode 
        ? `${format(start, 'MMM/yy', { locale: ptBR })} - ${format(end, 'MMM/yy', { locale: ptBR })}`
        : `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
      
      const newRange = {
        startDate: isMonthMode ? startOfMonth(start) : startOfDay(start),
        endDate: isMonthMode ? endOfMonth(end) : endOfDay(end),
        label: label
      };
      
      setPeriod('custom');
      setCustomLabel(label);
      onPeriodChange(newRange);
      setCustomOpen(false);
      setDateRange({ from: undefined, to: undefined });
    }
  };

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
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto" data-testid="button-period-filter">
            <Calendar className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto">
          {Object.entries(periodOptions).map(([key, option]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => handlePeriodChange(key)}
              className={period === key ? 'bg-accent' : ''}
              data-testid={`menu-item-${key}`}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          
          <Popover open={customOpen} onOpenChange={(open) => {
            setCustomOpen(open);
            if (open) {
              setDateRange({ from: undefined, to: undefined });
            }
          }}>
            <PopoverTrigger asChild>
              <div 
                className={`px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent ${period === 'custom' ? 'bg-accent' : ''}`}
                data-testid="menu-item-custom"
              >
                Personalizado
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" side="bottom" align="start" sideOffset={5}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Selecione o período desejado</p>
                <div className="text-sm font-medium text-foreground">
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        <span className="text-primary">{format(dateRange.from, 'dd/MM/yyyy')}</span>
                        {' até '}
                        <span className="text-primary">{format(dateRange.to, 'dd/MM/yyyy')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-primary">{format(dateRange.from, 'dd/MM/yyyy')}</span>
                        {' - Selecione a data final'}
                      </>
                    )
                  ) : (
                    'Clique na data inicial'
                  )}
                </div>
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="rounded-md border"
                />
                <Button
                  onClick={handleCustomApply}
                  disabled={!dateRange.from || !dateRange.to}
                  className="w-full"
                  data-testid="button-apply-custom"
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
