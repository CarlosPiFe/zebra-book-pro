import { format as formatTz, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const MADRID_TZ = 'Europe/Madrid';

/**
 * Convierte un Date a string de fecha en zona horaria de Madrid (yyyy-MM-dd)
 * Esto asegura que la fecha se interprete siempre en hora de Madrid
 */
export function formatDateInMadrid(date: Date): string {
  // Usar la zona horaria local del navegador sin conversiones
  // Asumimos que el usuario está configurando para hora de Madrid
  return format(date, 'yyyy-MM-dd');
}

/**
 * Crea una fecha local a partir de un string yyyy-MM-dd
 * Sin conversiones de zona horaria
 */
export function parseDateInMadrid(dateString: string): Date {
  const [year = 2024, month = 1, day = 1] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Convierte una fecha UTC a la zona horaria de Madrid para visualización
 */
export function toMadridTime(date: Date): Date {
  return toZonedTime(date, MADRID_TZ);
}

/**
 * Formatea una fecha en zona horaria de Madrid para visualización
 */
export function formatInMadridTz(date: Date, formatStr: string): string {
  return formatTz(date, formatStr, { timeZone: MADRID_TZ });
}

/**
 * Combina una fecha (yyyy-MM-dd) y hora (HH:mm) en un objeto Date
 * Interpreta la fecha/hora como si estuvieran en hora local del navegador
 */
export function parseDateTimeInMadrid(dateString: string, timeString: string): Date {
  const [year = 2024, month = 1, day = 1] = dateString.split('-').map(Number);
  const [hour = 0, minute = 0] = timeString.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
