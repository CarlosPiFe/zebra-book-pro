import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const MADRID_TZ = 'Europe/Madrid';

/**
 * Convierte una fecha UTC a la zona horaria de Madrid
 */
export function toMadridTime(date: Date): Date {
  return toZonedTime(date, MADRID_TZ);
}

/**
 * Convierte una fecha de la zona horaria de Madrid a UTC para guardar en BD
 */
export function fromMadridTime(date: Date): Date {
  return fromZonedTime(date, MADRID_TZ);
}

/**
 * Combina fecha y hora en zona horaria de Madrid
 */
export function combineDateTimeInMadrid(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  
  // Convertir de Madrid a UTC para guardar
  return fromMadridTime(combined);
}

/**
 * Extrae el string de hora (HH:mm) de una fecha en zona horaria de Madrid
 */
export function extractTimeInMadrid(date: Date): string {
  const madridDate = toMadridTime(date);
  const hours = madridDate.getHours().toString().padStart(2, '0');
  const minutes = madridDate.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Obtiene el inicio del día en zona horaria de Madrid (00:00:00)
 */
export function getStartOfDayInMadrid(date: Date): Date {
  const madridDate = toMadridTime(date);
  madridDate.setHours(0, 0, 0, 0);
  return fromMadridTime(madridDate);
}

/**
 * Obtiene el fin del día en zona horaria de Madrid (23:59:59)
 */
export function getEndOfDayInMadrid(date: Date): Date {
  const madridDate = toMadridTime(date);
  madridDate.setHours(23, 59, 59, 999);
  return fromMadridTime(madridDate);
}
