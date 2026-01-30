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

  const buildDayRange = (daysAgoStart) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - daysAgoStart);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  };

  const periodOptionsDays = {
    today: {
      label: 'Hoje',
      getValue: () => ({
        ...buildDayRange(0),
        label: 'Hoje'
      })
    },
    last7Days: {
      label: 'Últimos 7 dias',
      getValue: () => ({
        ...buildDayRange(6),
        label: 'Últimos 7 dias'
      })
    },
    last30Days: {
      label: 'Últimos 30 dias',
      getValue: () => ({
        ...buildDayRange(29),
        label: 'Últimos 30 dias'
      })
    },
    last90Days: {
      label: 'Últimos 90 dias',
      getValue: () => ({
        ...buildDayRange(89),
        label: 'Últimos 90 dias'
      })
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
    onPeriodChange({...periodData}); // Ensure a new object is passed to trigger state update
  };

  const handleCustomApply = () => {
    if (dateRange.from && dateRange.to) {
      const start = dateRange.from;
      const end = dateRange.to;
      
      const isMonthMode = mode === 'months';
      const label = isMonthMode 
        ? `${format(start, 'MMM/yy', { locale: ptBR })} - ${format(end, 'MMM/yy', { locale: ptBR })}`
        : `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
      
      let newRange;
      if (isMonthMode) {
        newRange = {
          startDate: startOfMonth(start),
          endDate: endOfMonth(end),
          label: label
        };
      } else {
        newRange = {
          startDate: startOfDay(start),
          endDate: endOfDay(end),
          label: label
        };
      }
      
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
            <PopoverContent
              className={`w-auto p-3 ${mode === 'months' ? 'max-w-[720px]' : 'max-w-[360px]'}`}
              side="bottom"
              align="start"
              sideOffset={5}
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Selecione o período desejado</p>
                <div className="text-sm font-medium text-foreground">
                  {dateRange?.from ? (
                    dateRange?.to ? (
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
                <div className="overflow-x-auto">
                  <CalendarComponent
                    mode="range"
                    selected={(dateRange?.from || dateRange?.to) ? dateRange : undefined}
                    onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={mode === 'months' ? 2 : 1}
                    locale={ptBR}
                    className="rounded-md border"
                    classNames={{
                      day: "h-9 w-9 p-0 font-medium text-slate-700 hover:bg-primary/80 hover:text-white focus-visible:ring-2 focus-visible:ring-primary",
                      day_selected: "bg-primary text-white font-semibold hover:bg-primary hover:text-white",
                      day_range_start: "bg-primary text-white font-semibold rounded-l-md",
                      day_range_end: "bg-primary text-white font-semibold rounded-r-md",
                      day_range_middle: "bg-primary/15 text-primary-700 dark:text-primary-200",
                      day_outside: "text-slate-400 opacity-60 hover:bg-primary/30 hover:text-white",
                      day_today: "border border-primary/40 text-primary font-semibold",
                    }}
                  />
                </div>
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
