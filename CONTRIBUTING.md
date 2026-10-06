# Cómo trabajamos en AgroData

Guía para sumar una funcionalidad, corregir un bug, cambiar la base de datos y pasar a
producción sin tocar lo que usan los clientes. Si algo de acá deja de ser cierto, se corrige en
el mismo PR que lo cambia.

## 1. Los tres entornos

| Entorno | Rama de git | URL | Base (Neon) |
|---|---|---|---|
| **Producción** | `main` | https://campia.app (antes https://agrodata-app-web.vercel.app) | rama `production` |
| **Prueba** | `develop` | https://agrodata-app-web-git-develop-lucas-singhs-projects.vercel.app (pide cuenta de Vercel) | rama `develop` |
| **Local** | cualquiera | http://localhost:3000 (`pnpm dev`) | rama `develop` |

- **Nunca se apunta local a producción.** `apps/web/.env.local` y `packages/database/.env` usan la
  rama `develop` de Neon. Fuera de producción el dashboard muestra «Entorno: Prueba (develop)» o
  «Entorno: Local».
- En Vercel, **Production** usa las variables de producción y **Preview** (develop y cualquier otra
  rama) las de `develop`. Preview **no tiene** las claves de WhatsApp ni de Inngest: desde develop
  nunca se le escribe a nadie.
- Cada deploy corre primero las migraciones pendientes en la base de su entorno y después el
  build (`pnpm --filter @repo/database db:migrate:deploy && turbo run build`). Si una migración o
  el build fallan, queda andando el último deploy bueno.

## 2. Ramas

| Rama | Para qué | Sale de | Vuelve a |
|---|---|---|---|
| `main` | Lo que está en producción. **Protegida**: solo por PR, con el CI en verde. | — | — |
| `develop` | Lo que se está probando antes de salir. | — | `main`, por PR |
| `feat/<nombre>` | Una funcionalidad nueva | `develop` | `develop`, por PR |
| `fix/<nombre>` | Un bug que todavía no llegó a producción o no es urgente | `develop` | `develop`, por PR |
| `hotfix/<nombre>` | Un bug urgente en producción | `main` | `main`, por PR (y después a `develop`) |
| `docs/…`, `chore/…` | Documentación o mantenimiento | `develop` | `develop` |

Un chequeo de GitHub (`.github/workflows/pr-to-main.yml`) rechaza cualquier PR a `main` que no
venga de `develop` o de una rama `hotfix/…`.

Nombres **en inglés**, cortos, en minúscula y con guiones: `feat/stock-alerts`, `fix/expense-date`,
`hotfix/broken-login`.

## 3. Una funcionalidad nueva (o un bug no urgente)

```bash
git checkout develop && git pull
git checkout -b feat/stock-alerts          # o fix/…

# … trabajar, con commits chicos (ver §8) …

pnpm check-types && pnpm lint && pnpm test && pnpm build   # lo mismo que corre el CI
git push -u origin feat/stock-alerts
gh pr create --base develop --fill          # o desde GitHub: base develop ← compare feat/…
```

1. Si la funcionalidad cambia la base, seguí también la §6.
2. El CI («Tipos, lint, tests y build») tiene que quedar en verde. Vercel arma además un deploy de
   prueba de la rama.
3. **Merge** del PR a `develop` con **«Create a merge commit»** y borrar la rama.
4. Vercel deploya `develop`: aplica las migraciones en la base `develop` y publica la URL de
   prueba. **Probá ahí** el recorrido completo antes de pensar en producción.

Una funcionalidad grande (una etapa del plan maestro) arranca con un plan corto aprobado en
`docs/` antes de escribir código.

## 4. Pasar a producción (release)

Cuando lo que está en `develop` está probado:

```bash
gh pr create --base main --head develop --title "Release: <qué sale>" --body "<lista de cambios>"
```

Desde GitHub: **base `main` ← compare `develop`**. Al revés mergea producción en develop y a
producción no le llega nada.

