import { z } from "zod";
import { limitResponse } from "@/lib/api";
import { config } from "@/lib/config";
import { MissingConfig, requireEnv } from "@/lib/env";

export const runtime = "nodejs";

const TtsInputSchema = z.object({ text: z.string().min(1).max(400) });

export async function POST(request: Request): Promise<Response> {
  const limited = limitResponse(request, "turns");
  if (limited) return limited;

  let key: string;
  try {
    ({ SPEECHMATICS_API_KEY: key } = requireEnv(["SPEECHMATICS_API_KEY"]));
  } catch (error) {
    if (error instanceof MissingConfig) {
      return Response.json({ error: "Connect SPEECHMATICS_API_KEY" }, { status: 503 });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = TtsInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const response = await fetch(`${config.ttsUrl}/${config.ttsVoice}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: "audio/wav",
      },
      body: JSON.stringify({ text: parsed.data.text }),
    });
    if (!response.ok) {
      return Response.json({ error: "Could not generate speech." }, { status: 502 });
    }
    return new Response(response.body, {
      headers: { "content-type": "audio/wav" },
    });
  } catch {
    return Response.json({ error: "Could not generate speech." }, { status: 502 });
  }
}
