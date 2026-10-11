import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { BoardSchema } from "../coach";
import { checkFile, extractSlides } from "../pdf";
import { newSessionId } from "../session";
import { saveSession, type LocalSession, type Rubric, type SlideInfo } from "./store";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function readDeck(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  slides: SlideInfo[];
  images: { index: number; dataUrl: string }[];
}> {
  const error = checkFile(file);
  if (error) {
    throw new Error(error);
  }

  const data = await file.arrayBuffer();
  const extracted = await extractSlides(data);
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const slides: SlideInfo[] = [];
  const images: { index: number; dataUrl: string }[] = [];

  try {
    for (const slide of extracted) {
      const page = await pdf.getPage(slide.index + 1);
      try {
        const renderAtWidth = async (
          width: number,
          mimeType: string,
          quality?: number,
        ): Promise<string> => {
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: width / baseViewport.width,
          });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Could not render a PDF page.");
          }

          try {
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            return canvas.toDataURL(mimeType, quality);
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        };

        const preview = await renderAtWidth(320, "image/jpeg", 0.7);
        slides.push({
          index: slide.index,
          text: slide.text,
          preview,
        });
        if (slide.needsImage) {
          images.push({
            index: slide.index,
            dataUrl: await renderAtWidth(1024, "image/png"),
          });
        }
        onProgress?.(slides.length, extracted.length);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdf.destroy();
  }

  return { slides, images };
}

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }
  const error = body.error;
  if (typeof error === "string") {
    return error;
  }
  if (Array.isArray(error)) {
    return error.map(String).join(" ");
  }
  return fallback;
}

export async function createSession(
  file: File,
  rubric: Rubric,
  onStage?: (stage: "reading" | "coach") => void,
): Promise<LocalSession> {
  onStage?.("reading");
  const deck = await readDeck(file);
  onStage?.("coach");
  const id = newSessionId();
  const response = await fetch("/api/board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rubric,
      slides: deck.slides.map(({ index, text }) => ({ index, text })),
      images: deck.images,
    }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(body, "The coach could not build a board."));
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("eveSessionId" in body) ||
    typeof body.eveSessionId !== "string" ||
    !("board" in body)
  ) {
    throw new Error("The coach could not build a board.");
  }
  const parsedBoard = BoardSchema.safeParse(body.board);
  if (!parsedBoard.success) {
    throw new Error("The coach could not build a board.");
  }

  const session: LocalSession = {
    id,
    createdAt: new Date().toISOString(),
    rubric,
    targetSec: 300,
    eveSessionId: body.eveSessionId,
    board: parsedBoard.data,
    slides: deck.slides,
    runs: [],
  };
  saveSession(session);
  return session;
}