1. Tienen que pasar los dos chequeos: «Solo desde develop o hotfix» y «Tipos, lint, tests y build».
2. **Merge con «Create a merge commit»**, nunca «Squash» ni «Rebase»: con esos, `develop` y
   `main` quedan con historias distintas y el próximo PR arrastra cambios viejos.
3. Vercel deploya `main`: migraciones en la base de producción y después el build. Si el deploy
   falla, producción sigue con el anterior: revisá los Build Logs en Vercel.
4. Si cambiaron las funciones de Inngest (nuevas, renombradas o con otro trigger), resincronizá:
   `curl -X PUT https://campia.app/api/inngest` y verificá en Inngest Cloud
   (Apps → agrodata-app) que estén todas.
5. Mirá producción y listo. `develop` no se borra nunca.

## 5. Una urgencia en producción (hotfix)

Solo para algo roto en producción que no puede esperar a la próxima salida.

```bash
git checkout main && git pull
git checkout -b hotfix/broken-login
# … arreglo mínimo, con test si se puede …
pnpm check-types && pnpm lint && pnpm test && pnpm build
git push -u origin hotfix/broken-login
gh pr create --base main --title "Hotfix: <qué arregla>"
```

1. Merge del PR a `main` («Create a merge commit»). Se deploya a producción.
2. **Llevá el arreglo a develop**, o la próxima salida lo pisa:
   `git checkout develop && git pull && git merge main && git push`.
3. Evitá migraciones en un hotfix. Si hace falta una, probala antes en la base `develop` (§6).

## 6. Cambios en la base de datos (migraciones)

El schema sube por migraciones. Los datos nunca suben: bajan de producción a develop cuando hace
falta (ver al final de esta sección).

```bash
# 1. Editar packages/database/prisma/schema.prisma
# 2. Generar la migración (compara el schema con la base develop; no aplica nada)
pnpm --filter @repo/database exec prisma migrate dev --create-only --name add_alerts
# 3. Leer el SQL generado en prisma/migrations/<fecha>_add_alerts/migration.sql
# 4. Aplicarla en develop
pnpm --filter @repo/database db:migrate:deploy
# 5. Regenerar el cliente (en Windows, cortá antes el pnpm dev: bloquea el archivo)
pnpm --filter @repo/database db:generate
```

A producción la migración llega sola cuando se mergea a `main`: el deploy la aplica antes del
build.

**Reglas**, porque durante el deploy el código viejo sigue andando con la base nueva:

- **Solo cambios que suman**: tablas nuevas, columnas opcionales o con valor por defecto.
- **Renombrar o borrar lleva dos salidas**: primero el código deja de usar la columna, después
  otra migración la borra.
- **Un valor nuevo de un enum va en su propia migración**, y su uso (por ejemplo, un `UPDATE`
  que lo asigna) en otra posterior: Postgres no deja usarlo en la misma transacción.
- **Nunca se edita una migración que ya se aplicó** en develop o en producción: se crea otra.
- Cualquier rama que se sube genera un deploy de prueba que aplica sus migraciones en la base
  `develop`. Si descartás una rama que tenía migraciones, limpiá develop (abajo).

**Volver a copiar producción en develop** (para reproducir un bug con datos reales o limpiar
datos de prueba): Neon → rama `develop` → **Reset from parent**. Después, si develop tenía
migraciones que producción todavía no, `pnpm --filter @repo/database db:migrate:deploy`.

## 7. Variables de entorno

Una variable nueva va en tres lugares:

1. `apps/web/.env.example` (o `packages/database/.env.example`), **sin el valor real**.
2. Vercel → Settings → Environment Variables, **una entrada por entorno**: Production y, si
   corresponde, Preview. Una variable con secretos de producción (WhatsApp, Inngest) no va en
   Preview.
3. `turbo.json` → `tasks.build.env` (el lint avisa si falta).

Los secretos nunca se commitean ni se pegan en un chat o en un PR.

## 8. Commits y PR

