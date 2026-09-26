import { afterEach, describe, expect, it } from "vitest";
import {
  assignableRoles,
  canAccessWeb,
  canChangeRole,
  canRemoveMember,
  capabilitiesForField,
  isPlatformStaff,
  leavesFieldWithoutOwner,
  platformRoleFor,
  visibleTeam,
} from "./field-roles";

describe("permisos por campo", () => {
  it("el dueño tiene todo; el encargado conserva la matriz del Farm Manager", () => {
    expect(capabilitiesForField("OWNER", false)).toEqual({
      canCreateField: true,
      canUpdateField: true,
      canDeleteField: true,
      canManageBilling: true,
      canInviteFarmManager: true,
      canInviteOperator: true,
      canDeleteOperationalData: true,
    });
    expect(capabilitiesForField("ADMIN", false)).toMatchObject({
      canInviteOperator: true,
      canInviteFarmManager: false,
      canDeleteOperationalData: false,
      canUpdateField: false,
    });
  });

  it("el asesor carga pero no borra, no invita ni edita el campo", () => {
    expect(capabilitiesForField("ADVISOR", false)).toMatchObject({
      canCreateField: true,
      canUpdateField: false,
      canInviteOperator: false,
      canInviteFarmManager: false,
      canDeleteOperationalData: false,
    });
  });

  it("cualquiera puede crear su campo, también sin campos; el operario no", () => {
    expect(capabilitiesForField(null, false).canCreateField).toBe(true);
    expect(capabilitiesForField("ADMIN", false).canCreateField).toBe(true);
    expect(capabilitiesForField("USER_GENERAL", false).canCreateField).toBe(false);
  });

  it("el rol que se muestra sale del campo activo", () => {
    expect(platformRoleFor("OWNER", false)).toBe("OWNER");
    expect(platformRoleFor("ADMIN", false)).toBe("FARM_MANAGER");
    expect(platformRoleFor("ADVISOR", false)).toBe("ADVISOR");
    expect(platformRoleFor("USER_GENERAL", false)).toBe("OPERATOR");
    expect(platformRoleFor("ADVISOR", true)).toBe("OWNER");
  });

  it("acceso a la web: rol web en algún campo, soporte o sin campos todavía", () => {
    expect(canAccessWeb({ isStaff: false, activeRoles: ["USER_GENERAL"], totalMemberships: 1 })).toBe(false);
    expect(canAccessWeb({ isStaff: false, activeRoles: ["USER_GENERAL", "ADVISOR"], totalMemberships: 2 })).toBe(true);
    expect(canAccessWeb({ isStaff: false, activeRoles: [], totalMemberships: 0 })).toBe(true);
    expect(canAccessWeb({ isStaff: true, activeRoles: [], totalMemberships: 3 })).toBe(true);
  });
});

describe("soporte de la plataforma", () => {
  const original = process.env.SUPER_ADMIN_EMAILS;
  afterEach(() => {
    process.env.SUPER_ADMIN_EMAILS = original;
  });

  it("solo por la lista de emails, sin importar mayúsculas", () => {
    process.env.SUPER_ADMIN_EMAILS = "soporte@agrodata.com, otro@agrodata.com";
    expect(isPlatformStaff("Soporte@AgroData.com")).toBe(true);
    expect(isPlatformStaff("productor@gmail.com")).toBe(false);
    expect(isPlatformStaff(null)).toBe(false);
  });
});

describe("reglas del equipo", () => {
  it("el dueño asigna cualquier rol; el encargado solo operarios; el asesor ninguno", () => {
    expect(assignableRoles("OWNER", false)).toEqual(["OWNER", "ADMIN", "ADVISOR", "USER_GENERAL"]);
    expect(assignableRoles("ADMIN", false)).toEqual(["USER_GENERAL"]);
    expect(assignableRoles("ADVISOR", false)).toEqual([]);
    expect(assignableRoles("USER_GENERAL", false)).toEqual([]);
  });

  it("el encargado no promueve ni saca a otros encargados", () => {
    expect(canChangeRole("ADMIN", false, "USER_GENERAL", "ADMIN")).toBe(false);
    expect(canRemoveMember("ADMIN", false, "ADMIN")).toBe(false);
    expect(canRemoveMember("ADMIN", false, "USER_GENERAL")).toBe(true);
    expect(canChangeRole("OWNER", false, "ADVISOR", "OWNER")).toBe(true);
  });

  it("visibilidad: dueño y asesor ven a todos; el encargado, operarios y a sí mismo", () => {
    const members = [
      { userId: "u1", role: "OWNER" },
      { userId: "u2", role: "ADMIN" },
      { userId: "u3", role: "USER_GENERAL" },
      { userId: "u4", role: "ADVISOR" },
    ];
    expect(visibleTeam("OWNER", false, "u1", members)).toHaveLength(4);
    expect(visibleTeam("ADVISOR", false, "u4", members)).toHaveLength(4);
    expect(visibleTeam("ADMIN", false, "u2", members).map((m) => m.userId)).toEqual(["u2", "u3"]);
    expect(visibleTeam("USER_GENERAL", false, "u3", members).map((m) => m.userId)).toEqual(["u3"]);
  });

  it("un campo nunca queda sin dueño", () => {
    const one = [
      { id: "m1", role: "OWNER" },
      { id: "m2", role: "ADVISOR" },
    ];
    expect(leavesFieldWithoutOwner(one, "m1", "ADVISOR")).toBe(true);
    expect(leavesFieldWithoutOwner(one, "m1", null)).toBe(true);
    expect(leavesFieldWithoutOwner([...one, { id: "m3", role: "OWNER" }], "m1", "ADVISOR")).toBe(false);
    expect(leavesFieldWithoutOwner(one, "m2", null)).toBe(false);
  });
});
