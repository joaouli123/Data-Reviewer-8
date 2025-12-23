import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isAfter, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DateRangeFilter({ onApply, initialStartDate, initialEndDate }) {
  const [startDate, setStartDate] = useState(initialStartDate || new Date());
  const [endDate, setEndDate] = useState(initialEndDate || new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const handleApply = () => {
    if (startDate && endDate && !isAfter(startDate, endDate)) {
      onApply({
        startDate: startOfDay(startDate),
        endDate: endOfDay(endDate),
        label: `De ${format(startDate, 'dd/MM/yyyy')} até ${format(endDate, 'dd/MM/yyyy')}`
      });
      setOpenStart(false);
      setOpenEnd(false);
    }
  };

  const isValidRange = startDate && endDate && !isAfter(startDate, endDate);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <span className="text-sm font-medium text-slate-700">Selecione o período desejado</span>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
        {/* Start Date Picker */}
        <Popover open={openStart} onOpenChange={setOpenStart}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-between text-left font-normal min-w-[160px]',
                !startDate && 'text-muted-foreground'
              )}
            >
              <span>De: {format(startDate, 'dd/MM/yyyy')}</span>
              <CalendarIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                setStartDate(date);
                // Auto-adjust end date if start date is after end date
                if (date && endDate && isAfter(date, endDate)) {
                  setEndDate(date);
                }
              }}
              disabled={(date) => endDate && isAfter(date, endDate)}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* End Date Picker */}
        <Popover open={openEnd} onOpenChange={setOpenEnd}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-between text-left font-normal min-w-[160px]',
                !endDate && 'text-muted-foreground'
              )}
            >
              <span>Até: {format(endDate, 'dd/MM/yyyy')}</span>
              <CalendarIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                setEndDate(date);
              }}
              disabled={(date) => startDate && isAfter(startDate, date)}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* Apply Button */}
        <Button
          onClick={handleApply}
          disabled={!isValidRange}
          className="bg-primary hover:bg-primary w-full sm:w-auto"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
