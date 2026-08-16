import { ADMISSION_SEVERITIES } from "@/lib/constants";

// Deliberately steps up in weight as well as hue — colour alone shouldn't be
// the only signal that a case is critical.
const SEVERITY_STYLES: Record<string, string> = {
  routine: "bg-gray-100 text-gray-700 border-gray-200",
  high: "bg-amber-50 text-amber-800 border-amber-200",
  urgent: "bg-orange-100 text-orange-800 border-orange-300 font-semibold",
  critical: "bg-red-100 text-red-800 border-red-300 font-bold",
};

const LABELS: Record<string, string> = Object.fromEntries(
  ADMISSION_SEVERITIES.map((s) => [s.key, s.label]),
);

export default function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full border text-xs capitalize ${
        SEVERITY_STYLES[severity] || SEVERITY_STYLES.routine
      }`}
    >
      {LABELS[severity] || severity}
    </span>
  );
}
