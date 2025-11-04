import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Eliminar todo excepto números y el símbolo +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si empieza con +34 (España)
  if (cleaned.startsWith('+34')) {
    const digits = cleaned.substring(3);
    // Formato: +34 XXX XXX XXX
    if (digits.length === 9) {
      return `+34 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }
  }
  
  // Si empieza con otro código de país
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    // Intentar agrupar en bloques de 3 después del código de país
    if (withoutPlus.length >= 10) {
      const countryCode = withoutPlus.substring(0, withoutPlus.length - 9);
      const remaining = withoutPlus.substring(withoutPlus.length - 9);
      return `+${countryCode} ${remaining.substring(0, 3)} ${remaining.substring(3, 6)} ${remaining.substring(6)}`;
    }
  }
  
  // Fallback: agrupar en bloques de 3
  const groups = cleaned.match(/.{1,3}/g);
  return groups ? groups.join(' ') : cleaned;
}
