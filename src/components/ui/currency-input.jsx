import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

// Format number to Brazilian currency format (1.234,56)
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse Brazilian currency format to number
export function parseCurrency(value) {
  if (!value || value === '') return 0;
  const cleanValue = value.toString().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Format as user types (cents to currency)
function formatAsCurrency(rawValue) {
  if (!rawValue || rawValue === '') return '';
  
  // Remove any non-digit characters
  const digits = rawValue.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Convert to cents then to decimal
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CurrencyInput = forwardRef(({ 
  value, 
  onChange, 
  placeholder = "0,00",
  className = "",
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');

  // Initialize display value from prop value
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const numValue = typeof value === 'number' ? value : parseCurrency(value);
      if (numValue > 0) {
        setDisplayValue(formatCurrency(numValue));
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Update display when value prop changes externally (e.g., form reset)
  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Format the display value
    const formatted = formatAsCurrency(inputValue);
    setDisplayValue(formatted);
    
    // Parse to number and call onChange
    const numericValue = parseCurrency(formatted);
    
    if (onChange) {
      // Create a synthetic event with the numeric value
      onChange({
        ...e,
        target: {
          ...e.target,
          value: numericValue
        }
      });
    }
  };

  const handleFocus = (e) => {
    // Select all on focus for easy editing
    e.target.select();
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
});

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
