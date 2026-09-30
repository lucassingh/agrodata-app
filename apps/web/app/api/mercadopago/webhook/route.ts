import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature, syncMercadoPagoPayment } from "@repo/core";
import { paymentsEnabled } from "@/lib/payments";

/**
 * Aviso de pago de Mercado Pago (Webhooks). Hace falta para los pagos que se
 * acreditan después (efectivo) o si la persona no vuelve al sitio. Nunca se confía
 * en el contenido: se trae el pago de la API de Mercado Pago. Con
 * `MERCADOPAGO_WEBHOOK_SECRET` se verifica además la firma. Responde 200 rápido
 * (Mercado Pago reintenta si no); un error al consultar devuelve 500 para que reintente.
 */
export async function POST(request: NextRequest) {
  if (!paymentsEnabled()) return NextResponse.json({ ok: true });

  const params = request.nextUrl.searchParams;
  const body = (await request.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null;
  const type = params.get("type") ?? params.get("topic") ?? body?.type;
  const dataId = params.get("data.id") ?? params.get("id") ?? (body?.data?.id != null ? String(body.data.id) : null);
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const valid = isValidWebhookSignature({
      signatureHeader: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: params.get("data.id") ?? dataId,
      secret,
    });
    if (!valid) return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  try {
    await syncMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pagos] no se pudo procesar el aviso", { dataId, error });
    return NextResponse.json({ error: "reintentar" }, { status: 500 });
  }
}
