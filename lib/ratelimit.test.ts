import { describe, expect, it } from "vitest";
import { createLimiter, LIMITS } from "./ratelimit";

describe("rate limits", () => {
  it("expires entries on a sliding window boundary and reports retry time", () => {
    const limiter = createLimiter({ limit: 2, windowMs: 100 });
    expect(limiter.take("session", 0)).toEqual({ ok: true, retryAfterMs: 0 });
    expect(limiter.take("session", 50)).toEqual({ ok: true, retryAfterMs: 0 });
    expect(limiter.take("session", 99)).toEqual({
      ok: false,
      retryAfterMs: 1,
    });
    expect(limiter.take("session", 100)).toEqual({
      ok: true,
      retryAfterMs: 0,
    });
    expect(limiter.take("another-session", 100)).toEqual({
      ok: true,
      retryAfterMs: 0,
    });
  });

  it("uses the specified limits for sessions, turns, and listening", () => {
    expect(LIMITS).toEqual({
      sessions: { limit: 6, windowMs: 3600000 },
      turns: { limit: 240, windowMs: 3600000 },
      listen: { limit: 40, windowMs: 3600000 },
    });
  });
});
