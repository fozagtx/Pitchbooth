---
doc: spec
status: draft
---

# Pitchbooth — Technical Spec

## How This Works, In Plain Language
The browser reads the PDF and listens to the microphone. A Next.js server hands the browser short-lived speech tokens and forwards coaching requests to an Eve agent running next to it. The agent (OpenAI `gpt-5-mini`) writes the board, coaches cues and grades runs, and keeps its own record of each session. The browser keeps a copy of the session so a reload doesn't lose anything.

## The Core Journey Through the System
```
Browser ──PDF text/images──▶ /api/board ──▶ Eve agent ──▶ save_board
Browser ──walkthrough/grade─▶ /api/coach ──▶ Eve agent ──▶ update_cue / log_note / log_run
Browser ◀─token── /api/stt-token ◀─ AssemblyAI      Browser ◀─WAV── /api/tts ◀─ Speechmatics
```
1. `readDeck` (`lib/client/deck.ts`) calls `checkFile` and `extractSlides` (`lib/pdf.ts`).
2. `createSession` posts to `app/api/board/route.ts`, which runs `repairBoard` then `validateBoard` (`lib/board.ts`) on the agent's board.
3. The walkthrough posts turns to `app/api/coach/route.ts`; replies are spoken through `app/api/tts/route.ts`.
4. The run streams 16 kHz PCM to AssemblyAI with a token from `app/api/stt-token/route.ts`; `createTracker` (`lib/tracker.ts`) marks cues.
5. `scoreRun` and `topFixes` (`lib/score.ts`) build the score; the run is logged with `log_run`.

## Stack
| Part | Choice |
|---|---|
| App | Next.js 16 (App Router), React, TypeScript, Tailwind |
| Agent | Eve on OpenAI `gpt-5-mini`, low reasoning, default tools off (`agent/agent.ts`) |
| Speech in | AssemblyAI streaming v3, `universal-streaming-english` |
| Speech out | Speechmatics preview TTS, voice `megan` |
| Tracing | Neatlogs, optional (`instrumentation.ts`) |
| Tests | Vitest (`lib/**/*.test.ts`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`): test, typecheck, build |

## Where It Runs and How Someone Tries It
- Live: https://pitchbooth.onrender.com (Render, Node 24, persistent disk at `/opt/render/project/src/.eve/.workflow-data`, see `render.yaml`).
- Local: set the keys in `.env.example`, then `npm install` and `npm run dev`. Next runs on port 3000 and the Eve agent on 2000, both started by `scripts/supervise.mjs`, which also creates `AGENT_SHARED_KEY` when it is unset.
- Checks: `npm test`, `npm run typecheck`, `npm run build`.

Sharing (filled in during `6-ship`):
- Public GitHub repository: https://github.com/fozagtx/Pitchbooth
- Demo video: not recorded yet

## Look and Feel
Tokens in `app/globals.css`: paper background, ink text, chalk accents; cue, slate and skip colours for board and score states. Shared motion tokens `--duration-fast` and `--ease-smooth-out`.

## Components

### Deck reading
`lib/pdf.ts`, `lib/client/deck.ts`: limits, text extraction, previews, images for low-text slides.

### Board rules
`lib/board.ts`: `validateBoard`, `repairBoard`, `levelForRun`, `cueView`, `hintFor`, `renameCue`. Drawn by `components/Board.tsx`.

### Coach
`app/api/board/route.ts`, `app/api/coach/route.ts`, `lib/coach.ts` (Zod schemas), `agent/instructions.md`, `agent/tools/*.ts`, `agent/channels/eve.ts` (bearer auth, timing-safe compare).

### Speech
`lib/stt.ts`, `hooks/useListener.ts`, `hooks/useSpeaker.ts`, `app/api/stt-token/route.ts`, `app/api/tts/route.ts`.

### Run tracking and scoring
`lib/tracker.ts`, `lib/nudges.ts`, `lib/client/run.ts`, `hooks/useRun.ts`, `lib/score.ts`.

### Steps
`app/s/[id]/page.tsx` with `components/steps/BoardStep.tsx`, `WalkthroughStep.tsx`, `RunStep.tsx`, `ScoreStep.tsx`, `TakeawayStep.tsx`.

## Data Model
- `Board` / `Cue` (`lib/board.ts`): `cues[{id, slot, act, label, icon, section, keywords}]`, `opener`, `closer`, `gaps`.
- `SessionRecord` (`lib/record.ts`, Eve state `pitchbooth.record`): `board`, `notes[{cueId, note}]`, `runs[]`.
- `LocalSession` / `RunRecord` (`lib/client/store.ts`): browser copy under `pitchbooth:<id>`.
- Session id: 22 URL-safe random characters (`lib/session.ts`).

## File Structure
```
.github/      CI workflow
agent/        Eve agent: model, channel auth, instructions, tools
app/          Next pages and API routes (board, coach, stt-token, tts)
components/   Board and the five session steps
hooks/        Browser speech and run hooks
lib/          Pure logic (tested) + lib/client browser helpers
scripts/      Process supervisor for dev and start
devpost/      Scope, PRD, spec, checklist, app map
```

## External Services and Dependencies
| Variable | Used by | Required |
|---|---|---|
| `OPENAI_API_KEY` | Eve agent, board and coach routes | yes |
| `ASSEMBLYAI_API_KEY` | `/api/stt-token` | yes |
| `SPEECHMATICS_API_KEY` | `/api/tts` | yes |
| `NEATLOGS_API_KEY` | tracing | no |
| `AGENT_SHARED_KEY` | Next ↔ Eve auth | no (generated) |

## Important Failure Modes
- Missing key → `MissingConfig` (`lib/env.ts`) → readable 503 JSON, shown in the UI.
- Agent returns a near-valid board → `repairBoard`; still invalid → error, nothing saved.
- Coach turn misses the result schema → retried, asking for the reply again.
- Speech socket drops → listener reports the error; typed walkthrough remains.
- `localStorage` full → slide previews dropped before session data.

## What Was Simplified and Why
No database or accounts: Eve state on the Render disk plus the browser copy is enough for one-deck rehearsal. English only, to keep speech tracking reliable.

## Decisions and Open Issues
- Next.js 16.4.0 has a published security advisory; upgrade pending.
