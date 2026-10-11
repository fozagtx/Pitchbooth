export type Act = "Open" | "Problem" | "Product" | "Proof" | "Close" | string;

export interface Cue {
  id: string;
  slot: number;
  act: string;
  label: string;
  icon: string;
  section: string;
  keywords: string[];
}

export interface Board {
  cues: Cue[];
  opener: string;
  closer: string;
  gaps: string[];
}

export type CueState = "idle" | "current" | "reached" | "skipped";

export interface CueView {
  icon?: string;
  text?: string;
  section?: string;
  lit: boolean;
  skipped: boolean;
}

export function validateBoard(board: Board): string[] {
  const errors: string[] = [];
  const cueCount = board.cues.length;

  if (cueCount < 5 || cueCount > 7) {
    errors.push("A board must have 5 to 7 cues.");
  }

  const slots = board.cues.map((cue) => cue.slot);
  const uniqueSlots = new Set(slots);
  if (
    uniqueSlots.size !== cueCount ||
    slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= cueCount)
  ) {
    errors.push("Cue slots must be unique and exactly 0 through n-1.");
  }

  const acts = new Set(board.cues.map((cue) => cue.act));
  if (acts.size < 3 || acts.size > 4) {
    errors.push("A board must use 3 or 4 distinct acts.");
  }

  if (board.gaps.length > 3) {
    errors.push("A board can have no more than 3 gaps.");
  }

  for (const cue of board.cues) {
    const words = cue.label.trim().split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 3) {
      errors.push(`Cue ${cue.id} labels must have 1 to 3 words.`);
    }
    if (/[.!?]/.test(cue.label)) {
      errors.push(`Cue ${cue.id} labels cannot contain sentence punctuation.`);
    }
    if (cue.keywords.length === 0) {
      errors.push(`Cue ${cue.id} must have at least one keyword.`);
    }
  }

  return errors;
}

export function hintFor(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/\d/.test(word) ? word : word[0]))
    .join(" ");
}

export function levelForRun(runNumber: number): number {
  return Math.min(4, Math.max(1, Math.floor(runNumber) || 1));
}

export function cueView(
  cue: Cue,
  level: number,
  state: CueState,
  revealed: boolean,
): CueView {
  const skipped = state === "skipped";

  if (level === 1) {
    return {
      icon: cue.icon,
      text: cue.label,
      section: cue.section,
      lit: false,
      skipped,
    };
  }

  if (level === 2) {
    return {
      icon: cue.icon,
      text: hintFor(cue.label),
      lit: false,
      skipped,
    };
  }

  if (level === 3) {
    return {
      lit: state === "current" || state === "reached",
      skipped,
    };
  }

  if (level === 4 && revealed) {
    return {
      icon: cue.icon,
      text: cue.label,
      lit: false,
      skipped,
    };
  }

  return { lit: false, skipped };
}

export function renameCue(
  board: Board,
  id: string,
  newLabel: string,
): Board {
  const label = newLabel.trim();
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) {
    throw new Error("Cue labels must have 1 to 3 words.");
  }

  return {
    ...board,
    cues: board.cues.map((cue) =>
      cue.id === id
        ? { ...cue, label, keywords: [...cue.keywords, ...words] }
        : cue,
    ),
  };
}
