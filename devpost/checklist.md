---
status: draft
---

# Pitchbooth — Build checklist

Each slice runs end to end. Verify with `npm test`, `npm run typecheck` and `npm run build`, then the hands-on check.

## Slices

- [x] **1. Deck to board** — upload a PDF, extract text in the browser, generate and validate a 5–7 cue board.
  - Files: `lib/pdf.ts`, `lib/client/deck.ts`, `app/api/board/route.ts`, `lib/board.ts`, `agent/tools/save_board.ts`
  - Tests: `lib/board.test.ts`, `lib/pdf.test.ts`
  - Commits: `f085ad0`, `3a53382` (detached ArrayBuffer fix), `0fce989` (repair near-valid boards)
  - Hands-on: upload a real deck on https://pitchbooth.onrender.com and see the board.

- [x] **2. Walkthrough** — cue-by-cue coaching by voice or typing, coach can rename a cue.
  - Files: `components/steps/WalkthroughStep.tsx`, `app/api/coach/route.ts`, `lib/coach.ts`, `agent/tools/update_cue.ts`, `agent/tools/log_note.ts`, `hooks/useSpeaker.ts`, `app/api/tts/route.ts`
  - Commits: `f085ad0`, `99783e2`, `6b2b44a`, `1cac74b`, `a0b23b8`, `28130ca`
  - Hands-on: finish a walkthrough on one cue, hear the reply.

- [x] **3. Timed run with live tracking** — AssemblyAI streaming, cue reach / skip / recover, nudges, fading levels.
  - Files: `components/steps/RunStep.tsx`, `hooks/useListener.ts`, `hooks/useRun.ts`, `lib/stt.ts`, `lib/tracker.ts`, `lib/nudges.ts`, `lib/client/run.ts`, `app/api/stt-token/route.ts`
  - Tests: `lib/tracker.test.ts`, `lib/nudges.test.ts`, `lib/stt.test.ts`, `lib/client/run.test.ts`
  - Commit: `f085ad0`
  - Hands-on: speak a cue's keywords and watch it light up.

- [x] **4. Score and fixes** — rubric + measured delivery, three fixes, change since last run.
  - Files: `lib/score.ts`, `lib/client/api.ts`, `components/steps/ScoreStep.tsx`, `agent/tools/log_run.ts`
  - Tests: `lib/score.test.ts`
  - Commits: `f085ad0`, `ed1ea3f`
  - Hands-on: finish a run, see the score and fixes.

- [x] **5. Takeaway** — printable board, opener / closer, practice plan, run history.
  - Files: `components/steps/TakeawayStep.tsx`, `lib/client/store.ts`
  - Commit: `f085ad0`

- [x] **6. Deploy** — Render service with persistent Eve disk; internal agent key generated at startup.
  - Files: `render.yaml`, `scripts/supervise.mjs`, `scripts/dev.mjs`, `scripts/start.mjs`, `agent/channels/eve.ts`
  - Commits: `5ecd6d2`, `40f16cf`
  - Live: https://pitchbooth.onrender.com

- [x] **7. Docs** — README with live screenshots (`6225d2c`, `d388d6f`), `devpost/` plan, `devpost/app-map.html`, `.env.example`.

## Final review
- [x] All tests pass, typecheck clean, production build succeeds.
- [x] No secrets tracked (`.env*` ignored, only `.env.example` committed).
- [x] App map generated from the finished code: `devpost/app-map.html`.
- [ ] Learner confirms the app is ready to ship (tick this, then move to `6-ship`).
