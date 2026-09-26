-- Cada campo pasa a tener dueño: quien lo creó. Al crear un campo se crea en el
-- mismo momento la membresía de administrador de quien lo crea, así que el dueño
-- es la membresía ADMIN activa más antigua de cada campo. El resto de los
-- administradores siguen como Encargados; nadie pierde acceso.
UPDATE "user_tenant_memberships" m
SET "role" = 'OWNER'
FROM (
  SELECT DISTINCT ON ("tenantId") "id"
  FROM "user_tenant_memberships"
  WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE'
  ORDER BY "tenantId", "createdAt" ASC
) first_admin
WHERE m."id" = first_admin."id";
