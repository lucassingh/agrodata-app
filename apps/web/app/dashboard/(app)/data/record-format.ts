/** Sin "use client" a propósito -- plano, sin JSX, reusable tanto en el Server
 *  Component (page.tsx) como en el Client Component de la tabla. */
export function formatRecordSource(source: string): string {
  return source === "WHATSAPP" ? "WhatsApp" : "Plataforma web";
}

/** Puerto de `formatRecordDescription` del legacy. Los productores reales de
 *  Records en este monorepo (Insumos, Tareas) siempre completan `data.summary`,
 *  así que las ramas legacy específicas por tipo (LLUVIA, MOVIMIENTO, etc. --
 *  strings de una versión previa a WhatsApp que ni siquiera existen en el enum
 *  `RecordType` actual) son inalcanzables acá y se omiten a propósito. Se
 *  conserva el fallback genérico por si una integración futura (Fase 4, WhatsApp
 *  + Claude) crea un Record sin `summary`. */
export function formatRecordDescription(record: { data: unknown }): string {
  const data = (record.data ?? {}) as Record<string, unknown>;

  if (typeof data.summary === "string") {
    const extras: string[] = [];
    if (data.pastures) extras.push(`en ${String(data.pastures)}`);
    if (data.animals) extras.push(String(data.animals));
    return extras.length ? `${data.summary}. ${extras.join(" · ")}` : data.summary;
  }

  const keys = Object.keys(data).slice(0, 2);
  if (keys.length === 0) return "—";
  return keys
    .map((key) => {
      const value = data[key];
      const rendered =
        value && typeof value === "object" ? JSON.stringify(value).slice(0, 40) : String(value);
      return `${key}: ${rendered}`;
    })
    .join(" · ");
}

export function usuarioLabel(
  record: { userId: string | null },
  currentUserId: string,
  currentUserName: string,
  teamMembers: { userId: string; fullName: string }[],
): string {
  if (!record.userId) return "Sistema";
  if (record.userId === currentUserId) return currentUserName || "Vos";
  const member = teamMembers.find((m) => m.userId === record.userId);
  if (member) return member.fullName;
  return `Usuario ${record.userId.slice(0, 6)}`;
}
