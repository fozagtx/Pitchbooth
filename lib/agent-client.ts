import { Client } from "eve/client";
import { config } from "./config";
import { requireEnv } from "./env";

export function agentClient(): Client {
  const { AGENT_SHARED_KEY } = requireEnv(["AGENT_SHARED_KEY"]);
  return new Client({
    host: config.agentUrl,
    headers: { authorization: `Bearer ${AGENT_SHARED_KEY}` },
  });
}
