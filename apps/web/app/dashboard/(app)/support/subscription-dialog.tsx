"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PLAN_TYPES, PLANS, type PlanType } from "@repo/core/billing/plans";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activatePlanAction, cancelPlanAction, extendTrialAction, setSubscriptionNoteAction } from "./actions";

const MONTHS = [1, 3, 6, 12];
const selectClass = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

interface SubscriptionDialogProps {
  userId: string;
  name: string;
  paidPlan: PlanType | null;
  requestedPlan: PlanType | null;
  note: string | null;
}

/** Soporte: activar o renovar el plan de una persona, extender su prueba, darlo
 *  de baja y anotar cómo pagó. Hasta Mercado Pago, el cobro es a mano. */
export function SubscriptionDialog({ userId, name, paidPlan, requestedPlan, note }: SubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanType>(requestedPlan ?? paidPlan ?? "ASESOR");
  const [months, setMonths] = useState(1);
  const [noteText, setNoteText] = useState(note ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) =>
    start(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      setConfirmCancel(false);
    });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Gestionar el plan de ${name}`}>
        Gestionar
      </Button>
      {open ? (
        <Dialog open onOpenChange={(next: boolean) => !next && !pending && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Plan de {name}</DialogTitle>
              <DialogDescription>Se suma desde hoy o desde el vencimiento vigente del mismo plan.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-plan">Plan</Label>
                <select id="sub-plan" className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value as PlanType)}>
                  {PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {PLANS[p].name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-months">Meses</Label>
                <select id="sub-months" className={selectClass} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m === 1 ? "1 mes" : `${m} meses`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button disabled={pending} onClick={() => run(() => activatePlanAction(userId, plan, months), `Plan ${PLANS[plan].name} activado.`)}>
              Activar plan
            </Button>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <span className="w-full text-xs font-semibold text-muted-foreground">Prueba gratis</span>
              {[7, 14].map((days) => (
                <Button key={days} variant="outline" size="sm" disabled={pending} onClick={() => run(() => extendTrialAction(userId, days), `Prueba extendida ${days} días.`)}>
                  +{days} días
                </Button>
              ))}
              {paidPlan ? (
                <Button
                  variant={confirmCancel ? "destructive" : "ghost"}
                  size="sm"
                  className="ml-auto"
                  disabled={pending}
                  onClick={() => (confirmCancel ? run(() => cancelPlanAction(userId), "Plan dado de baja.") : setConfirmCancel(true))}
                >
                  {confirmCancel ? "Confirmar baja" : "Dar de baja el plan"}
                </Button>
              ) : null}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <Label htmlFor="sub-note">Nota interna</Label>
              <Textarea id="sub-note" rows={2} maxLength={500} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Cómo pagó, acuerdos…" />
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setSubscriptionNoteAction(userId, noteText), "Nota guardada.")}>
                Guardar nota
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
