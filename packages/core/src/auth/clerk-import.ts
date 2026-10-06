/**
 * Copia a Clerk de quien ya tenía cuenta en campIA (reglas puras, con tests). El servicio que
 * habla con Clerk y con la base está en `clerk-import.service.ts`.
 */

export type UserToImport = {
  id: string;
  name: string;
  lastname: string;
  email: string | null;
  passwordHash: string | null;
  createdAt: Date;
};

/** Lo que `createUser` de Clerk necesita para dar de alta a alguien que ya existía. */
export type ClerkNewUser = {
  externalId: string;
  emailAddress: string[];
  firstName: string;
  lastName: string;
  createdAt: Date;
} & ({ passwordDigest: string; passwordHasher: "bcrypt" } | { skipPasswordRequirement: true });

/** Una cuenta que ya existe en Clerk con el mismo email (por ejemplo, alguien que entró a probar). */
export type ClerkAccount = {
  externalId: string | null;
  verifiedEmails: string[];
};

// bcryptjs (`packages/database/src/password.ts`) guarda `$2a$` o `$2b$`, el costo y 53 caracteres.
const BCRYPT_DIGEST = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Datos para crear a la persona en Clerk, o `null` si no tiene email: sin email no hay cuenta web
 *  (los operarios entran solo por WhatsApp). Con el hash de bcrypt entra con la misma contraseña;
 *  sin él, con «Olvidé mi contraseña» o con Google. */
export function clerkNewUser(user: UserToImport): ClerkNewUser | null {
  if (!user.email) return null;
  const base = {
    externalId: user.id,
    emailAddress: [user.email],
    firstName: user.name,
    lastName: user.lastname,
    createdAt: user.createdAt,
  };
  return user.passwordHash && BCRYPT_DIGEST.test(user.passwordHash)
    ? { ...base, passwordDigest: user.passwordHash, passwordHasher: "bcrypt" }
    : { ...base, skipPasswordRequirement: true };
}

/** Una cuenta de Clerk se vincula solo si Clerk verificó ese email y no es de otra persona nuestra.
 *  Sin verificar, cualquiera podría crear una cuenta con el email de otro y quedarse con sus campos. */
export function canLinkClerkAccount(user: { id: string; email: string }, account: ClerkAccount): boolean {
  const email = user.email.toLowerCase();
  const verified = account.verifiedEmails.some((address) => address.toLowerCase() === email);
  return verified && (account.externalId === null || account.externalId === user.id);
}
