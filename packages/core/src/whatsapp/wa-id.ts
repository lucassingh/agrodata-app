/** Número guardado en `User.wNumber` (+54 y 10 dígitos) al `wa_id` con el que
 *  WhatsApp identifica a un celular argentino (549 y 10 dígitos). Hace falta
 *  para los mensajes que inicia el bot (el resumen semanal): las respuestas usan
 *  el `wa_id` que llega en el webhook. */
export function waIdFromWNumber(wNumber: string): string | null {
  const match = /^\+54(\d{10})$/.exec(wNumber);
  return match ? `549${match[1]}` : null;
}
