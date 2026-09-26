/** Capacidades de un usuario en su campo activo. Se calculan con el rol en ese
 *  campo (ver `field-roles.ts`): la matriz del legacy se conserva, pero por campo. */

export type PlatformRole = "OWNER" | "FARM_MANAGER" | "ADVISOR" | "OPERATOR";

export interface Capabilities {
  canCreateField: boolean;
  canUpdateField: boolean;
  canDeleteField: boolean;
  canManageBilling: boolean;
  canInviteFarmManager: boolean;
  canInviteOperator: boolean;
  canDeleteOperationalData: boolean;
}

export function assertCanCreateField(capabilities: Capabilities): void {
  if (!capabilities.canCreateField) {
    throw new Error("Tu rol no puede crear campos.");
  }
}

export function assertCanUpdateField(capabilities: Capabilities): void {
  if (!capabilities.canUpdateField) {
    throw new Error("Solo el dueño del campo puede editarlo.");
  }
}

export function assertCanDeleteField(capabilities: Capabilities): void {
  if (!capabilities.canDeleteField) {
    throw new Error("Solo el dueño del campo puede eliminarlo.");
  }
}

export function assertCanDeleteOperationalData(capabilities: Capabilities): void {
  if (!capabilities.canDeleteOperationalData) {
    throw new Error(
      "Tu rol puede crear y editar, pero no eliminar registros operativos.",
    );
  }
}
