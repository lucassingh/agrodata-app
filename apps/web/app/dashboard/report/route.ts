import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { z } from "zod";
import { AppError, getFieldReport, getReportLogo, logoDataUri, reportPeriod } from "@repo/core";
import { requireUser } from "@/lib/session";
import { FieldReportDocument } from "@/lib/report-pdf";

const bodySchema = z.object({
  tenantId: z.string().min(1),
  period: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("month"), month: z.string() }),
    z.object({ kind: z.literal("season"), season: z.string() }),
  ]),
  comment: z.string().max(4000, "El comentario puede tener hasta 4.000 caracteres").default(""),
});

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

/** Informe PDF de un campo para un período, con la firma de quien lo pide. */
export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const today = argentinaDay(new Date());
  const period = reportPeriod(parsed.data.period, today);
  if (!period) return Response.json({ error: "Elegí un período que no sea futuro." }, { status: 400 });

  try {
    const [report, logo] = await Promise.all([
      getFieldReport({ userId: user.id, email: user.email ?? null }, parsed.data.tenantId, period),
      getReportLogo(user.id),
    ]);
    const pdf = await renderToBuffer(
      // El componente devuelve un <Document>; el tipo de createElement no lo sabe.
      createElement(FieldReportDocument, {
        report,
        comment: parsed.data.comment,
        issuedOn: today,
        logo: logo ? logoDataUri(logo.data, logo.mimeType) : null,
      }) as ReactElement<DocumentProps>,
    );
    const filename = `informe-${slug(report.field.name)}-${slug(period.label)}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
