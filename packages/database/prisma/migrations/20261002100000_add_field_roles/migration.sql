-- Roles por campo: Dueño y Asesor se suman a Encargado (ADMIN) y Operario (USER_GENERAL).
ALTER TYPE "SystemRole" ADD VALUE 'OWNER';
ALTER TYPE "SystemRole" ADD VALUE 'ADVISOR';
