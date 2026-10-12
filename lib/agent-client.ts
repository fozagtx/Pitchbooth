import {
  Client,
  type MessageResult,
  type SendTurnInput,
  type SendTurnOptions,
} from "eve/client";
import { config } from "./config";
import { requireEnv } from "./env";

export const REPLY_NOW_MESSAGE = JSON.stringify({ kind: "reply_now" });

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

export function failureCode(result: MessageResult<unknown>): string | undefined {
  for (const event of [...result.events].reverse()) {
    if (
      event.type === "step.failed" ||
      event.type === "turn.failed" ||
      event.type === "session.failed"
    ) {
      return event.data.code;
    }
  }
  return undefined;
}

export async function sendWithRetry<TOutput>(
  sessionId: string,
  message: SendTurnInput<TOutput>["message"],
  outputSchema: NonNullable<SendTurnOptions<TOutput>["outputSchema"]>,
  initialResult?: MessageResult<TOutput>,
): Promise<MessageResult<TOutput>> {
  let result = initialResult;
  if (result === undefined) {
    const response = await agentClient()
      .sessions.attach(sessionId)
      .send<TOutput>(message, { outputSchema });
    result = await response.result();
  }

  if (
    result.data !== undefined ||
    failureCode(result) !== "OUTPUT_SCHEMA_NOT_FULFILLED"
  ) {
    return result;
  }

  for (const followupMessage of [REPLY_NOW_MESSAGE, message]) {
    const followupResponse = await agentClient()
      .sessions.attach(sessionId)
      .send<TOutput>(followupMessage, { outputSchema });
    result = await followupResponse.result();
    if (
      result.data !== undefined ||
      failureCode(result) !== "OUTPUT_SCHEMA_NOT_FULFILLED"
    ) {
      return result;
    }
  }
  return result;
}

export function agentClient(): Client {
  const { AGENT_SHARED_KEY } = requireEnv(["AGENT_SHARED_KEY"]);
  return new Client({
    host: config.agentUrl,
    headers: { authorization: `Bearer ${AGENT_SHARED_KEY}` },
  });
}
