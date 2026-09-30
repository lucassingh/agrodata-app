"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshPaymentAction } from "./actions";

const RESULT: Record<string, string> = {
  APPROVED: "Listo: el pago está aprobado y tu plan quedó activo.",
  PENDING: "Mercado Pago todavía no lo acreditó. Probá más tarde.",
  REJECTED: "Mercado Pago rechazó el pago.",
  CANCELLED: "El pago se canceló.",
};

/** «Ya pagué»: consulta el pago en Mercado Pago (sirve aunque el aviso de pago no llegue). */
export function RefreshPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await refreshPaymentAction(paymentId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          const message = RESULT[result.status] ?? "Listo.";
          if (result.status === "APPROVED") toast.success(message);
          else toast.info(message);
          router.refresh();
        })
      }
    >
      {pending ? "Revisando…" : "Ya pagué: revisar"}
    </Button>
  );
}
