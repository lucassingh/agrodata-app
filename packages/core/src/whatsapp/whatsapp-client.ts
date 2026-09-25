import "server-only";

/** Versión de la Graph API que muestra el panel de Meta hoy -- ajustar acá el
 *  día que Meta fuerce una migración de versión. */
const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** Error de la Graph API al mandar un mensaje, con el código de Meta. El que más
 *  importa es 131047: pasaron más de 24 hs desde el último mensaje del usuario y
 *  solo se le puede escribir con una plantilla aprobada. */
export class WhatsAppSendError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | null,
    body: string,
  ) {
    super(`Error al enviar WhatsApp (HTTP ${status}): ${body}`);
    this.name = "WhatsAppSendError";
  }
}

export const OUTSIDE_24H_WINDOW = 131047;

async function postMessage(payload: Record<string, unknown>): Promise<void> {
  const phoneNumberId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requiredEnv("WHATSAPP_ACCESS_TOKEN");

  const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let code: number | null = null;
    try {
      code = (JSON.parse(errorBody) as { error?: { code?: number } }).error?.code ?? null;
    } catch {
      // cuerpo no JSON: queda sin código
    }
    throw new WhatsAppSendError(response.status, code, errorBody);
  }
}

/** Manda un mensaje de texto simple por WhatsApp Cloud API. */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await postMessage({ to, type: "text", text: { body } });
}

/** Manda una plantilla aprobada en Meta. Los parámetros del cuerpo no pueden
 *  tener saltos de línea (regla de Meta). */
export async function sendWhatsAppTemplate(
  to: string,
  template: { name: string; language: string; bodyParams: string[] },
): Promise<void> {
  await postMessage({
    to,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      components: [
        { type: "body", parameters: template.bodyParams.map((text) => ({ type: "text", text: text.replace(/\s+/g, " ") })) },
      ],
    },
  });
}

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
}

/** Descarga un archivo adjunto (imagen/audio) de WhatsApp. Es un proceso de
 *  DOS pasos, no uno: primero se pide la URL temporal a la Graph API (no es
 *  pública, requiere el token), y recién con esa URL se descarga el archivo
 *  -- pasando el mismo token también en la descarga, porque tampoco es un
 *  link público. Muchos tutoriales se saltean el segundo header y fallan. */
export async function downloadWhatsAppMedia(mediaId: string): Promise<DownloadedMedia> {
  const accessToken = requiredEnv("WHATSAPP_ACCESS_TOKEN");

  const metaResponse = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaResponse.ok) {
    throw new Error(`No se pudo obtener metadata del adjunto ${mediaId}: HTTP ${metaResponse.status}`);
  }
  const meta = (await metaResponse.json()) as { url: string; mime_type: string };

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileResponse.ok) {
    throw new Error(`No se pudo descargar el adjunto ${mediaId}: HTTP ${fileResponse.status}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: meta.mime_type,
  };
}
