import { describe, expect, it } from "vitest";
import { isSessionId, newSessionId } from "./session";

describe("session identifiers", () => {
  it("creates unique 22 character base64url IDs", () => {
    const first = newSessionId();
    const second = newSessionId();
    expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(second).not.toBe(first);
    expect(isSessionId(first)).toBe(true);
  });

  it("rejects IDs with padding, unsafe characters, or the wrong length", () => {
    expect(isSessionId("abcdefghijklmnopqrstuv")).toBe(true);
    expect(isSessionId("abcdefghijklmnopqrstuvw=")).toBe(false);
    expect(isSessionId("abcdefghijklmnopqrstuv!")).toBe(false);
    expect(isSessionId("short")).toBe(false);
  });
});
