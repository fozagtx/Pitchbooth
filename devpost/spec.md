---
status: draft
---

# Pitchbooth — Spec

## Architecture in plain words
The browser does the heavy lifting on the deck (reading the PDF, previews) and the microphone. A Next.js server hands short-lived speech tokens to the browser and forwards coaching requests to an Eve agent running next to it. The agent (OpenAI `gpt-5-mini`) writes the board, coaches cues and grades runs, saving everything in its own session record.

```
Browser ──PDF text/images──▶ /api/board ──▶ Eve agent ──▶ save_board
Browser ──walkthrough/grade─▶ /api/coach ──▶ Eve agent ──▶ update_cue / log_note / log_run
Browser ◀─token── /api/stt-token ◀─ AssemblyAI      Browser ◀─WAV── /api/tts ◀─ Speechmatics
```

## Stack
| Part | Choice |
|---|---|
| App | Next.js 16 (App Router), React, TypeScript, Tailwind |
| Agent | Eve on OpenAI `gpt-5-mini`, low reasoning, default tools off (`agent/agent.ts`) |
| Speech in | AssemblyAI streaming v3, `universal-streaming-english`, 16 kHz PCM |
| Speech out | Speechmatics preview TTS, voice `megan` |
| Tracing | Neatlogs (optional, `instrumentation.ts`) |
| Tests | Vitest (`lib/**/*.test.ts`) |
| Hosting | Render, Node 24, persistent disk at `/opt/render/project/src/.eve/.workflow-data` (`render.yaml`) |

## Runtime
`scripts/supervise.mjs` starts both processes and stops both if either exits. It generates `AGENT_SHARED_KEY` when unset; the Next server sends it as a bearer token and `agent/channels/eve.ts` checks it with a timing-safe compare.
- `npm run dev` → `next dev` + `eve dev --port 2000`
- `npm start` → `eve start --host 127.0.0.1 --port 2000` + `next start --port $PORT`

## Data model
- `Board` / `Cue` (`lib/board.ts`): `cues[{id, slot, act, label, icon, section, keywords}]`, `opener`, `closer`, `gaps`.
- `SessionRecord` (`lib/record.ts`, Eve state `pitchbooth.record`): `board`, `notes[{cueId, note}]`, `runs[]`.
- `LocalSession` / `RunRecord` (`lib/client/store.ts`): browser copy keyed `pitchbooth:<id>`.
- Session id: 22 URL-safe random characters (`lib/session.ts`).

## Components and modules
| Concern | Files |
|---|---|
| Deck reading | `lib/pdf.ts`, `lib/client/deck.ts` |
| Board rules | `lib/board.ts` (`validateBoard`, `repairBoard`, levels, `renameCue`) |
| Coach I/O schemas | `lib/coach.ts` (Zod) |
| Scoring | `lib/score.ts` (founder / school rubrics, measured delivery, top fixes) |
| Speech | `lib/stt.ts`, `hooks/useListener.ts`, `hooks/useSpeaker.ts` |
| Run tracking | `lib/tracker.ts`, `lib/nudges.ts`, `lib/client/run.ts`, `hooks/useRun.ts` |
| Agent | `agent/instructions.md`, `agent/tools/*.ts` |
| UI | `app/page.tsx`, `app/s/[id]/page.tsx`, `components/Board.tsx`, `components/steps/*` |

## File structure
```
agent/        Eve agent: model, channel auth, instructions, tools
app/          Next pages and API routes (board, coach, stt-token, tts)
components/   Board and the five session steps
hooks/        Browser speech and run hooks
lib/          Pure logic (tested) + lib/client browser helpers
scripts/      Process supervisor for dev and start
devpost/      Scope, PRD, spec, checklist, app map
```

## External services and keys
| Variable | Used by | Required |
|---|---|---|
| `OPENAI_API_KEY` | Eve agent | yes |
| `ASSEMBLYAI_API_KEY` | `/api/stt-token` | yes |
| `SPEECHMATICS_API_KEY` | `/api/tts` | yes |
| `NEATLOGS_API_KEY` | tracing | no |
| `AGENT_SHARED_KEY` | Next ↔ Eve auth | no (generated) |

See `.env.example`.

## Failure modes
- Missing key → `MissingConfig` → readable 5xx JSON, shown in the UI.
- Agent returns an invalid board → `repairBoard`, then `validateBoard`; still invalid → error, nothing saved.
- Speech socket drops → listener reports error; typed walkthrough remains.
- `localStorage` quota → previews dropped before session data.

## Simplifications
No database or accounts; Eve state on the Render disk is the only server storage. English only.

## Open issues
- Next.js printed a security advisory for 16.4.0 during `npm run dev`; upgrade pending.
