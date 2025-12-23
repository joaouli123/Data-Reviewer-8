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
import { format, addMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CashFlowPeriodFilter({ onPeriodChange, minDate = null, maxDate = null }) {
  const [period, setPeriod] = useState('allTime');
  const [customLabel, setCustomLabel] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [initialized, setInitialized] = useState(false);

  // Use provided minDate/maxDate or default to smart calculation
  const getDefaultStart = () => {
    if (minDate) return new Date(minDate);
    const today = new Date();
    today.setMonth(today.getMonth() - 3); // Default to 3 months back
    return today;
  };

  const getDefaultEnd = () => {
    if (maxDate) return addMonths(new Date(maxDate), 12);
    return addMonths(new Date(), 12); // 12 months forward
  };

  const periodOptions = {
    allTime: {
      label: 'Todo o Período',
      getValue: () => {
        const start = getDefaultStart();
        const end = getDefaultEnd();
        return { startDate: start, endDate: end, label: 'Todo o Período' };
      }
    },
    next30Days: {
      label: 'Próximos 30 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T00:00:00');
        const futureStr = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
        const future = new Date(futureStr + 'T23:59:59');
        return { startDate: today, endDate: future, label: 'Próximos 30 dias' };
      }
    },
    next60Days: {
      label: 'Próximos 60 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T00:00:00');
        const futureStr = new Date(new Date().setDate(new Date().getDate() + 60)).toISOString().split('T')[0];
        const future = new Date(futureStr + 'T23:59:59');
        return { startDate: today, endDate: future, label: 'Próximos 60 dias' };
      }
    },
    next90Days: {
      label: 'Próximos 90 dias',
      getValue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr + 'T00:00:00');
        const futureStr = new Date(new Date().setDate(new Date().getDate() + 90)).toISOString().split('T')[0];
        const future = new Date(futureStr + 'T23:59:59');
        return { startDate: today, endDate: future, label: 'Próximos 90 dias' };
      }
    }
  };

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
      
      const label = `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
      
      const newRange = {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
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
      const periodData = periodOptions.allTime.getValue();
      onPeriodChange(periodData);
      setInitialized(true);
    }
  }, [initialized, onPeriodChange]);

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto" data-testid="button-cashflow-period-filter">
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
              data-testid={`cashflow-menu-item-${key}`}
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
                data-testid="cashflow-menu-item-custom"
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
                  data-testid="button-apply-cashflow-custom"
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
