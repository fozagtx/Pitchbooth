// SPDX-License-Identifier: MIT
import { z } from "zod";
import type { Board, Cue } from "./board";

export const CueSchema: z.ZodType<Cue> = z.object({
  id: z.string(),
  slot: z.number().int(),
  act: z.string(),
  label: z.string(),
  icon: z.string(),
  section: z.string(),
  keywords: z.array(z.string()),
});

export const BoardSchema: z.ZodType<Board> = z.object({
  cues: z.array(CueSchema),
  opener: z.string(),
  closer: z.string(),
  gaps: z.array(z.string()),
});

export const BoardTurnInputSchema = z.object({
  kind: z.literal("board"),
  rubric: z.enum(["founder", "school"]),
  slides: z.array(z.object({
    index: z.number().int(),
    text: z.string(),
  })),
});

export const BoardRequestSchema = z.object({
  eveSessionId: z.null().optional(),
  rubric: z.enum(["founder", "school"]),
  slides: z.array(z.object({
    index: z.number().int(),
    text: z.string(),
  })),
  images: z.array(z.object({
    index: z.number().int(),
    dataUrl: z.string().regex(/^data:image\/png;base64,/),
  })).default([]),
});

export const WalkthroughTurnInputSchema = z.object({
  kind: z.literal("walkthrough"),
  cue: CueSchema,
  transcript: z.string(),
  attempt: z.number().int().positive(),
});

export const WalkthroughOutputSchema = z.object({
  reply: z.string(),
  verdict: z.enum(["retry", "next"]),
  adoptPhrase: z.string(),
});

export const GradeTurnInputSchema = z.object({
  kind: z.literal("grade"),
  rubric: z.enum(["founder", "school"]),
  transcript: z.string(),
  board: BoardSchema,
  targetSec: z.number().positive(),
  level: z.number().int().min(1).max(4),
  measured: z.object({
    wpm: z.number(),
    durationSec: z.number().nonnegative(),
    stalls: z.number().int().nonnegative(),
    fillersPer100: z.number().nonnegative(),
  }),
});

export const GradeOutputSchema = z.object({
  coach: z.array(z.object({
    key: z.string(),
    points: z.number(),
    note: z.string(),
  })),
  cues: z.array(z.object({
    cueId: z.string(),
    status: z.enum(["landed", "weak", "missed"]),
    note: z.string(),
  })),
  drills: z.array(z.object({
    key: z.string(),
    drill: z.string(),
  })),
});

export type BoardTurnInput = z.infer<typeof BoardTurnInputSchema>;
export type WalkthroughTurnInput = z.infer<typeof WalkthroughTurnInputSchema>;
export type WalkthroughOutput = z.infer<typeof WalkthroughOutputSchema>;
export type GradeTurnInput = z.infer<typeof GradeTurnInputSchema>;
export type GradeOutput = z.infer<typeof GradeOutputSchema>;
