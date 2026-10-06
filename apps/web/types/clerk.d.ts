export {};

declare global {
  /** Lo que agregamos al token de sesión en Clerk (Configure → Sessions → Customize session token):
   *  `{ "email": "{{user.primary_email_address}}" }`. Sin ese ajuste llega vacío. */
  interface CustomJwtSessionClaims {
    email?: string;
  }
}
