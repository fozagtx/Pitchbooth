---
status: draft
---

# Pitchbooth — PRD

## Who it is for
Founders rehearsing an investor pitch and students rehearsing a school presentation, who have a slide deck as a PDF and want to deliver it from memory.

## Core journey
1. **Landing** (`app/page.tsx`): drop or pick a PDF. The deck is read in the browser; slide previews render locally.
2. **Board** (`components/steps/BoardStep.tsx`): one board of 5–7 cues (1–3 words each) grouped into 3–4 acts, plus an opener, a closer and up to 3 gaps the coach noticed. Pick the rubric (founder or school) and the target time.
3. **Walkthrough** (`components/steps/WalkthroughStep.tsx`): for each cue, say (or type) what you would say. The coach replies by voice (Speechmatics) and text, and can rename a cue.
4. **Run** (`components/steps/RunStep.tsx`): timed run with live transcription (AssemblyAI). Cues light up as reached, are marked skipped or recovered, and nudges appear for pace and stalls.
5. **Score** (`components/steps/ScoreStep.tsx`): total score, change since the last run, three fixes, and a content / delivery breakdown with measured lines marked.
6. **Takeaway** (`components/steps/TakeawayStep.tsx`): printable board, opener and closer, practice plan, fixes and run history.

## Board levels
| Level | What shows |
|---|---|
| 1 | Full cue labels |
| 2 | Abbreviated hints |
| 3 | Empty slots; reached / current states only |
| 4 | Blank board, optional reveal |

Run N starts at level N (capped at 4, `levelForRun`); the level can also be picked by hand on the run screen.

## Behaviours and states
- PDF over 20 pages or 20 MB is rejected with a clear message before anything is sent.
- Slides with little text send an image so the coach can still read them.
- Missing server keys return a readable error (`MissingConfig` in `lib/env.ts`) instead of a crash; the UI shows it.
- Microphone denied or speech service down: the walkthrough still works by typing; the run shows the error.
- `/api/coach` is rate limited per client IP (`limitResponse` in `lib/api.ts`); over the limit returns 429.
- Sessions survive a reload (`localStorage`); if storage is full, older previews are dropped first.

## Acceptance criteria
- A real 10-slide deck produces a board that passes `validateBoard` (5–7 cues, slots `0..n-1`, 3–4 acts, ≤3 gaps, 1–3 word labels, keywords on every cue).
- Speaking a cue's keywords marks it reached on the board during a run.
- A finished run is graded with every rubric line plus structure, clarity, pace, time, recovery and filler.
- A second run starts at level 2 by default.
- The takeaway page prints cleanly.

## Look and feel
Paper / ink / chalk palette from `app/globals.css`; calm, single-column steps; large tap targets; no dashboards.

## Non-goals
Accounts, multi-deck libraries, non-English speech, deck editing.
