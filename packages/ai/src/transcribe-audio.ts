import "server-only";
import OpenAI, { toFile } from "openai";

export const openai = new OpenAI();

/** `gpt-transcribe` es el modelo recomendado actual para transcripción (no
 *  `whisper-1`, que quedó como legacy solo para timestamps/subtítulos). */
const TRANSCRIBE_MODEL = "gpt-transcribe";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/flac": "flac",
};

function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXTENSION_BY_MIME_TYPE[base] ?? "ogg";
}

export interface TranscribeAudioInput {
  base64: string;
  mimeType: string;
}

/** Transcribe una nota de voz de WhatsApp a texto plano en español con la API
 *  de transcripción de OpenAI. WhatsApp manda las notas de voz como
 *  `audio/ogg` (códec Opus) -- confirmado contra los tipos del propio SDK
 *  instalado que `ogg` está en la lista de formatos soportados (`flac, mp3,
 *  mp4, mpeg, mpga, m4a, ogg, wav, webm`), así que no hace falta convertir el
 *  audio antes de mandarlo. */
export async function transcribeAudio(input: TranscribeAudioInput): Promise<string> {
  const buffer = Buffer.from(input.base64, "base64");
  const file = await toFile(buffer, `audio.${extensionForMimeType(input.mimeType)}`, {
    type: input.mimeType,
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
  });

  return transcription.text;
}
