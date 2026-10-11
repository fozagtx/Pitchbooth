import type { Word } from "./tracker";

export interface Nudger {
  evaluate(words: Word[], nowMs: number): string | null;
}

export function wpm(words: Word[], fromMs: number, toMs: number): number {
  const durationMs = toMs - fromMs;
  if (durationMs <= 0) {
    return 0;
  }
  const count = words.filter(
    (word) => word.start >= fromMs && word.start < toMs,
  ).length;
  return (count * 60000) / durationMs;
}

export function createNudger(opts: {
  targetSec: number;
  minGapMs?: number;
}): Nudger {
  const targetMs = opts.targetSec * 1000;
  const minGapMs = opts.minGapMs ?? 20000;
  let lastNudgeAt: number | null = null;
  let wrapShown = false;
  let overTimeShown = false;

  function canShow(nowMs: number): boolean {
    return lastNudgeAt === null || nowMs - lastNudgeAt >= minGapMs;
  }

  function show(nudge: string, nowMs: number): string {
    lastNudgeAt = nowMs;
    return nudge;
  }

  return {
    evaluate(words, nowMs) {
      if (nowMs >= targetMs && !overTimeShown) {
        overTimeShown = true;
        return show("Over time", nowMs);
      }

      if (nowMs >= targetMs * 0.85 && !wrapShown) {
        if (!canShow(nowMs)) {
          return null;
        }
        wrapShown = true;
        return show("Wrap up", nowMs);
      }

      const windowStart = nowMs - 20000;
      const windowWords = words.filter(
        (word) => word.start >= windowStart && word.start < nowMs,
      );
      if (
        nowMs >= 20000 &&
        windowWords.length >= 30 &&
        wpm(words, windowStart, nowMs) > 175
      ) {
        if (!canShow(nowMs)) {
          return null;
        }
        return show("Slower", nowMs);
      }

      return null;
    },
  };
}
