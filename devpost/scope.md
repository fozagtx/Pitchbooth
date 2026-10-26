---
status: draft
---

# Pitchbooth — Scope

## Kernel
A founder or student uploads their PDF deck and ends up able to deliver the pitch out loud without looking at the board.

## Core loop
1. Upload a PDF deck (max 20 pages, 20 MB) — `lib/pdf.ts`.
2. The coach turns slide text into one board of 5–7 short cues across 3–4 acts — `app/api/board/route.ts`, `lib/board.ts`.
3. Walk through the cues aloud or by typing, one cue at a time — `components/steps/WalkthroughStep.tsx`.
4. Do a timed run while live speech tracking marks cues reached, skipped or recovered — `components/steps/RunStep.tsx`, `lib/tracker.ts`.
5. Get a score and three fixes — `lib/score.ts`, `components/steps/ScoreStep.tsx`.
6. Run again with less of the board showing (levels 1→4), until the board is blank.

## Done means
- A real PDF produces a valid board (passes `validateBoard`).
- A spoken run is tracked against cue keywords and graded with the founder or school rubric.
- Each new run shows less of the board.
- A printable takeaway lists the board, opener, closer, fixes and run history.

## POC boundary
- English speech only (`universal-streaming-english`).
- No accounts: sessions live in `localStorage` (`pitchbooth:<id>`) plus the Eve session record.
- One deck per session.

## Later
- More languages.
- Accounts and syncing sessions across devices.
- Sharing a board with a co-founder or teacher.

## Cut
- Slide-by-slide teleprompter (the point is to pitch without notes).
- Editing the deck itself.
