export function normalizeWord(word: string): string {
  let normalized = word
    .toLowerCase()
    .replace(/['’]s$/u, "")
    .replace(/[^\p{L}\p{N}$%]/gu, "");

  if (normalized.endsWith("s") && normalized.length > 3) {
    normalized = normalized.slice(0, -1);
  } else if (normalized.endsWith("ing") && normalized.length > 5) {
    normalized = normalized.slice(0, -3);
  } else if (normalized.endsWith("ed") && normalized.length > 4) {
    normalized = normalized.slice(0, -2);
  }

  return normalized;
}

export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
}
