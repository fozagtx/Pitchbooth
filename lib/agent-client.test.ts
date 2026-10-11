import { describe, expect, it } from "vitest";
import type { MessageResult } from "eve/client";
import { turnFailure } from "./agent-client";

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
