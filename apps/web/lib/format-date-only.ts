/** Formatea un campo "solo fecha" (sin hora significativa, como `deadline` de
 *  Tareas o `date` de Gastos). Estos campos se guardan como medianoche UTC a
 *  partir de un `<input type="date">` -- sin forzar `timeZone: "UTC"` acá,
 *  `toLocaleDateString` los muestra en el huso horario local del navegador/
 *  servidor (ej. America/Argentina/Buenos_Aires, UTC-3), corriendo la fecha
 *  visible un día para atrás. Forzar UTC cancela ese desfase. */
export function formatDateOnly(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("es-AR", { ...options, timeZone: "UTC" });
}
