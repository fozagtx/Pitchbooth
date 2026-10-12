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

function hasInvalidLabelPunctuation(label: string): boolean {
  const characters = label.split("");
  return characters.some((character, index) => {
    if (character === "!" || character === "?") {
      return true;
    }
    if (character !== ".") {
      return false;
    }
    return (
      index === 0 ||
      index === characters.length - 1 ||
      !/\d/.test(characters[index - 1]) ||
      !/\d/.test(characters[index + 1])
    );
  });
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
    if (hasInvalidLabelPunctuation(cue.label)) {
      errors.push(`Cue ${cue.id} labels cannot contain sentence punctuation.`);
    }
    if (cue.keywords.length === 0) {
      errors.push(`Cue ${cue.id} must have at least one keyword.`);
    }
  }

  return errors;
}

export function repairBoard(board: Board): Board {
  const orderedCues = board.cues
    .map((cue, originalIndex) => ({ cue, originalIndex }))
    .sort((a, b) => {
      const aSlotValid =
        Number.isInteger(a.cue.slot) &&
        a.cue.slot >= 0 &&
        a.cue.slot < board.cues.length;
      const bSlotValid =
        Number.isInteger(b.cue.slot) &&
        b.cue.slot >= 0 &&
        b.cue.slot < board.cues.length;

      if (aSlotValid !== bSlotValid) {
        return aSlotValid ? -1 : 1;
      }
      if (aSlotValid && bSlotValid && a.cue.slot !== b.cue.slot) {
        return a.cue.slot - b.cue.slot;
      }
      return a.originalIndex - b.originalIndex;
    });

  const seenIds = new Set<string>();
  const cues = orderedCues.map(({ cue }, index) => {
    const characters = cue.label.split("");
    const label = characters
      .filter((character, characterIndex) => {
        if (character === "!" || character === "?") {
          return false;
        }
        if (character !== ".") {
          return true;
        }
        return (
          characterIndex > 0 &&
          characterIndex < characters.length - 1 &&
          /\d/.test(characters[characterIndex - 1]) &&
          /\d/.test(characters[characterIndex + 1])
        );
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 3)
      .join(" ");

    let id = cue.id;
    if (seenIds.has(id)) {
      const baseId = `${id}-${index}`;
      id = baseId;
      let suffix = 1;
      while (seenIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
    }
    seenIds.add(id);

    return {
      ...cue,
      id,
      slot: index,
      label,
      keywords: cue.keywords.length > 0 ? [...cue.keywords] : [label.toLowerCase()],
    };
  });

  return {
    ...board,
    cues,
    gaps: board.gaps.slice(0, 3),
  };
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
