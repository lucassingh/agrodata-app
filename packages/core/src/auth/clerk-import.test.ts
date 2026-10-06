import { describe, expect, it } from "vitest";
import { canLinkClerkAccount, clerkNewUser, type UserToImport } from "./clerk-import";

const BCRYPT_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const user: UserToImport = {
  id: "user_1",
  name: "Martín",
  lastname: "Sosa",
  email: "martin@campo.com",
  passwordHash: BCRYPT_HASH,
  createdAt: new Date("2026-09-01T12:00:00Z"),
};

describe("clerkNewUser", () => {
  it("sin email no hay cuenta web: no se copia", () => {
    expect(clerkNewUser({ ...user, email: null })).toBeNull();
  });

  it("con hash de bcrypt lo pasa para que entre con la misma contraseña", () => {
    expect(clerkNewUser(user)).toEqual({
      externalId: "user_1",
      emailAddress: ["martin@campo.com"],
      firstName: "Martín",
      lastName: "Sosa",
      createdAt: user.createdAt,
      passwordDigest: BCRYPT_HASH,
      passwordHasher: "bcrypt",
    });
  });

  it("acepta el prefijo $2a$ de bcrypt", () => {
    const params = clerkNewUser({ ...user, passwordHash: BCRYPT_HASH.replace("$2b$", "$2a$") });
    expect(params).toMatchObject({ passwordHasher: "bcrypt" });
  });

  it("sin contraseña, o con un hash que no es bcrypt, se crea sin contraseña", () => {
    expect(clerkNewUser({ ...user, passwordHash: null })).toMatchObject({ skipPasswordRequirement: true });
    expect(clerkNewUser({ ...user, passwordHash: "texto-cualquiera" })).toMatchObject({ skipPasswordRequirement: true });
    expect(clerkNewUser({ ...user, passwordHash: null })).not.toHaveProperty("passwordDigest");
  });
});

describe("canLinkClerkAccount", () => {
  const ours = { id: "user_1", email: "martin@campo.com" };

  it("vincula una cuenta con el email verificado y sin dueño", () => {
    expect(canLinkClerkAccount(ours, { externalId: null, verifiedEmails: ["martin@campo.com"] })).toBe(true);
  });

  it("vincula de nuevo una cuenta que ya apunta a la misma persona (reintento)", () => {
    expect(canLinkClerkAccount(ours, { externalId: "user_1", verifiedEmails: ["martin@campo.com"] })).toBe(true);
  });

  it("no compara mayúsculas", () => {
    expect(canLinkClerkAccount(ours, { externalId: null, verifiedEmails: ["Martin@Campo.com"] })).toBe(true);
  });

  it("no vincula si Clerk no verificó ese email", () => {
    expect(canLinkClerkAccount(ours, { externalId: null, verifiedEmails: ["otro@campo.com"] })).toBe(false);
    expect(canLinkClerkAccount(ours, { externalId: null, verifiedEmails: [] })).toBe(false);
  });

  it("no vincula una cuenta que ya es de otra persona nuestra", () => {
    expect(canLinkClerkAccount(ours, { externalId: "user_2", verifiedEmails: ["martin@campo.com"] })).toBe(false);
  });
});
