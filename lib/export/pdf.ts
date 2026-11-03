import { jsPDF } from "jspdf";

type PdfSection = { title: string; body: string };

function parseWorkingPlain(plain: string): PdfSection[] {
  const parts = plain.split(/\n(?=##\s)/);
  const sections: PdfSection[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^##\s+(.+?)\n\n([\s\S]*)$/);
    if (m) {
      sections.push({ title: m[1]!.trim(), body: m[2]!.trim() });
    } else if (trimmed.startsWith("# ")) {
      const nl = trimmed.indexOf("\n");
      sections.push({
        title: trimmed.slice(2, nl < 0 ? undefined : nl).trim(),
        body: nl < 0 ? "" : trimmed.slice(nl).trim(),
      });
    } else {
      sections.push({ title: "", body: trimmed });
    }
  }
  return sections.length ? sections : [{ title: "Draft", body: plain }];
}

function stripMdImages(text: string): {
  text: string;
  images: Array<{ alt: string; src: string }>;
} {
  const images: Array<{ alt: string; src: string }> = [];
  const cleaned = text.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_full, alt: string, src: string) => {
      images.push({ alt, src });
      return "";
    },
  );
  return { text: cleaned.replace(/\n{3,}/g, "\n\n").trim(), images };
}

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const absolute =
      src.startsWith("http://") || src.startsWith("https://")
        ? src
        : new URL(src, window.location.origin).href;
    const res = await fetch(absolute);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Client-side PDF from workingPlain. Same-origin uploads preferred; remote images best-effort.
 */
export async function downloadDraftPdf(
  workingPlain: string,
  filename = "editorial-draft.pdf",
): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sections = parseWorkingPlain(workingPlain);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!;
    if (i > 0) {
      ensureSpace(36);
      y += 12;
    }

    if (section.title) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(i === 0 ? 16 : 13);
      const titleLines = doc.splitTextToSize(section.title, maxWidth) as string[];
      doc.text(titleLines, margin, y);
      y += titleLines.length * 16 + 8;
    }

    const { text, images } = stripMdImages(section.body);
    if (text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const bodyLines = doc.splitTextToSize(text, maxWidth) as string[];
      for (const line of bodyLines) {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 14;
      }
    }

    for (const img of images) {
      const dataUrl = await loadImageDataUrl(img.src);
      if (!dataUrl) continue;
      const format = dataUrl.includes("image/png")
        ? "PNG"
        : dataUrl.includes("image/webp")
          ? "WEBP"
          : "JPEG";
      const imgW = Math.min(maxWidth, 280);
      const imgH = 160;
      ensureSpace(imgH + 12);
      try {
        doc.addImage(dataUrl, format, margin, y, imgW, imgH);
        y += imgH + 12;
      } catch {
        // skip unreadable image
      }
    }
  }

  doc.save(filename);
}
