// SPDX-License-Identifier: MIT
import { limitResponse } from "@/lib/api";
import { config } from "@/lib/config";
import { MissingConfig, requireEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const limited = limitResponse(request, "listen");
  if (limited) return limited;

  let key: string;
  try {
    ({ ASSEMBLYAI_API_KEY: key } = requireEnv(["ASSEMBLYAI_API_KEY"]));
  } catch (error) {
    if (error instanceof MissingConfig) {
      return Response.json({ error: "Connect ASSEMBLYAI_API_KEY" }, { status: 503 });
    }
    throw error;
  }

  const url = new URL(config.assemblyTokenUrl);
  url.searchParams.set("expires_in_seconds", String(config.tokenTtlSec));
  url.searchParams.set("max_session_duration_seconds", String(config.listenMaxSec));
  try {
    const response = await fetch(url, { headers: { authorization: key } });
    if (!response.ok) {
      return Response.json({ error: "Could not create a listening token." }, { status: 502 });
    }
    const body = await response.json() as { token?: string };
    if (!body.token) {
      return Response.json({ error: "Could not create a listening token." }, { status: 502 });
    }

    const wsUrl = new URL(config.assemblyWsUrl);
    wsUrl.searchParams.set("token", body.token);
    wsUrl.searchParams.set("speech_model", config.speechModel);
    wsUrl.searchParams.set("sample_rate", String(config.sampleRate));
    wsUrl.searchParams.set("encoding", "pcm_s16le");
    wsUrl.searchParams.set("format_turns", "false");
    return Response.json({ token: body.token, wsUrl: wsUrl.toString() });
  } catch {
    return Response.json({ error: "Could not create a listening token." }, { status: 502 });
  }
}
