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
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DateFilter({ onDateRangeChange }) {
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Últimos 30 dias'
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const handlePreset = (days, label) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days));
    const newRange = { startDate: start, endDate: end, label };
    setDateRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleCustom = () => {
    if (customStart && customEnd) {
      const newRange = {
        startDate: startOfDay(customStart),
        endDate: endOfDay(customEnd),
        label: `${format(customStart, 'dd/MM/yyyy', { locale: ptBR })} - ${format(customEnd, 'dd/MM/yyyy', { locale: ptBR })}`
      };
      setDateRange(newRange);
      onDateRangeChange(newRange);
      setCustomOpen(false);
    }
  };

  // Initialize with default on first render
  useEffect(() => {
    if (!initialized) {
      onDateRangeChange(dateRange);
      setInitialized(true);
    }
  }, [initialized, onDateRangeChange, dateRange]);

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 no-default-hover-elevate w-full sm:w-auto">
            <Calendar className="w-4 h-4" />
            {dateRange.label}
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => handlePreset(0, 'Hoje')}>
            Hoje
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePreset(6, 'Últimos 7 dias')}>
            Últimos 7 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePreset(29, 'Últimos 30 dias')}>
            Últimos 30 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePreset(89, 'Últimos 90 dias')}>
            Últimos 90 dias
          </DropdownMenuItem>
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
            <div>
              <p className="text-sm font-medium text-foreground mb-2">De:</p>
              <CalendarComponent
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                disabled={(date) => customEnd && date > customEnd}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Até:</p>
              <CalendarComponent
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                disabled={(date) => customStart && date < customStart}
              />
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
