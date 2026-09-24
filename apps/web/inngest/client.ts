import { Inngest } from "inngest";

/** Lee `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` del entorno automáticamente
 *  -- no hace falta pasarlos acá. El tipado de eventos ya no vive en el
 *  cliente (la API `EventSchemas` de versiones anteriores de Inngest no
 *  existe en v4): cada evento se tipa en su propio `EventType` (ver
 *  `./events.ts`), usado tanto como trigger en `createFunction` como para
 *  construir el payload validado que se manda con `inngest.send()`. */
export const inngest = new Inngest({
  id: "agrodata-app",
});
