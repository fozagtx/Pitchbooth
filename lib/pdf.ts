import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const MAX_PAGES = 20;
export const MAX_BYTES = 20 * 1024 * 1024;

export function checkFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const isPdf =
    file.type.toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return [
      "Export slides as PDF first:",
      "PowerPoint: File > Export > Create PDF/XPS.",
      "Keynote: File > Export To > PDF.",
      "Google Slides: File > Download > PDF Document.",
    ].join("\n");
  }

  if (file.size > MAX_BYTES) {
    return "PDF files must be 20 MB or smaller.";
  }

  return null;
}

export interface Slide {
  index: number;
  text: string;
  needsImage: boolean;
}

export async function extractSlides(data: ArrayBuffer): Promise<Slide[]> {
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDFs can have no more than ${MAX_PAGES} pages.`);
    }

    const slides: Slide[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      slides.push({
        index: pageNumber - 1,
        text,
        needsImage: text.trim().length < 20,
      });
      page.cleanup();
    }

    return slides;
  } finally {
    await pdf.destroy();
  }
}
