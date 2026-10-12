import { defineAgent } from "eve";
import { openai } from "eve/models/openai";

export default defineAgent({
  model: openai("gpt-5-mini"),
  reasoning: "low",
  defaultTools: false,
  limits: {
    maxInputTokensPerSession: 600_000,
    maxOutputTokensPerSession: 40_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1000,
  },
});
