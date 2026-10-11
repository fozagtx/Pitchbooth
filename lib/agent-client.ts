import { Client, type MessageResult } from "eve/client";
import { config } from "./config";
import { requireEnv } from "./env";

export function turnFailure(result: MessageResult<unknown>): string | undefined {
  for (const event of [...result.events].reverse()) {
    if (
      event.type === "step.failed" ||
      event.type === "turn.failed" ||
      event.type === "session.failed"
    ) {
      return event.data.message;
    }
  }
  return undefined;
}

export function agentClient(): Client {
  const { AGENT_SHARED_KEY } = requireEnv(["AGENT_SHARED_KEY"]);
  return new Client({
    host: config.agentUrl,
    headers: { authorization: `Bearer ${AGENT_SHARED_KEY}` },
  });
}
