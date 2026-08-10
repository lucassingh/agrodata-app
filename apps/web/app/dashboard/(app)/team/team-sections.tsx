"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Users, MoreVertical, Crown, MessageCircle, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Capabilities } from "@repo/core/auth/capabilities";
import { updateRoleAction, removeMemberAction, seedDemoOperatorAction } from "./actions";
import { InviteWizardDialog } from "./invite-wizard-dialog";

interface TeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  wNumber: string | null;
  role: "ADMIN" | "USER_GENERAL";
  status: string;
  isSuperAdmin: boolean;
  registeredAt: Date;
}

interface Section {
  tenantId: string;
  tenantName: string;
  myRole: "ADMIN" | "USER_GENERAL";
  members: TeamMember[];
}

interface TeamSectionsProps {
  sections: Section[];
  adminTenants: Array<{ id: string; name: string }>;
  currentUserId: string;
  isOwner: boolean;
  capabilities: Capabilities;
  activeTenantId: string | null;
}

function roleChip(member: TeamMember): string {
  if (member.isSuperAdmin) return "Owner";
  return member.role === "ADMIN" ? "Farm Manager" : "Operator";
}

function statusChip(status: string): string {
  if (status === "ACTIVE") return "Activo";
  if (status === "INVITED") return "Invitado";
  return status;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const isDev = process.env.NODE_ENV !== "production";

function TeamTable({
  section,
  isOwner,
  currentUserId,
  onInvite,
}: {
  section: Section;
  isOwner: boolean;
  currentUserId: string;
  onInvite: () => void;
}) {
  const canManage = isOwner || section.myRole === "ADMIN";
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const [isChangingRole, startRoleChange] = useTransition();
  const [seeding, startSeed] = useTransition();

  const handleRoleChange = (member: TeamMember, role: "ADMIN" | "USER_GENERAL") => {
    startRoleChange(async () => {
      const result = await updateRoleAction(member.id, role);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Rol actualizado.");
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
          : "Operador demo creado: debería aparecer en la tabla como Operator.",
      );
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold">
          Equipo de {section.tenantName}
        </h2>
        <div className="flex items-center gap-2">
          {isDev && canManage ? (
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
                {canManage ? <th className="px-4 py-2.5" /> : null}
              </tr>
            </thead>
            <tbody>
              {section.members.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{member.fullName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {member.email ?? member.wNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={member.isSuperAdmin ? "default" : "outline"}>
                      {roleChip(member)}
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
                  {canManage ? (
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-muted">
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            {member.role === "USER_GENERAL" && !member.isSuperAdmin ? (
                              <DropdownMenuItem
                                disabled={isChangingRole}
                                onClick={() => handleRoleChange(member, "ADMIN")}
                              >
                                <Crown size={16} />
                                Promover a Farm Manager
                              </DropdownMenuItem>
                            ) : null}
                            {member.role === "ADMIN" && !member.isSuperAdmin ? (
                              <DropdownMenuItem
                                disabled={isChangingRole}
                                onClick={() => handleRoleChange(member, "USER_GENERAL")}
                              >
                                <MessageCircle size={16} />
                                Bajar a Operator
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={member.userId === currentUserId}
                              onClick={() => setRemoveTarget(member)}
                            >
                              <Trash2 size={16} />
                              Quitar del equipo
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null}
                </tr>
              ))}
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
    </div>
  );
}

export function TeamSections({
  sections,
  adminTenants,
  currentUserId,
  isOwner,
  capabilities,
  activeTenantId,
}: TeamSectionsProps) {
  const [inviteState, setInviteState] = useState<{ presetTenantId?: string } | null>(null);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 text-center shadow-soft">
        <Users className="text-muted-foreground" />
        <p className="font-medium">Todavía no hay equipo para mostrar</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Elegí un campo activo o creá un establecimiento. Si sos administrador, podés
          invitar colaboradores y asignarles rol y campo desde acá.
        </p>
        <Button
          className="mt-2"
          disabled={!capabilities.canInviteFarmManager && !capabilities.canInviteOperator}
          onClick={() => setInviteState({})}
        >
          Invitar usuario
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setInviteState({})}>
          <Plus size={14} />
          Invitar usuario
        </Button>
      </div>

      {sections.map((section) => (
        <TeamTable
          key={section.tenantId}
          section={section}
          isOwner={isOwner}
          currentUserId={currentUserId}
          onInvite={() => setInviteState({ presetTenantId: section.tenantId })}
        />
      ))}

      <InviteWizardDialog
        open={Boolean(inviteState)}
        presetTenantId={inviteState?.presetTenantId}
        adminTenants={adminTenants}
        activeTenantId={activeTenantId}
        capabilities={capabilities}
        onClose={() => setInviteState(null)}
      />
    </div>
  );
}