- Commits chicos, uno por cambio lógico, **en inglés** y en imperativo, explicando **por qué**
  cuando no es obvio («Fix expense dates: they were stored in UTC and showed one day earlier»).
  Los commits anteriores al 2026-09-27 están en castellano; no se reescriben.
- Los títulos de los PR también van en inglés. La interfaz de la app, los documentos de `docs/`
  y esta guía siguen en castellano.
- **Nunca `--force`** sobre `main` ni `develop`. No se reescribe historia compartida.
- Datos de prueba: en develop y en local se crean los que hagan falta; en producción, nunca.

**Antes de mergear un PR**

- [ ] `pnpm check-types`, `pnpm lint`, `pnpm test` y `pnpm build` pasan (el CI lo confirma).
- [ ] Probado en la URL de prueba (develop) o en local, no solo con tests.
- [ ] Si hay migración: es de las que suman y se aplicó bien en develop.
- [ ] Si hay variable nueva: está en `.env.example`, en Vercel y en `turbo.json`.
- [ ] La documentación que cambió (este archivo, el `CLAUDE.md` del proyecto, los planes en
      `docs/`) está al día.

## 9. Quién hace qué

- **Claude** (el asistente de código) trabaja en la rama de la funcionalidad: la crea desde
  `develop`, hace los commits y la sube. No abre ni mergea PR, no toca `develop` ni `main` y
  no borra ramas.
- **Lucas** maneja todo el circuito a mano: abre los PR a `develop`, los mergea, pasa
  `develop` a `main` cuando decide salir a producción y borra las ramas terminadas.

## 10. Probar el bot de WhatsApp

Meta manda los mensajes reales solo a producción (una URL de webhook por app). Para probar el bot
en local: `pnpm dev`, más `npx inngest-cli dev -u http://localhost:3000/api/inngest --no-discovery`,
más un webhook simulado firmado con `WHATSAPP_APP_SECRET` contra `/api/whatsapp/webhook`. Todo
queda en la base `develop`.

## 11. El login (Clerk)

Clerk solo dice **quién** es la persona. Sus campos, roles, plan y prueba siguen en nuestra base
(`User.clerkId` la une con su cuenta de Clerk) y la única puerta es `requireUser()`
(`apps/web/lib/session.ts`).

- **Una app de Clerk, «campIA», con dos instancias**: Development (local y develop, claves
  `pk_test_` y `sk_test_`) y Production (campia.app, claves `pk_live_` y `sk_live_`, solo en
  Vercel Production).
- **Configuración de cada instancia**: nombre de la aplicación «campIA» (es el que muestra la
  pantalla de ingreso), Organizations apagado (los campos son nuestros), email + contraseña y
  Google, nombre y apellido. En el token de sesión, `{ "email": "{{user.primary_email_address}}" }`
  (Sessions → Customize session token): así un cambio de email en Clerk llega a nuestra base.
- **Registro**: `SIGNUP_MODE` (textos de la landing y control al completar los datos) y el modo de
  registro de la instancia (Public o Restricted) tienen que coincidir.
- **Primer ingreso**: quien ya tenía cuenta se vincula por su email **verificado**; quien es nuevo
  completa sus datos en `/dashboard/onboarding` (WhatsApp y términos) y arranca la prueba.
- **Invitaciones**: Soporte (dar acceso) y Equipo (invitar por email) arman una invitación de
  Clerk (`clerkInvitationLink`), que sirve aunque el registro esté cerrado. Los operarios se dan
  de alta solo con su WhatsApp, sin cuenta web.
- **Personas que ya existen en la base y no en Clerk** (por ejemplo, después de `db:seed` o
  `db:seed:demo`): se copian con su misma contraseña mandando el evento
  `agrodata/clerk.import-users.requested` (Inngest local o Inngest Cloud). Se puede repetir.
- **Entrar en local con las cuentas del seed** (owner@agrodata.dev, demo@agrodata.dev): sus
  casillas no existen, así que en la instancia Development tiene que estar apagado «Client Trust»
  (el código por email al entrar desde un dispositivo nuevo). En Production queda prendido.
