import { z } from "zod";

export const systemRoleSchema = z.enum(["ADMIN", "USER_GENERAL"]);

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
