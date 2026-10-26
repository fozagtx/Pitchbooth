// SPDX-License-Identifier: MIT
export function newSessionId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function isSessionId(value: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(value);
}
