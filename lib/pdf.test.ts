// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { checkFile, extractSlides, MAX_BYTES, MAX_PAGES } from "./pdf";

function makePdf(pageCount = 2): ArrayBuffer {
  const fontId = pageCount + 3;
  const contentId = fontId + 1;
  const content = "BT /F1 18 Tf 72 720 Td (Pitchbooth slide text) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from(
      { length: pageCount },
      (_, index) => `${index + 3} 0 R`,
    ).join(" ")}] /Count ${pageCount} >>`,
    ...Array.from({ length: pageCount }, (_, index) => {
      const contents = index === 0 ? `/Contents ${contentId} 0 R` : "";
      return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> ${contents} >>`;
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

describe("PDF handling", () => {
  it("accepts PDFs, explains exports for other formats, and enforces the byte limit", () => {
    expect(
      checkFile({ name: "deck.pdf", type: "application/pdf", size: MAX_BYTES }),
    ).toBeNull();

    const formatError = checkFile({
      name: "deck.pptx",
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 100,
    });
    expect(formatError).toContain("PowerPoint");
    expect(formatError).toContain("Keynote");
    expect(formatError).toContain("Google Slides");
    expect(formatError).toContain("File >");

    expect(
      checkFile({
        name: "large.pdf",
        type: "application/pdf",
        size: MAX_BYTES + 1,
      }),
    ).toContain("20 MB");
  });

  it("extracts text and marks sparse pages for image review", async () => {
    const slides = await extractSlides(makePdf());
    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({ index: 0, needsImage: false });
    expect(slides[0].text).toContain("Pitchbooth slide text");
    expect(slides[1]).toEqual({ index: 1, text: "", needsImage: true });
  });

  it("rejects PDFs over the page limit", async () => {
    await expect(extractSlides(makePdf(MAX_PAGES + 1))).rejects.toThrow("20");
  });
});
