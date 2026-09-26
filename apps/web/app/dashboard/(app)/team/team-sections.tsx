"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Users, MoreVertical, Crown, UserCog, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FIELD_ROLE_LABEL, type FieldRole } from "@repo/core/auth/field-roles";
import {
  updateRoleAction,
  removeMemberAction,
  seedDemoOperatorAction,
  transferOwnershipAction,
} from "./actions";
import { InviteWizardDialog } from "./invite-wizard-dialog";

interface TeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  wNumber: string | null;
  role: FieldRole;
  status: string;
  registeredAt: Date;
}

export interface TeamSection {
  tenantId: string;
  tenantName: string;
  myRole: FieldRole;
  /** Roles que puedo asignar en este campo (vacío = no manejo el equipo). */
  assignable: FieldRole[];
  members: TeamMember[];
}

interface TeamSectionsProps {
  sections: TeamSection[];
  currentUserId: string;
  activeTenantId: string | null;
}

function statusChip(status: string): string {
  if (status === "ACTIVE") return "Activo";
  if (status === "INVITED") return "Invitado";
  return status;
}

/** `timeZone` fijo para evitar hydration mismatch entre el huso horario
 *  ambiente del servidor y el del navegador (ver nota igual en data-client.tsx). */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const isDev = process.env.NODE_ENV !== "production";

