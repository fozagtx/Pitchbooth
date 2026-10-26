// SPDX-License-Identifier: MIT
import { defineState } from "eve/context";
import type { Board } from "./board";

export interface SessionRecord {
  board: Board | null;
  notes: Array<{ cueId: string; note: string }>;
  runs: Array<Record<string, unknown>>;
}

export const sessionRecord = defineState<SessionRecord>(
  "pitchbooth.record",
  () => ({ board: null, notes: [], runs: [] }),
);
