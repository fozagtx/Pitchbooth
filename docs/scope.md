---
doc: scope
status: draft
---

# Pitchbooth

## The Unique Kernel
A board of 5–7 short memory cues made from your own deck that **fades a level after every spoken run**, while live speech tracking shows which cues you reached, skipped or recovered, until you can pitch with the board blank.

## Who It's For
Founders rehearsing an investor pitch and students rehearsing a school presentation who already have a PDF deck and want to deliver it from memory.

## The Core Loop
1. Upload a PDF deck (max 20 pages, 20 MB).
2. The coach turns slide text into one board of 5–7 cues across 3–4 acts, plus an opener, a closer and up to 3 gaps.
3. Walk through the cues aloud or by typing; the coach replies by voice.
4. Do a timed run; cues light up as reached, skipped or recovered.
5. Get a score and three fixes.
6. Run again with less of the board showing (levels 1→4).

## Inspiration & Identity
Name: Pitchbooth, a rehearsal booth for pitches. Look: paper, ink and chalk, calm single-column steps, a board that feels like index cards on a desk.

## Why This Matters to the Learner
Not captured yet; to be written by the learner.

## What "Working" Looks Like
- A real PDF produces a board that passes `validateBoard`.
- A spoken run is tracked against cue keywords and graded with the founder or school rubric.
- Each new run starts at the next board level.
- A printable takeaway lists the board, opener, closer, fixes and run history.

## The POC Boundary
English speech only. No accounts: sessions live in the browser (`localStorage`) and the Eve session record. One deck per session.

## Later
- More languages.
- Accounts and syncing sessions across devices.
- Sharing a board with a co-founder or teacher.

## Explicitly Cut
- Slide-by-slide teleprompter (the point is to pitch without notes).
- Editing the deck itself.