function TeamTable({
  section,
  currentUserId,
  onInvite,
}: {
  section: TeamSection;
  currentUserId: string;
  onInvite: () => void;
}) {
  const canManage = section.assignable.length > 0;
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const [isTransferring, startTransfer] = useTransition();
  const [isChangingRole, startRoleChange] = useTransition();
  const [seeding, startSeed] = useTransition();

  /** Acciones que tengo sobre `member` (mismas reglas que valida el servidor). */
  const actionsFor = (member: TeamMember) => {
    const isMe = member.userId === currentUserId;
    const manageable = !isMe && section.assignable.includes(member.role);
    return {
      roles: manageable ? section.assignable.filter((r) => r !== member.role && r !== "OWNER") : [],
      remove: manageable,
      transfer: !isMe && section.myRole === "OWNER" && member.role !== "OWNER" && member.status === "ACTIVE",
    };
  };

  const handleRoleChange = (member: TeamMember, role: FieldRole) => {
    startRoleChange(async () => {
      const result = await updateRoleAction(member.id, role);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${member.fullName} ahora es ${FIELD_ROLE_LABEL[role].toLowerCase()}.`);
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    startRemove(async () => {
      const result = await removeMemberAction(removeTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Miembro eliminado del equipo.");
      setRemoveTarget(null);
    });
  };

  const handleTransfer = () => {
    if (!transferTarget) return;
    startTransfer(async () => {
      const result = await transferOwnershipAction(section.tenantId, transferTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${transferTarget.fullName} es el nuevo dueño de ${section.tenantName}. Vos quedás como asesor.`);
      setTransferTarget(null);
    });
  };

  const handleSeedDemo = () => {
    startSeed(async () => {
      const result = await seedDemoOperatorAction(section.tenantId);
      if (!result.success) {
        toast.error(
          `${result.error} En Docker con NODE_ENV=production activá ALLOW_DEMO_OPERATOR_SEED=true en el backend.`,
        );
        return;
      }
      toast.success(
        result.data.alreadyExisted
          ? "El operador demo ya estaba en este campo."
          : "Operador demo creado: debería aparecer en la tabla como Operario.",
      );
    });
  };

  const showActions = section.members.some((m) => {
    const a = actionsFor(m);
    return a.roles.length > 0 || a.remove || a.transfer;
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold">
          Equipo de {section.tenantName}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (sos {FIELD_ROLE_LABEL[section.myRole].toLowerCase()})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {isDev && section.assignable.includes("USER_GENERAL") ? (
            <Button variant="outline" size="sm" disabled={seeding} onClick={handleSeedDemo}>
              {seeding ? "Creando..." : "Operador demo (BD)"}
            </Button>
          ) : null}
          {canManage ? (
            <Button size="sm" onClick={onInvite}>
              <Plus size={14} />
              Agregar a este equipo
            </Button>
          ) : null}
        </div>
      </div>

      {section.members.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No hay miembros en este establecimiento todavía.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5">Email / WhatsApp</th>
                <th className="px-4 py-2.5">Rol</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Registro</th>
                {showActions ? (
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {section.members.map((member) => {
                const actions = actionsFor(member);
                const hasActions = actions.roles.length > 0 || actions.remove || actions.transfer;
                return (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{member.fullName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {member.email ?? member.wNumber ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={member.role === "OWNER" ? "default" : "outline"}>
                        {FIELD_ROLE_LABEL[member.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={member.status === "ACTIVE" ? "secondary" : "outline"}>
                        {statusChip(member.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(member.registeredAt)}
                    </td>
                    {showActions ? (
                      <td className="px-4 py-2.5 text-right">
                        {hasActions ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="rounded-md p-1.5 hover:bg-muted"
                              aria-label={`Acciones para ${member.fullName}`}
                            >
                              <MoreVertical size={16} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                {actions.roles.map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    disabled={isChangingRole}
                                    onClick={() => handleRoleChange(member, role)}
                                  >
                                    <UserCog size={16} />
                                    Pasar a {FIELD_ROLE_LABEL[role].toLowerCase()}
                                  </DropdownMenuItem>
                                ))}
                                {actions.transfer ? (
                                  <DropdownMenuItem onClick={() => setTransferTarget(member)}>
                                    <Crown size={16} />
                                    Pasarle la titularidad
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuGroup>
                              {actions.remove ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(member)}>
                                    <Trash2 size={16} />
                                    Quitar del equipo
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Quitar del equipo"
        description={
          removeTarget
            ? `¿Seguro que querés quitar a ${removeTarget.fullName} de este campo?`
            : undefined
        }
        confirmLabel="Quitar"
        confirmVariant="destructive"
        loading={isRemoving}
        onConfirm={handleRemove}
        onClose={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(transferTarget)}
        title="Pasar la titularidad"
        description={
          transferTarget
            ? `${transferTarget.fullName} va a quedar como dueño de ${section.tenantName}, con control total. Vos seguís en el campo como asesor: ves y cargás todo, pero ya no borrás datos ni manejás el equipo.`
            : undefined
        }
        confirmLabel="Pasar la titularidad"
        loading={isTransferring}
        onConfirm={handleTransfer}
        onClose={() => setTransferTarget(null)}
      />
    </div>
  );
}

export function TeamSections({ sections, currentUserId, activeTenantId }: TeamSectionsProps) {
  const [inviteState, setInviteState] = useState<{ presetTenantId?: string } | null>(null);
  const inviteTenants = sections
    .filter((s) => s.assignable.length > 0)
    .map((s) => ({ id: s.tenantId, name: s.tenantName, assignable: s.assignable }));

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 text-center shadow-soft">
        <Users className="text-muted-foreground" />
        <p className="font-medium">Todavía no hay equipo para mostrar</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Creá tu campo desde el menú de arriba y después invitá a quienes trabajan con vos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inviteTenants.length > 0 ? (
        <div className="flex justify-end">
          <Button onClick={() => setInviteState({})}>
            <Plus size={14} />
            Invitar usuario
          </Button>
        </div>
      ) : null}

      {sections.map((section) => (
        <TeamTable
          key={section.tenantId}
          section={section}
          currentUserId={currentUserId}
          onInvite={() => setInviteState({ presetTenantId: section.tenantId })}
        />
      ))}

      <InviteWizardDialog
        open={Boolean(inviteState)}
        presetTenantId={inviteState?.presetTenantId}
        tenants={inviteTenants}
        activeTenantId={activeTenantId}
        onClose={() => setInviteState(null)}
      />
    </div>
  );
}
