---
doc: checklist
status: draft
---

# Build Checklist

Build mode: not recorded (the app was built before this workflow was applied; slices below are recorded from the code and git history)

## Slices

- [x] **1. A PDF deck becomes a cue board**
  Becomes usable: Dropping a real PDF on the landing page opens a session with a valid 5–7 cue board, opener, closer and gaps.
  Why now: The board is the kernel; everything else practises against it.
  PRD ref: `prd.md > The Core Journey` (steps 1-2), `prd.md > Features and Behavior > Deck to board`
  Spec ref: `spec.md > Components > Deck reading`, `spec.md > Components > Board rules`, `spec.md > Data Model`
  Build: `lib/pdf.ts`, `lib/client/deck.ts`, `app/api/board/route.ts`, `lib/board.ts`, `agent/tools/save_board.ts`, `components/steps/BoardStep.tsx`, `components/Board.tsx`.
  Verify (mechanical): `npm test` (`lib/board.test.ts`, `lib/pdf.test.ts`, `lib/session.test.ts`); `POST /api/board` without keys returns the `MissingConfig` 503.
  Learner check: Upload your own deck on https://pitchbooth.onrender.com and say whether the cues are the ones you would use.
  Commit: `f085ad0`, `3a53382`, `0fce989`

- [x] **2. Walk through each cue with the coach**
  Becomes usable: For each cue you can speak or type what you'd say and hear the coach reply; the coach can rename a cue.
  Why now: Rehearsing cue by cue comes before a full timed run.
  PRD ref: `prd.md > Features and Behavior > Walkthrough`
  Spec ref: `spec.md > Components > Coach`, `spec.md > Components > Speech`
  Build: `components/steps/WalkthroughStep.tsx`, `app/api/coach/route.ts`, `lib/coach.ts`, `agent/tools/update_cue.ts`, `agent/tools/log_note.ts`, `hooks/useSpeaker.ts`, `app/api/tts/route.ts`.
  Verify (mechanical): `npm test` (`lib/coach.test.ts`, `lib/agent-client.test.ts`, `lib/ratelimit.test.ts`).
  Learner check: Do the walkthrough for one cue and say whether the reply helped.
  Commit: `99783e2`, `6b2b44a`, `1cac74b`, `a0b23b8`, `28130ca`

- [x] **3. A timed run tracks what you say on a fading board**
  Becomes usable: A timed run where cues light up as reached, skipped or recovered, with nudges, at the level for that run.
  Why now: This is the fading-board kernel in action.
  PRD ref: `prd.md > Features and Behavior > Timed run`
  Spec ref: `spec.md > Components > Speech`, `spec.md > Components > Run tracking and scoring`
  Build: `components/steps/RunStep.tsx`, `hooks/useListener.ts`, `hooks/useRun.ts`, `lib/stt.ts`, `lib/tracker.ts`, `lib/nudges.ts`, `lib/client/run.ts`, `app/api/stt-token/route.ts`.
  Verify (mechanical): `npm test` (`lib/tracker.test.ts`, `lib/nudges.test.ts`, `lib/stt.test.ts`, `lib/client/run.test.ts`).
  Learner check: Start a run, say one cue's keywords, and watch it light up.
  Commit: `f085ad0`

- [x] **4. Each run is scored with three fixes**
  Becomes usable: Finishing a run shows the total, change since the last run, three fixes and the content / delivery breakdown.
  Why now: Feedback is what makes the next run better.
  PRD ref: `prd.md > Features and Behavior > Score and takeaway`
  Spec ref: `spec.md > Components > Run tracking and scoring`
  Build: `lib/score.ts`, `lib/client/api.ts`, `components/steps/ScoreStep.tsx`, `agent/tools/log_run.ts`.
  Verify (mechanical): `npm test` (`lib/score.test.ts`).
  Learner check: Finish a run and say whether the three fixes match how it felt.
  Commit: `f085ad0`, `ed1ea3f`

- [x] **5. A printable takeaway**
  Becomes usable: One printable page with the board, opener, closer, practice plan, fixes and run history; the session survives a reload.
  Why now: Lets you keep practising away from the app.
  PRD ref: `prd.md > Features and Behavior > Score and takeaway`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Data Model`
  Build: `components/steps/TakeawayStep.tsx`, `lib/client/store.ts`.
  Verify (mechanical): `npm test` (`lib/takeaway.test.ts`, `lib/client/store.test.ts`).
  Learner check: Print the takeaway and check it fits on one page.
  Commit: `f085ad0`

- [x] **6. Anyone can try it live**
  Becomes usable: The app runs on Render with both servers and a persistent agent record; CI runs test, typecheck and build on every push and PR.
  Why now: Lets reviewers try it and keeps `main` green.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: `render.yaml`, `scripts/supervise.mjs`, `scripts/dev.mjs`, `scripts/start.mjs`, `agent/channels/eve.ts`, `.env.example`, `.github/workflows/ci.yml`.
  Verify (mechanical): `npm run build`; `npm start` brings up Next and the Eve agent; CI green.
  Learner check: Open https://pitchbooth.onrender.com and upload a deck.
  Commit: `5ecd6d2`, `40f16cf`, `d52d925`, `2f54642`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3, on the live site
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Tests, typecheck and production build pass locally and in CI.
- [x] No secrets tracked (`.env*` ignored, only `.env.example` committed).
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `docs/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: App map generated from the code after the build and shared in the session; no learning activity run yet.
Route and stops: `readDeck` → `checkFile` / `extractSlides` → `app/api/board/route.ts` → `repairBoard` / `validateBoard` → `createTracker` → `scoreRun` / `topFixes` (reference only, see `docs/app-map.html`).
Edit outcome: not applicable yet.
Reflection: not offered yet.
Activity mode: explicit static fallback (offline app map).

## Revisions

- Boards are repaired before validation (`repairBoard`), decimals are allowed in cue labels, and reasoning effort is lower — generated boards were often nearly valid rather than fully valid (`0fce989`).
- Coach model switched to `gpt-5-mini` (`40f16cf`).
- Coach schemas made valid for OpenAI strict mode; turns that miss the result schema are retried and the coach is asked for its reply first — turns were failing on the schema (`99783e2`, `6b2b44a`, `1cac74b`, `a0b23b8`).
- `AGENT_SHARED_KEY` is generated at startup instead of being a required setting (`5ecd6d2`).
- `dev` and `start` share `scripts/supervise.mjs` — the two scripts were near-copies (`d52d925`).
