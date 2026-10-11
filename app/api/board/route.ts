import { agentClient, turnFailure } from "@/lib/agent-client";
import { limitResponse } from "@/lib/api";
import { validateBoard } from "@/lib/board";
import { BoardRequestSchema, BoardSchema } from "@/lib/coach";
import { MissingConfig, requireEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const limited = limitResponse(request, "sessions");
  if (limited) return limited;

  try {
    requireEnv(["OPENAI_API_KEY"]);
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
  const parsed = BoardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { rubric, slides, images } = parsed.data;
  const message = [
    { type: "text" as const, text: JSON.stringify({ kind: "board", rubric, slides }) },
    ...images.flatMap(({ index, dataUrl }) => [
      { type: "text" as const, text: `Image for slide ${index}.` },
      {
        type: "file" as const,
        data: dataUrl,
        mediaType: "image/png",
        filename: `slide-${index}.png`,
      },
    ]),
  ];

  try {
    const { session, response } = await agentClient().sessions.create({
      message,
      outputSchema: BoardSchema,
    });
    const result = await response.result();
    if (result.status !== "completed" || !result.data) {
      const reason = turnFailure(result);
      console.error("[board] eve turn failed", reason ?? result.status);
      return Response.json({
        error: `The coach could not build a board.${reason ? ` ${reason}` : ""}`,
      }, { status: 502 });
    }

    const errors = validateBoard(result.data);
    if (errors.length > 0) {
      return Response.json({ error: errors }, { status: 502 });
    }
    return Response.json({ eveSessionId: response.sessionId, board: result.data });
  } catch (error) {
    console.error("[board] agent call threw", error);
    return Response.json({ error: "The coach could not build a board." }, { status: 502 });
  }
}
