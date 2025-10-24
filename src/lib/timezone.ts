// src/lib/timezone.ts
import {
  formatInTimeZone,
  toDate,
  zonedTimeToUtc,
  utcToZonedTime,
} from 'date-fns-tz';
import { startOfDay, format, getDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- NUESTRA ÚNICA FUENTE DE VERDAD ---
export const MADRID_TZ = 'Europe/Madrid';

/**
 * Obtiene la fecha/hora actual en Madrid.
 * Úsalo SIEMPRE en lugar de 'new Date()' para lógica de negocio.
 */
export function getMadridNow(): Date {
  return utcToZonedTime(new Date(), MADRID_TZ);
}

/**
 * Obtiene el inicio del día (00:00:00) de una fecha DADA en Madrid.
 * Si un usuario de NY (día 24, 21:00) selecciona el día 25 en el calendario,
 * esto nos dará "25 de Oct, 00:00:00" en Madrid.
 */
export function startOfDayInMadrid(date: Date | number): Date {
  // 1. Interpreta la fecha en la zona horaria de Madrid
  const zonedDate = utcToZonedTime(date, MADRID_TZ);
  // 2. Obtiene el inicio de ESE día en Madrid
  return startOfDay(zonedDate);
}

/**
 * [EL MÁS IMPORTANTE]
 * Convierte un objeto Date (del calendario, contaminado por el navegador)
 * en un string 'yyyy-MM-dd' QUE CORRESPONDE A ESE DÍA EN MADRID.
 *
 * Ej: Si el Date es "24 Oct 23:00" (hora de NY),
 * esto devolverá "2025-10-25" (la fecha correcta en Madrid).
 */
export function getMadridDateString(date: Date): string {
  return formatInTimeZone(date, MADRID_TZ, 'yyyy-MM-dd');
}

/**
 * [EL SEGUNDO MÁS IMPORTANTE]
 * Convierte un string 'yyyy-MM-dd' y una hora 'HH:mm'
 * en un objeto Date UTC correcto que representa ESE momento en Madrid.
 * Esto es lo que debes guardar en Supabase (en campos 'timestamp' o 'timestamptz').
 *
 * Ej: "2025-10-25" y "01:30" (de madrugada) -> objeto Date que representa la 1:30 AM del día 25 EN MADRID.
 */
export function parseDateTimeInMadrid(
  dateString: string,
  timeString: string,
): Date {
  // Crea el string ISO '2025-10-25T01:30:00'
  const isoString = `${dateString}T${timeString}:00`;
  // 1. Interpreta ese string como si YA estuviera en Madrid
  // 2. Devuelve el objeto Date UTC correspondiente
  return zonedTimeToUtc(isoString, MADRID_TZ);
}

/**
 * Obtiene el número del día de la semana EN MADRID (0=Domingo, 1=Lunes...).
 * Si un usuario de NY selecciona "Sábado", esto devolverá 6 (Sábado),
 * no 5 (Viernes, que sería su hora local).
 */
export function getDayOfWeekInMadrid(date: Date): number {
  const zonedDate = utcToZonedTime(date, MADRID_TZ);
  return getDay(zonedDate);
}

/**
 * Formatea una fecha (leída de Supabase) para mostrarla al usuario.
 * Ej: "EEEE, d 'de' MMMM" -> "sábado, 25 de octubre"
 */
export function formatForDisplay(
  date: Date | string,
  formatStr: string,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = utcToZonedTime(dateObj, MADRID_TZ);
  return format(zonedDate, formatStr, {
    locale: es,
  });
}