// SPDX-License-Identifier: MIT
import type { LocalSession } from "@/lib/client/store";

export type Step = "board" | "walkthrough" | "run" | "score" | "takeaway";

export interface StepProps {
  session: LocalSession;
  update: (fn: (s: LocalSession) => LocalSession) => void;
  go: (step: Step) => void;
}
