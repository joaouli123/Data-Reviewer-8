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
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `R$ ${formatted}`;
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

export function formatDateUTC3(date: Date | string = new Date(), formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const spTime = getSaoPauloTime();
  const offset = dateObj.getTime() - new Date().getTime();
  const adjustedTime = new Date(spTime.getTime() + offset);
  return dateFnsFormat(adjustedTime, formatStr, { locale: ptBR });
}

export function formatDateTimeUTC3(date: Date | string = new Date(), formatStr: string = 'dd/MM/yyyy HH:mm:ss'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const spTime = getSaoPauloTime();
  const offset = dateObj.getTime() - new Date().getTime();
  const adjustedTime = new Date(spTime.getTime() + offset);
  return dateFnsFormat(adjustedTime, formatStr, { locale: ptBR });
}

export function getDateNowUTC3(): Date {
  return getSaoPauloTime();
}
