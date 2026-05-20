/**
 * Captures each child of a container as a separate landscape A4 page and
 * downloads the resulting PDF. Each page element should be sized 1123x794px.
 */
export async function exportReportToPdf(
  pagesContainer: HTMLElement,
  filename: string,
) {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const pages = Array.from(pagesContainer.querySelectorAll<HTMLElement>("[data-pdf-page]"));

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: "#0b0b14",
      useCORS: true,
      logging: false,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  pdf.save(filename);
}

export function buildFilename(scenarioName: string) {
  const safe =
    (scenarioName || "Scenario").replace(/[^a-z0-9\-_]+/gi, "_").slice(0, 40) ||
    "Scenario";
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return `CashFlowTimeMachine_${safe}_${stamp}.pdf`;
}
