import { format, isValid, parseISO } from 'date-fns';

export function formatCurrency(amount: number | string, currency = 'usd'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value);
}

export function formatDateTime(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

export function formatDateShort(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, 'MMM d, yyyy');
}

export function formatServiceType(serviceType: string): string {
  return serviceType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatVehicleType(vehicleType: string): string {
  return formatServiceType(vehicleType);
}
