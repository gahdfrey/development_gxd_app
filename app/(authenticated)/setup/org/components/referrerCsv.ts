/** CSV handling for the referrer bulk upload (Setup → Referrers). */

export const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank", "FCMB",
  "Globus Bank", "GTBank", "Heritage Bank", "Jaiz Bank", "Keystone Bank",
  "Kuda Bank", "Moniepoint", "OPay", "PalmPay", "Polaris Bank", "Providus Bank",
  "Stanbic IBTC", "Standard Chartered", "Sterling Bank", "SunTrust Bank",
  "Titan Trust Bank", "UBA", "Union Bank", "Unity Bank", "Wema Bank", "Zenith Bank",
];

export interface ReferrerCsvRow {
  name: string;
  accountName: string;
  accountNumber: string;
  bank: string;
  whatsappNumber: string;
}

export const CSV_HEADERS = ["name", "account name", "account number", "bank", "whatsapp number"];

const HEADER_TO_FIELD: Record<string, keyof ReferrerCsvRow> = {
  name: "name",
  "account name": "accountName",
  "account number": "accountNumber",
  bank: "bank",
  "whatsapp number": "whatsappNumber",
  whatsapp: "whatsappNumber",
};

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Read an uploaded referrers CSV. The first row must be the header row; the
 * column order doesn't matter, but all five columns must be present.
 */
export function parseReferrersCsv(text: string): { rows: ReferrerCsvRow[]; error?: string } {
  const table = parseCsv(text.replace(/^﻿/, ""));
  if (table.length < 2) return { rows: [], error: "The file has no referrer rows under the header row." };

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/[_\s]+/g, " "));
  const fieldIndex = new Map<keyof ReferrerCsvRow, number>();
  header.forEach((h, i) => {
    const field = HEADER_TO_FIELD[h];
    if (field && !fieldIndex.has(field)) fieldIndex.set(field, i);
  });
  const missing = CSV_HEADERS.filter((h) => !fieldIndex.has(HEADER_TO_FIELD[h]));
  if (missing.length) {
    return { rows: [], error: `Missing column(s): ${missing.join(", ")}. Download the template to see the expected format.` };
  }

  const cell = (r: string[], f: keyof ReferrerCsvRow) => (r[fieldIndex.get(f)!] ?? "").trim();
  const rows = table.slice(1).map((r) => ({
    name: cell(r, "name"),
    accountName: cell(r, "accountName"),
    accountNumber: cell(r, "accountNumber"),
    bank: cell(r, "bank"),
    whatsappNumber: cell(r, "whatsappNumber"),
  }));
  return { rows };
}

export function downloadReferrersTemplate() {
  const csv = [
    CSV_HEADERS.join(","),
    "Dr. Adaeze Okafor,Adaeze Okafor,0123456789,Access Bank,08031234567",
    "Mercy Clinic Ikeja,Mercy Clinic Ltd,2034567891,GTBank,+2348052345678",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "referrers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
