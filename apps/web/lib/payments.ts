import { resolvePaymentsEnabled } from "@repo/core/billing/checkout";

/** Pagos con Mercado Pago (Etapa 6.6): prendidos en develop y local con las
 *  credenciales de prueba, apagados en producción hasta que esté el monotributo. */
export function paymentsEnabled(): boolean {
  return resolvePaymentsEnabled({
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasAccessToken: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
  });
}

/** Fuera de producción, Mercado Pago cobra con la credencial de prueba: hay que
 *  pagar con un comprador y una tarjeta de prueba. */
export const isPaymentSandbox = () => process.env.VERCEL_ENV !== "production";
