/**
 * Helpers de fechas y horas usados en la lógica de citas.
 * Todas las operaciones trabajan en UTC para evitar problemas de zona horaria.
 */

/** Convierte un Date UTC a minutos desde medianoche (UTC) */
export const dateToUTCMinutes = (date) =>
    date.getUTCHours() * 60 + date.getUTCMinutes();

/** Convierte minutos desde medianoche a string "HH:MM" */
export const minutesToHHMM = (min) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Retorna true si dos intervalos se solapan (exclusivo en extremos) */
export const hayConflictoHorario = (inicio1, fin1, inicio2, fin2) =>
    inicio1 < fin2 && fin1 > inicio2;
