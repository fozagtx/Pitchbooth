// SPDX-License-Identifier: MIT
import { createLimiter, LIMITS } from "./ratelimit";

const limiters = {
  sessions: createLimiter(LIMITS.sessions),
  turns: createLimiter(LIMITS.turns),
  listen: createLimiter(LIMITS.listen),
};

export type LimitName = keyof typeof limiters;

export function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function limitResponse(
  request: Request,
  name: LimitName,
): Response | null {
  const result = limiters[name].take(requestIp(request), Date.now());
  if (result.ok) {
    return null;
  }

  return Response.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      },
    },
  );
}
