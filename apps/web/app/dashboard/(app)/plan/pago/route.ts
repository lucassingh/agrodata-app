import { NextResponse, type NextRequest } from "next/server";
import { refreshMyPayment } from "@repo/core";
import { requireUser } from "@/lib/session";

/**
 * Vuelta desde Mercado Pago (back_urls): trae `external_reference` (nuestro id de
 * pago), `payment_id` y `status`. No se confía en `status`: se consulta el pago en
 * Mercado Pago y, si está aprobado, se activa el plan. Después, a Mi plan.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const paymentId = request.nextUrl.searchParams.get("external_reference");
  const target = new URL("/dashboard/plan", request.nextUrl.origin);
  if (paymentId) {
    target.searchParams.set("pago", paymentId);
    try {
      await refreshMyPayment(user.id, paymentId);
    } catch (error) {
      // Si Mercado Pago no respondió, Mi plan muestra el pago pendiente con «Ya pagué: revisar».
      console.error("[pagos] no se pudo confirmar a la vuelta", { userId: user.id, paymentId, error });
    }
  }
  return NextResponse.redirect(target);
}
