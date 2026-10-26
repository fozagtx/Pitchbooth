// SPDX-License-Identifier: MIT
export interface LimiterOptions {
  limit: number;
  windowMs: number;
}

export interface LimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export const LIMITS = {
  sessions: { limit: 6, windowMs: 3600000 },
  turns: { limit: 240, windowMs: 3600000 },
  listen: { limit: 40, windowMs: 3600000 },
} as const;

export function createLimiter({ limit, windowMs }: LimiterOptions): {
  take(key: string, nowMs: number): LimitResult;
} {
  const timestampsByKey = new Map<string, number[]>();

  return {
    take(key, nowMs) {
      const cutoff = nowMs - windowMs;
      const timestamps = (timestampsByKey.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      );

      if (timestamps.length >= limit) {
        const oldest = timestamps[0];
        return {
          ok: false,
          retryAfterMs:
            oldest === undefined
              ? Math.max(0, windowMs)
              : Math.max(0, oldest + windowMs - nowMs),
        };
      }

      timestamps.push(nowMs);
      timestampsByKey.set(key, timestamps);
      return { ok: true, retryAfterMs: 0 };
    },
  };
}
