"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Crown, Monitor, GraduationCap, Smartphone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { FieldRole } from "@repo/core/auth/field-roles";
import { inviteMemberAction } from "./actions";

type Step = "role" | "tenants" | "contact" | "link";

interface InviteWizardDialogProps {
  open: boolean;
  presetTenantId?: string;
  /** Campos donde puedo invitar, con los roles que puedo asignar en cada uno. */
  tenants: Array<{ id: string; name: string; assignable: FieldRole[] }>;
  activeTenantId: string | null;
  onClose: () => void;
}

const ROLE_CARDS: Array<{ role: FieldRole; icon: React.ReactNode; title: string; description: string }> = [
  { role: "ADMIN", icon: <Monitor size={22} />, title: "Encargado", description: "Carga y edita en la web e invita operarios. No borra datos." },
  { role: "ADVISOR", icon: <GraduationCap size={22} />, title: "Asesor", description: "Agrónomo o veterinario: ve y carga todo, arma informes." },
  { role: "USER_GENERAL", icon: <Smartphone size={22} />, title: "Operario", description: "Carga datos solo por WhatsApp, sin acceso a la web." },
  { role: "OWNER", icon: <Crown size={22} />, title: "Dueño", description: "Co-titular del campo, con control total." },
];

function RoleCard({
  icon,
  title,
  description,
  selected,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      title={disabled ? "Tu rol no puede invitar a alguien con este rol." : undefined}
      className={cn(
        "flex flex-1 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-primary bg-accent" : "border-border hover:bg-muted",
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

export function InviteWizardDialog({
  open,
  presetTenantId,
  tenants,
  activeTenantId,
  onClose,
}: InviteWizardDialogProps) {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<FieldRole | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  /** Link de la invitación para crear la cuenta (invitado por email, sin cuenta todavía). */
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setStep("role");
      setRole(null);
      setSelectedTenantIds([]);
      setIdentifier("");
      setName("");
      setInviteLink(null);
      setError(null);
    }
  }, [open]);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id;
  /** Campos donde se puede invitar con `r` (solo el prefijado, si vino uno). */
  const eligibleFor = (r: FieldRole) =>
    tenants.filter((t) => t.assignable.includes(r) && (!presetTenantId || t.id === presetTenantId));
  const eligible = role ? eligibleFor(role) : [];

  const handleRoleContinue = () => {
    if (!role) return;
    setError(null);
    if (eligible.length === 1) {
      setSelectedTenantIds([eligible[0]!.id]);
      setStep("contact");
      return;
    }
    const active = eligible.find((t) => t.id === activeTenantId);
    setSelectedTenantIds(active ? [active.id] : []);
    setStep("tenants");
  };

  const toggleTenant = (id: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleTenantsContinue = () => {
    if (selectedTenantIds.length === 0) {
      setError("Seleccioná al menos un campo.");
      return;
    }
    setError(null);
    setStep("contact");
  };

  const sendInvites = () => {
    if (!identifier.trim()) {
      setError("Ingresá un correo o número de WhatsApp.");
      return;
    }
    if (selectedTenantIds.length === 0) {
      setError("No hay campos seleccionados.");
      return;
    }
    setError(null);
    startTransition(async () => {
      let link: string | null = null;
      for (const tenantId of selectedTenantIds) {
        const result = await inviteMemberAction({
          identifier: identifier.trim(),
          tenantId,
          role: role!,
          name: name.trim() || undefined,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        link ??= result.data.link;
      }
      setInviteLink(link);
      toast.success(link ? "Invitación guardada" : "Listo: ya está en el equipo");
      setStep("link");
    });
  };

  const shareTenantId = selectedTenantIds[0];

  const copyLink = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink);
    toast.success("Enlace copiado");
  };

  const dialogTitle = presetTenantId
    ? `Agregar al equipo — ${tenantName(presetTenantId)}`
    : "Invitar nuevos usuarios";

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          {step === "role" ? (
            <DialogDescription>Elegí qué rol va a tener la persona invitada.</DialogDescription>
          ) : null}
        </DialogHeader>

        {step === "role" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_CARDS.map((card) => (
                <RoleCard
                  key={card.role}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                  selected={role === card.role}
                  disabled={eligibleFor(card.role).length === 0}
                  onSelect={() => setRole(card.role)}
                />
              ))}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={!role} onClick={handleRoleContinue}>
              Continuar
            </Button>
          </div>
        ) : null}

        {step === "tenants" ? (
          <div className="space-y-4">
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {eligible.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedTenantIds.includes(t.id)}
                    onCheckedChange={() => toggleTenant(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("role")}>
                Atrás
              </Button>
              <Button onClick={handleTenantsContinue}>Continuar</Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "contact" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {role === "USER_GENERAL"
                ? "Con su WhatsApp queda en el equipo al toque y ya puede escribirle al asistente. No necesita cuenta en la web."
                : "Si ya usa Campia, queda en el campo al toque. Si no, te damos un link para que cree su cuenta con ese email."}
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite-identifier">{role === "USER_GENERAL" ? "WhatsApp" : "Email"}</Label>
              <Input
                id="invite-identifier"
                autoFocus
                inputMode={role === "USER_GENERAL" ? "tel" : "email"}
                placeholder={role === "USER_GENERAL" ? "+54 9 261 123 4567" : "correo@ejemplo.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            {role === "USER_GENERAL" ? (
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nombre y apellido</Label>
                <Input
                  id="invite-name"
                  autoComplete="off"
                  placeholder="Ramón Gómez"
                  aria-describedby="invite-name-hint"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p id="invite-name-hint" className="text-xs text-muted-foreground">
                  Así lo ves en el equipo y en lo que carga.
                </p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Campo{selectedTenantIds.length > 1 ? "s" : ""}:{" "}
              {selectedTenantIds.map(tenantName).join(", ")}
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => setStep(eligible.length > 1 ? "tenants" : "role")}
              >
                Atrás
              </Button>
              <Button disabled={isPending} onClick={sendInvites}>
                {isPending ? "Enviando..." : "Enviar invitación"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "link" ? (
          <div className="min-w-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Campo{selectedTenantIds.length > 1 ? "s" : ""}:{" "}
              <span className="font-medium text-foreground">{selectedTenantIds.map(tenantName).join(", ") || tenantName(shareTenantId ?? "")}</span>
            </p>
            {inviteLink ? (
              <>
                <p className="text-sm">
                  Mandale este link para que cree su cuenta con <span className="font-medium">{identifier.trim()}</span>. Al
                  entrar, ya queda en el campo.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-xs">{inviteLink}</code>
                  <Button type="button" variant="ghost" size="icon" onClick={copyLink} aria-label="Copiar link">
                    <Copy size={14} />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm">
                {role === "USER_GENERAL"
                  ? "Listo: ya está en el equipo y puede escribirle al asistente desde ese WhatsApp."
                  : "Listo: ya está en el campo."}
              </p>
            )}
            <DialogFooter>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
