"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, MessageCircle } from "lucide-react";
import { waMeDigits } from "@repo/core/whatsapp/wa-id";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grantAccessAction, type GrantAccessResult } from "./actions";

type Granted = Extract<GrantAccessResult, { success: true }>;

interface AccessDialogProps {
  /** Texto del botón que abre el diálogo. */
  label: string;
  demoRequestId?: string;
  email?: string;
  name?: string;
  /** WhatsApp del pedido de demo, para mandarle el link por ahí. */
  whatsapp?: string;
}

/** Acceso anticipado: da (o renueva) el código de una persona y deja el link a mano
 *  para copiarlo o mandarlo por WhatsApp, por si el mail no sale. */
export function AccessDialog({ label, demoRequestId, email: initialEmail = "", name: initialName = "", whatsapp }: AccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [granted, setGranted] = useState<Granted | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setGranted(null);
    setCopied(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await grantAccessAction({ email, name, demoRequestId: demoRequestId ?? null });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setGranted(result);
    });
  };

  const copy = async () => {
    if (!granted) return;
    try {
      await navigator.clipboard.writeText(granted.link);
      setCopied(true);
    } catch {
      toast.error("No se pudo copiar: seleccioná el link a mano.");
    }
  };

  const whatsappDigits = whatsapp ? waMeDigits(whatsapp) : "";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={initialName ? `${label}: ${initialName}` : label}>
        {label}
      </Button>
      {open ? (
        <Dialog open onOpenChange={(next: boolean) => !next && close()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{granted ? "Acceso listo" : "Dar acceso a AgroData"}</DialogTitle>
              <DialogDescription>
                {granted
                  ? granted.emailed
                    ? `Le mandamos el mail a ${email.trim()}. El link también queda acá.`
                    : "El mail no salió (sin dominio verificado, Resend solo le escribe al email de la cuenta). Mandale el link por WhatsApp o copialo."
                  : "Un código personal, de un solo uso, que vence en 30 días. Con él se registra aunque el registro esté cerrado."}
              </DialogDescription>
            </DialogHeader>

            {granted ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="access-link">Link para registrarse</Label>
                  <div className="flex gap-2">
                    <Input id="access-link" readOnly value={granted.link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copiar link">
                      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código: <span className="font-mono font-semibold text-foreground">{granted.code}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {whatsappDigits ? (
                    <a
                      href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(granted.whatsappText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants()}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Mandar por WhatsApp
                    </a>
                  ) : null}
                  <Button variant="outline" onClick={close}>
                    Listo
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="access-email">Email</Label>
                  <Input id="access-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="access-name">Nombre y apellido</Label>
                  <Input id="access-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Creando…" : "Crear acceso"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
