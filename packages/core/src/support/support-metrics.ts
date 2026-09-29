/** Métricas de producto del panel de soporte (Etapa 6.2), por semana (de lunes a
 *  domingo, días argentinos). Se calculan de nuestra propia base. Puro: se
 *  testea sin base. */

const DAY_MS = 86_400_000;
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day: string) => Date.parse(`${day}T12:00:00Z`);
const addDays = (day: string, days: number) => toDay(dayMs(day) + days * DAY_MS);

/** El lunes de la semana de `day`. */
export function weekStart(day: string): string {
  const weekday = new Date(dayMs(day)).getUTCDay(); // 0 domingo … 6 sábado
  return addDays(day, -((weekday + 6) % 7));
}

/** Los lunes de las últimas `count` semanas, de la más vieja a la actual. */
export function lastWeeks(today: string, count: number): string[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
}

/** Un campo se activa si en su primera semana tiene potreros y un primer dato. */
export const ACTIVATION_DAYS = 7;

export interface MetricsInput {
  weeks: string[];
  /** Día argentino de alta de cada usuario. */
  users: { createdDay: string }[];
  fields: { createdDay: string; firstPastureDay: string | null; firstRecordDay: string | null }[];
  records: { createdDay: string; tenantId: string; fromWhatsApp: boolean; edited: boolean }[];
}

export interface WeekMetrics {
  week: string;
  newUsers: number;
  newFields: number;
  /** De los campos creados esa semana, cuántos se activaron. */
  activatedFields: number;
  whatsappRecords: number;
  webRecords: number;
  /** De los registros de WhatsApp de esa semana, cuántos se corrigieron a mano. */
  whatsappEdited: number;
  /** Porcentaje corregido (null sin registros de WhatsApp). */
  editedPct: number | null;
  /** Campos con al menos un registro esa semana. */
  activeFields: number;
}

const activated = (field: MetricsInput["fields"][number]) => {
  const limit = addDays(field.createdDay, ACTIVATION_DAYS);
  return field.firstPastureDay !== null && field.firstRecordDay !== null && field.firstPastureDay <= limit && field.firstRecordDay <= limit;
};

export function weeklyMetrics(input: MetricsInput): WeekMetrics[] {
  return input.weeks.map((week) => {
    const end = addDays(week, 6);
    const inWeek = (day: string) => day >= week && day <= end;
    const fields = input.fields.filter((f) => inWeek(f.createdDay));
    const records = input.records.filter((r) => inWeek(r.createdDay));
    const whatsapp = records.filter((r) => r.fromWhatsApp);
    const edited = whatsapp.filter((r) => r.edited).length;
    return {
      week,
      newUsers: input.users.filter((u) => inWeek(u.createdDay)).length,
      newFields: fields.length,
      activatedFields: fields.filter(activated).length,
      whatsappRecords: whatsapp.length,
      webRecords: records.length - whatsapp.length,
      whatsappEdited: edited,
      editedPct: whatsapp.length > 0 ? Math.round((edited / whatsapp.length) * 100) : null,
      activeFields: new Set(records.map((r) => r.tenantId)).size,
    };
  });
}
