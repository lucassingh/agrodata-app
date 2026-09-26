import { z } from "zod";
import { FIELD_ROLES } from "../auth/field-roles";

export const systemRoleSchema = z.enum(FIELD_ROLES);

export const inviteMemberSchema = z.object({
  identifier: z.string().trim().min(1, "Ingresá un correo o número de WhatsApp."),
  tenantId: z.string().min(1, "Seleccioná un campo activo."),
  role: systemRoleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMembershipRoleSchema = z.object({
  role: systemRoleSchema,
});
export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
