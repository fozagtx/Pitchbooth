// SPDX-License-Identifier: MIT
export class MissingConfig extends Error {
  constructor(readonly names: string[]) {
    super(`Missing configuration: ${names.join(", ")}`);
    this.name = "MissingConfig";
  }
}

export function requireEnv<const Names extends readonly string[]>(
  names: Names,
): Record<Names[number], string> {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new MissingConfig([...missing]);
  }

  return Object.fromEntries(
    names.map((name) => [name, process.env[name]!]),
  ) as Record<Names[number], string>;
}
