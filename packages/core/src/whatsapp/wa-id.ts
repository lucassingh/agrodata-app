/** Número guardado en `User.wNumber` (+54 y 10 dígitos) al `wa_id` con el que
 *  WhatsApp identifica a un celular argentino (549 y 10 dígitos). Hace falta
 *  para los mensajes que inicia el bot (el resumen semanal): las respuestas usan
 *  el `wa_id` que llega en el webhook. */
export function waIdFromWNumber(wNumber: string): string | null {
  const match = /^\+54(\d{10})$/.exec(wNumber);
  return match ? `549${match[1]}` : null;
}

/** Para un link `wa.me` a partir de un número escrito a mano (el WhatsApp de un
 *  pedido de demo: «11 5555 1234», «+54 9 11 5555 1234», «011 5555 1234»). Los
 *  celulares argentinos van con 549; si no se reconoce, los dígitos tal cual. */
export function waMeDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 13 && digits.startsWith("549")) return digits;
  if (digits.length === 12 && digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? `549${digits}` : digits;
}
