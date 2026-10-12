import { describe, expect, it } from "vitest";
import type { MessageResult } from "eve/client";
import { failureCode, replyNowMessage, turnFailure } from "./agent-client";

describe("turnFailure", () => {
  it("returns the message from the last failure event", () => {
    const result = {
      events: [
        { type: "step.failed", data: { message: "step failed" } },
        { type: "turn.failed", data: { message: "turn failed" } },
        { type: "session.failed", data: { message: "session failed" } },
      ],
    } as unknown as MessageResult<unknown>;

    expect(turnFailure(result)).toBe("session failed");
  });

  it("returns undefined when no failure event exists", () => {
    const result = {
      events: [{ type: "turn.completed", data: {} }],
    } as unknown as MessageResult<unknown>;

    expect(turnFailure(result)).toBeUndefined();
  });
});

describe("failureCode", () => {
  it("returns the code from the last failure event", () => {
    const result = {
      events: [
        { type: "step.failed", data: { code: "STEP_FAILED" } },
        { type: "turn.failed", data: { code: "TURN_FAILED" } },
        { type: "session.failed", data: { code: "SESSION_FAILED" } },
      ],
    } as unknown as MessageResult<unknown>;

    expect(failureCode(result)).toBe("SESSION_FAILED");
  });

  it("returns undefined when no failure event exists", () => {
    const result = {
      events: [{ type: "turn.completed", data: {} }],
    } as unknown as MessageResult<unknown>;

    expect(failureCode(result)).toBeUndefined();
  });
});

describe("replyNowMessage", () => {
  it("includes the parsed previous request", () => {
    expect(JSON.parse(replyNowMessage('{"kind":"walkthrough","x":1}'))).toEqual({
      kind: "reply_now",
      message: { kind: "walkthrough", x: 1 },
    });
  });
});
