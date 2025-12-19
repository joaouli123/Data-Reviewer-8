import React, { useState } from 'react';
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
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
    label: 'Hoje'
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

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

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
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
          
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <div className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                Personalizado
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
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
                <Button
                  onClick={handleCustom}
                  disabled={!customStart || !customEnd}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
