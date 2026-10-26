// SPDX-License-Identifier: MIT
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

function stripDashValues(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/(\d)\u2013(\d)/gu, "$1-$2")
      .replace(/\s*[\u2014\u2013]\s*/gu, ", ");
  }

  if (Array.isArray(value)) {
    return value.map(stripDashValues);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, stripDashValues(entry)]),
  );
}

export function stripDashes<T>(value: T): T {
  return stripDashValues(value) as T;
}
