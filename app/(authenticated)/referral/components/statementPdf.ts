import { formatRefDiscount } from "@/lib/referrals";
import { formatDateRangeLabel, type DateRange } from "@/lib/dateRange";
import { PAYMENT_LABEL, formatDate, type ReferrerStatement } from "./types";

// jsPDF's built-in fonts have no ₦ glyph, so amounts are printed as "NGN".
const ngn = (n: number) => `NGN ${n.toLocaleString()}`;

/**
 * Download a referrer's statement as a PDF: referrer and bank details, every
 * referred patient's test with amount, payment and discount, and the amount
 * owed (paid tests only — unpaid ones are shown as pending).
 */
export async function downloadStatementPdf(statement: ReferrerStatement, range: DateRange) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const { organisation, referrer, lines, totals } = statement;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(organisation?.name ?? "Referrer Statement", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Referrer statement", margin, 50);
  doc.text(`Period: ${formatDateRangeLabel(range)}`, pageWidth - margin, 32, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`, pageWidth - margin, 50, { align: "right" });

  // Referrer details
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${referrer.name}${referrer.code ? `  (${referrer.code})` : ""}`, margin, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Account: ${referrer.accountName} · ${referrer.accountNumber} · ${referrer.bank}`, margin, 118);
  doc.text(`WhatsApp: ${referrer.whatsappNumber}`, margin, 133);

  // Summary
  const summary = [
    ["Patients referred", String(totals.patients)],
    ["Tests paid", `${totals.paidTests} / ${totals.tests}`],
    ["Pending payment", ngn(totals.pendingAmount)],
    ["Amount owed", ngn(totals.amountOwed)],
  ];
  const boxWidth = (pageWidth - margin * 2 - 30) / 4;
  summary.forEach(([label, value], i) => {
    const x = margin + i * (boxWidth + 10);
    const owed = i === 3;
    doc.setDrawColor(owed ? 37 : 229, owed ? 99 : 231, owed ? 235 : 235);
    doc.setFillColor(owed ? 239 : 249, owed ? 246 : 250, owed ? 255 : 251);
    doc.roundedRect(x, 150, boxWidth, 46, 4, 4, "FD");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), x + 8, 166);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(owed ? 29 : 17, owed ? 78 : 24, owed ? 216 : 39);
    doc.text(value, x + 8, 186);
    doc.setFont("helvetica", "normal");
  });

  autoTable(doc, {
    startY: 214,
    margin: { left: margin, right: margin },
    head: [["#", "Patient", "Date registered", "Test done", "Amount", "Payment", "Discount"]],
    body: lines.map((l, i) => [
      String(i + 1),
      `${l.firstname} ${l.lastname}${l.mrn ? `\n${l.mrn}` : ""}`,
      formatDate(l.registeredAt),
      `${l.testName}${l.departmentName ? `\n${l.departmentName}` : ""}`,
      ngn(l.amount),
      PAYMENT_LABEL[l.paymentStatus ?? "not_paid"] ?? (l.paymentStatus ?? ""),
      // Show the rule only for percentages; a flat amount is the amount itself.
      l.discountType === "percent"
        ? `${ngn(l.discountAmount)}\n(${formatRefDiscount(l.discountType, l.discountValue)})`
        : ngn(l.discountAmount),
    ]),
    showFoot: "lastPage",
    foot: [["", "Total", "", `${totals.tests} test(s)`, ngn(totals.amount), "Owed", ngn(totals.amountOwed)]],
    styles: { fontSize: 9, cellPadding: 5, valign: "top" },
    headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold" },
    footStyles: { fillColor: [239, 246, 255], textColor: [17, 24, 39], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 24 }, 4: { halign: "right" }, 6: { halign: "right" } },
    didParseCell: (data) => {
      if ((data.section === "head" || data.section === "foot") && (data.column.index === 4 || data.column.index === 6)) {
        data.cell.styles.halign = "right";
      }
      // Discounts on unpaid/waived tests aren't owed: grey them out.
      if (data.section === "body" && data.column.index === 6 && lines[data.row.index]?.paymentStatus !== "paid") {
        data.cell.styles.textColor = [156, 163, 175];
      }
      if (data.section === "body" && data.column.index === 5) {
        const status = lines[data.row.index]?.paymentStatus;
        data.cell.styles.textColor = status === "paid" ? [21, 128, 61] : status === "waived" ? [107, 114, 128] : [180, 83, 9];
      }
    },
  });

  // Amount owed callout under the table
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(`Amount owed to ${referrer.name}: ${ngn(totals.amountOwed)}`, margin, finalY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    doc.splitTextToSize(
      `Owed on paid tests only. ${ngn(totals.pendingAmount)} more becomes owed when the remaining tests are paid; waived tests are not owed.`,
      pageWidth - margin * 2,
    ),
    margin,
    finalY + 16,
  );

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${p} of ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  const safeName = referrer.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`referrer-statement-${referrer.code ?? referrer.id}-${safeName}.pdf`);
}
