// SPDX-License-Identifier: MIT
export async function register() {
  const apiKey = process.env.NEATLOGS_API_KEY;
  if (!apiKey) return;

  const { init } = await import("neatlogs");
  await init({ apiKey, workflowName: "pitchbooth" });
}
