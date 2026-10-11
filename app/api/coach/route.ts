import { trace } from "neatlogs";
import { z } from "zod";
import { agentClient } from "@/lib/agent-client";
import { limitResponse } from "@/lib/api";
import {
  GradeOutputSchema,
  GradeTurnInputSchema,
  WalkthroughOutputSchema,
  WalkthroughTurnInputSchema,
} from "@/lib/coach";
import { MissingConfig, requireEnv } from "@/lib/env";

export const runtime = "nodejs";

const RequestSchema = z.object({
  eveSessionId: z.string().min(1),
  kind: z.enum(["walkthrough", "grade"]),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request): Promise<Response> {
  const limited = limitResponse(request, "turns");
  if (limited) return limited;

  try {
    requireEnv(["AGENT_SHARED_KEY", "OPENAI_API_KEY"]);
  } catch (error) {
    if (error instanceof MissingConfig) {
      return Response.json(
        { error: `Connect ${error.names.join(" and ")}` },
        { status: 503 },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { eveSessionId, kind, payload } = parsed.data;
  const input = { ...payload, kind };
  const walkthrough = kind === "walkthrough"
    ? WalkthroughTurnInputSchema.safeParse(input)
    : null;
  const grade = kind === "grade" ? GradeTurnInputSchema.safeParse(input) : null;
  if ((walkthrough && !walkthrough.success) || (grade && !grade.success)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await trace(
    {
      name: kind,
      kind: "WORKFLOW",
      sessionId: eveSessionId,
      captureInput: false,
      captureOutput: false,
    },
    async () => {
      const session = agentClient().sessions.attach(eveSessionId);
      if (kind === "walkthrough") {
        const response = await session.send(JSON.stringify(input), {
          outputSchema: WalkthroughOutputSchema,
        });
        return response.result();
      }
      const response = await session.send(JSON.stringify(input), {
        outputSchema: GradeOutputSchema,
      });
      return response.result();
    },
  ).catch(() => null);

  if (!result || result.status !== "completed" || !result.data) {
    return Response.json({ error: "The coach could not complete this turn." }, { status: 502 });
  }
  return Response.json({ result: result.data });
}
