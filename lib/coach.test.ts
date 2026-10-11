import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";
import getSessionRecord from "../agent/tools/get_session_record";
import logNote from "../agent/tools/log_note";
import logRun from "../agent/tools/log_run";
import saveBoard from "../agent/tools/save_board";
import updateCue from "../agent/tools/update_cue";
import {
  BoardSchema,
  GradeOutputSchema,
  WalkthroughOutputSchema,
} from "./coach";

function expectStrictObjects(schema: unknown): void {
  if (!schema || typeof schema !== "object") {
    return;
  }
  const node = schema as Record<string, unknown>;
  const properties = node.properties && typeof node.properties === "object"
    ? node.properties as Record<string, unknown>
    : null;

  if (node.type === "object" || properties) {
    expect(node.additionalProperties).toBe(false);
    expect([...(node.required as string[] | undefined ?? [])].sort()).toEqual(
      Object.keys(properties ?? {}).sort(),
    );
  }

  for (const child of Object.values(properties ?? {})) {
    expectStrictObjects(child);
  }
  if (Array.isArray(node.items)) {
    node.items.forEach(expectStrictObjects);
  } else {
    expectStrictObjects(node.items);
  }
  for (const key of ["anyOf", "oneOf", "allOf", "$defs"] as const) {
    const children = node[key];
    if (Array.isArray(children)) {
      children.forEach(expectStrictObjects);
    } else {
      expectStrictObjects(children);
    }
  }
  if (node.additionalProperties && typeof node.additionalProperties === "object") {
    expectStrictObjects(node.additionalProperties);
  }
}

const strictSchemas: [string, unknown][] = [
  ["WalkthroughOutputSchema", WalkthroughOutputSchema],
  ["GradeOutputSchema", GradeOutputSchema],
  ["BoardSchema", BoardSchema],
  ["get_session_record input", getSessionRecord.inputSchema],
  ["log_note input", logNote.inputSchema],
  ["log_run input", logRun.inputSchema],
  ["save_board input", saveBoard.inputSchema],
  ["update_cue input", updateCue.inputSchema],
] as const;

describe.each(strictSchemas)("strict JSON Schema: %s", (_name, schema) => {
  it("closes every object and requires every property", () => {
    expectStrictObjects(z.toJSONSchema(schema as ZodType));
  });
});
