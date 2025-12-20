// Formatters for currency and dates
import { format as dateFnsFormat, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// São Paulo timezone offset (UTC-3)
const SAO_PAULO_OFFSET = -3;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencySimple(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  const parts = value.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intPart},${parts[1]}`;
}

export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(dateObj, formatStr, { locale: ptBR });
}

export function formatDateTime(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(dateObj, formatStr, { locale: ptBR });
}

export function getSaoPauloTime(): Date {
  const now = new Date();
  // Convert to São Paulo time (UTC-3)
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const spTime = new Date(utcTime + SAO_PAULO_OFFSET * 60 * 60 * 1000);
  return spTime;
}

export function formatMonthYear(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(dateObj, 'MMM yyyy', { locale: ptBR }).toUpperCase();
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { locale: ptBR, addSuffix: true });
}
