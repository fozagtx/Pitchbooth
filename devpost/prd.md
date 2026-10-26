---
doc: prd
status: draft
---

# Pitchbooth — Product Requirements

## The Core Journey
1. Drop a PDF deck on the landing page.
2. See one board of cues made from it; pick founder or school rubric and a target time.
3. Walk through each cue out loud (or typed) and hear the coach reply.
4. Do a timed run while the board tracks what you said.
5. See a score, what changed since the last run, and three fixes.
6. Run again with less of the board, then print the takeaway.

## Screens and Layout
| Screen | File | What's on it |
|---|---|---|
| Landing | `app/page.tsx` | Hero, PDF drop zone, upload progress and errors |
| Board | `components/steps/BoardStep.tsx` | Cue board, gaps, opener / closer, rubric and target time pickers, walkthrough / run buttons |
| Walkthrough | `components/steps/WalkthroughStep.tsx` | Current cue, voice orb, mic and typed reply, coach reply |
| Run | `components/steps/RunStep.tsx` | Fading board, timer, level picker, nudges, start / finish |
| Score | `components/steps/ScoreStep.tsx` | Total, change since last run, three fixes, content and delivery breakdown |
| Takeaway | `components/steps/TakeawayStep.tsx` | Printable board, opener / closer, practice plan, fixes, run history |

Session screens live under `app/s/[id]/page.tsx` and switch by step.

## Look and Feel
Paper / ink / chalk palette from `app/globals.css`; calm single-column steps; large tap targets; measured score lines are labelled "measured"; no dashboards.

## Features and Behavior

### Deck to board
- PDFs over 20 pages or 20 MB are rejected before anything is sent.
- Text is read in the browser; slides with little text also send an image.
- The board always has 5–7 cues, slots `0..n-1`, 3–4 acts, at most 3 gaps, 1–3 word labels and keywords on every cue.

### Walkthrough
- One cue at a time, by voice or by typing.
- The coach replies in text and by voice and may rename a cue.

### Timed run
- Live transcription marks cues reached, skipped or recovered and counts stalls.
- Pace and time nudges appear during the run.
- Run N starts at level N (capped at 4); the level can also be picked by hand.

| Level | What shows |
|---|---|
| 1 | Full cue labels |
| 2 | Abbreviated hints |
| 3 | Empty slots; reached / current states only |
| 4 | Blank board, optional reveal |

### Score and takeaway
- Every rubric line plus structure, clarity, pace, time, recovery and filler.
- Three fixes chosen from the weakest lines.
- Takeaway prints on one page.

## States and Boundaries
- Missing server keys return a readable error instead of a crash; the UI shows it.
- Microphone denied or speech service down: typed walkthrough still works; the run shows the error.
- `/api/coach` is rate limited per client IP; over the limit returns 429.
- Sessions survive a reload (`localStorage`); if storage is full, slide previews are dropped first.
- Nothing is shared between browsers; there are no accounts.

## Product Decisions
- Cues are 1–3 words, never sentences, so the board can't become a script.
- The board fades by run count, not by score, so practice always moves forward.
- Delivery lines (pace, time, recovery, filler) are measured, not judged by the model.

## What We're Building
Upload → board → walkthrough → timed fading runs → score → takeaway, for one deck per session, in English.

## Deferred From the POC
Accounts, multi-deck libraries, non-English speech.

## Possible Later Enhancements
Sharing a board with a co-founder or teacher; syncing sessions across devices.

## Non-Goals
Teleprompter mode; editing the deck.

## Open Questions
None recorded yet.
