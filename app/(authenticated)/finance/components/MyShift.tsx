"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { naira } from "./billing";

export interface ShiftTotals {
  cash: number;
  pos: number;
  transfer: number;
  count: number;
}

export interface CurrentShift {
  shift: { id: number; openedAt: string; openingFloat: number } | null;
  totals?: ShiftTotals;
}

export const CURRENT_SHIFT_KEY = "/api/cashier-shifts/current";

/** The signed-in cashier's open shift (shared SWR key across the page). */
export function useMyShift() {
  const { data, error, mutate, isLoading } = useSWR<CurrentShift>(CURRENT_SHIFT_KEY, fetcher);
  // An error here means the user can't take desk payments (no finance add/edit).
  return { shift: data?.shift ?? null, totals: data?.totals ?? null, mutate, isLoading, unavailable: !!error };
}

const toAmount = (v: string) => {
  const n = Number(v.replace(/,/g, ""));
  return v.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : null;
};

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Opening float + "Open shift". Used on the card and inside the settle modal. */
export function OpenShiftForm({ onOpened, compact = false }: { onOpened: () => void; compact?: boolean }) {
  const [float, setFloat] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = async () => {
    const amount = toAmount(float);
    if (amount == null) return setError("Enter the float in whole Naira");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cashier-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingFloat: amount }),
      });
      if (!res.ok) return setError((await res.json()).error || "Failed to open shift");
      onOpened();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <label className="block text-sm font-medium text-gray-700">
        Opening float <span className="font-normal text-gray-400">(cash in the drawer now, ₦)</span>
        <input value={float} onChange={(e) => setFloat(e.target.value)} inputMode="numeric" className={`mt-1 ${inputCls}`} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Opening…" : "Open shift"}
      </button>
    </div>
  );
}

/** "My shift" strip on the Finance page: open, running takings, cash-up. */
export function MyShiftCard({ onChanged }: { onChanged?: () => void }) {
  const { shift, totals, mutate, isLoading, unavailable } = useMyShift();
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  if (isLoading || unavailable) return null;

  const refresh = () => {
    mutate();
    onChanged?.();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      {shift && totals ? (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <BanknotesIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">My shift · open</p>
              <p className="text-xs text-gray-500">
                Since {new Date(shift.openedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                {" · "}float {naira(shift.openingFloat)} · {totals.count} payment{totals.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 lg:ml-auto text-sm">
            {([["Cash", totals.cash], ["POS", totals.pos], ["Transfer", totals.transfer]] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 px-3 py-1.5">
                <dt className="text-xs text-gray-500">{l}</dt>
                <dd className="font-semibold text-gray-900">{naira(v)}</dd>
              </div>
            ))}
          </dl>
          <button
            onClick={() => setClosing(true)}
            className="self-start lg:self-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close shift
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <BanknotesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">No open shift</p>
              <p className="text-xs text-gray-500">Open your shift to take cash, POS or transfer payments at the desk.</p>
            </div>
          </div>
          <button
            onClick={() => setOpening(true)}
            className="sm:ml-auto self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open shift
          </button>
        </div>
      )}

      <Modal isOpen={opening} onClose={() => setOpening(false)} title="Open cashier shift">
        <OpenShiftForm
          onOpened={() => {
            setOpening(false);
            refresh();
          }}
        />
      </Modal>
      {shift && totals && (
        <CloseShiftModal
          key={closing ? "open" : "closed"}
          isOpen={closing}
          shiftId={shift.id}
          openingFloat={shift.openingFloat}
          totals={totals}
          onClose={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Cash-up: the cashier enters what they counted per channel; the modal shows
 * the expected amount and the difference as they type. A difference needs a
 * note and goes to a supervisor for sign-off.
 */
export function CloseShiftModal({
  isOpen,
  shiftId,
  openingFloat,
  totals,
  onClose,
  onClosed,
  title = "Close shift — cash-up",
}: {
  isOpen: boolean;
  shiftId: number;
  openingFloat: number;
  totals: ShiftTotals;
  onClose: () => void;
  onClosed: () => void;
  title?: string;
}) {
  const [counted, setCounted] = useState({ cash: "", pos: "", transfer: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expected = { cash: openingFloat + totals.cash, pos: totals.pos, transfer: totals.transfer };
  const rows = [
    { key: "cash" as const, label: "Cash in drawer", hint: `float ${naira(openingFloat)} + cash taken ${naira(totals.cash)}` },
    { key: "pos" as const, label: "POS", hint: "total on the terminal's end-of-day report" },
    { key: "transfer" as const, label: "Bank transfer", hint: "transfers confirmed in the bank app" },
  ];
  const diffs = rows.map((r) => {
    const c = toAmount(counted[r.key]);
    return c == null ? null : c - expected[r.key];
  });
  const allEntered = diffs.every((d) => d != null);
  const balanced = allEntered && diffs.every((d) => d === 0);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cashier-shifts/${shiftId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedCash: counted.cash, countedPos: counted.pos, countedTransfer: counted.transfer, note }),
      });
      if (!res.ok) return setError((await res.json()).error || "Failed to close shift");
      onClosed();
    } finally {
      setBusy(false);
    }
  };

  const diffLabel = (d: number | null) =>
    d == null ? "—" : d === 0 ? "Matches" : d < 0 ? `Short ${naira(-d)}` : `Over ${naira(d)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Count the drawer and enter what you actually have for each payment type.</p>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["", "Expected", "Counted (₦)", "Difference"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-900">{r.label}</span>
                    <span className="block text-xs text-gray-500">{r.hint}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">{naira(expected[r.key])}</td>
                  <td className="px-3 py-2">
                    <input
                      value={counted[r.key]}
                      onChange={(e) => setCounted({ ...counted, [r.key]: e.target.value })}
                      inputMode="numeric"
                      aria-label={`Counted ${r.label}`}
                      className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td
                    className={`px-3 py-2 whitespace-nowrap font-medium ${
                      diffs[i] == null ? "text-gray-400" : diffs[i] === 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {diffLabel(diffs[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allEntered && !balanced && (
          <label className="block text-sm font-medium text-gray-700">
            Explain the difference <span className="text-red-600">*</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. ₦1,000 change given from personal cash; POS reversal pending"
              className={`mt-1 ${inputCls}`}
            />
            <span className="mt-1 block text-xs font-normal text-amber-700">
              A finance supervisor will need to sign off this difference.
            </span>
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !allEntered || (!balanced && !note.trim())}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Closing…" : balanced ? "Close shift" : "Close & send for sign-off"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
