// SPDX-License-Identifier: MIT
import {
  agentClient,
  failureCode,
  sendWithRetry,
  turnFailure,
} from "@/lib/agent-client";
import { limitResponse } from "@/lib/api";
import { repairBoard, validateBoard } from "@/lib/board";
import { BoardRequestSchema, BoardSchema } from "@/lib/coach";
import { MissingConfig, requireEnv } from "@/lib/env";
import { stripDashes } from "@/lib/text";

export const runtime = "nodejs";

function invalidBoardResponse(errors: string[]): Response {
  console.error("[board] invalid board", errors);
  return Response.json({
    error: `The coach could not build a board. ${errors.join(" ")}`,
  }, { status: 502 });
}

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
    let result = await response.result();
    if (
      result.data === undefined &&
      failureCode(result) === "OUTPUT_SCHEMA_NOT_FULFILLED"
    ) {
      result = await sendWithRetry(
        response.sessionId,
        message,
        BoardSchema,
        result,
      );
    }
    if (result.status === "failed" || result.data === undefined) {
      const reason = turnFailure(result);
      console.error("[board] eve turn failed", reason ?? result.status);
      return Response.json({
        error: `The coach could not build a board.${reason ? ` ${reason}` : ""}`,
      }, { status: 502 });
    }

    let board = repairBoard(result.data);
    let errors = validateBoard(board);
    if (errors.length > 0) {
      let fixResult;
      try {
        fixResult = await sendWithRetry(
          response.sessionId,
          JSON.stringify({ kind: "board_fix", errors, board }),
          BoardSchema,
        );
      } catch {
        return invalidBoardResponse(errors);
      }

      if (fixResult.status === "failed" || fixResult.data === undefined) {
        return invalidBoardResponse(errors);
      }

      board = repairBoard(fixResult.data);
      errors = validateBoard(board);
      if (errors.length > 0) {
        return invalidBoardResponse(errors);
      }
    }
    return Response.json({
      eveSessionId: response.sessionId,
      board: stripDashes(board),
    });
  } catch (error) {
    console.error("[board] agent call threw", error);
    return Response.json({ error: "The coach could not build a board." }, { status: 502 });
  }
}
