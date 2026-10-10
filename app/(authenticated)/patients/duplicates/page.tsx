"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import PermissionDenied from "@/app/components/ui/PermissionDenied";
import { useToast } from "@/app/contexts/ToastContext";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface Person {
  id: number;
  mrn: string | null;
  firstname: string | null;
  lastname: string | null;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  countryCode: string | null;
  nin: string | null;
  createdAt: string;
}

interface Pair {
  a: Person;
  b: Person;
  score: number;
  level: "definite" | "likely" | "possible" | "unlikely";
  reasons: string[];
}

interface MergeRow {
  id: number;
  survivorId: number;
  survivorFirstname: string | null;
  survivorLastname: string | null;
  survivorMrn: string | null;
  mergedId: number;
  mergedFirstname: string | null;
  mergedLastname: string | null;
  mergedMrn: string | null;
  reason: string | null;
  matchScore: number | null;
  movedCount: number;
  walletTransfer: number | null;
  mergedAt: string;
  mergedByFirstname: string | null;
  mergedByLastname: string | null;
  undoneAt: string | null;
  undoReason: string | null;
}

const LEVEL_STYLE: Record<Pair["level"], string> = {
  definite: "bg-red-600 text-white",
  likely: "bg-red-100 text-red-800",
  possible: "bg-amber-100 text-amber-800",
  unlikely: "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Records management: likely duplicate patient records (scored on NIN,
 * phone, date of birth and fuzzy / sound-alike names) for side-by-side
 * review, merge into one record, or "not the same person". Merges can be
 * undone from the history tab.
 */
export default function DuplicatesPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"review" | "history">("review");
  const { data: pairs, error, isLoading, mutate } = useSWR<Pair[]>("/api/patients/duplicates", fetcher);
  const { data: merges = [], mutate: mutateMerges } = useSWR<MergeRow[]>(tab === "history" ? "/api/patients/merges" : null, fetcher);
  const [merging, setMerging] = useState<Pair | null>(null);
  const [keepId, setKeepId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [undoing, setUndoing] = useState<MergeRow | null>(null);
  const [undoReason, setUndoReason] = useState("");

  if (error && (error.status === 403 || error.info?.error?.includes?.("permission"))) {
    return <PermissionDenied moduleName="Patients" />;
  }

  const openMerge = (p: Pair) => {
    // Default: keep the older record (registered first).
    setKeepId(new Date(p.a.createdAt) <= new Date(p.b.createdAt) ? p.a.id : p.b.id);
    setReason("");
    setMergeError("");
    setMerging(p);
  };

  const doMerge = async () => {
    if (!merging || keepId == null) return;
    const mergedId = keepId === merging.a.id ? merging.b.id : merging.a.id;
    setBusy(true);
    setMergeError("");
    try {
      const res = await fetch("/api/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survivorId: keepId, mergedId, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMergeError(body.error || "Merge failed");
        return;
      }
      const moved = Object.values(body.moved as Record<string, number>).reduce((s, n) => s + n, 0);
      showToast(`Records merged — ${moved} item(s) moved${body.walletTransfer ? `, ₦${body.walletTransfer.toLocaleString()} wallet balance moved` : ""}`, "success");
      setMerging(null);
      mutate();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (p: Pair) => {
    const note = prompt(`Confirm ${p.a.firstname} ${p.a.lastname} and ${p.b.firstname} ${p.b.lastname} are DIFFERENT people. Optional note (e.g. "twins", "mother and daughter"):`);
    if (note === null) return;
    const res = await fetch("/api/patients/duplicates/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aId: p.a.id, bId: p.b.id, note }),
    });
    if (!res.ok) showToast((await res.json()).error || "Failed", "error");
    else mutate();
  };

  const doUndo = async () => {
    if (!undoing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/patients/merges/${undoing.id}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: undoReason }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || "Undo failed", "error");
        return;
      }
      showToast("Merge undone — both records restored", "success");
      setUndoing(null);
      setUndoReason("");
      mutateMerges();
      mutate();
    } finally {
      setBusy(false);
    }
  };

  const personCard = (p: Person, other: Person) => {
    const diff = (k: keyof Person) => (p[k] ?? "") !== (other[k] ?? "");
    const row = (label: string, k: keyof Person, value?: string | null) => (
      <div className="flex justify-between gap-3 py-1 text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`text-right ${diff(k) ? "font-semibold text-amber-800" : "text-gray-900"}`}>{value ?? (p[k] as string | null) ?? "—"}</span>
      </div>
    );
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white p-4">
        <Link href={`/patients/${p.id}/history`} target="_blank" className="font-semibold text-blue-700 hover:underline">
          {p.firstname} {p.lastname}
        </Link>
        <div className="mt-2 divide-y divide-gray-100">
          {row("MRN", "mrn")}
          {row("Date of birth", "dob")}
          {row("Sex", "gender")}
          {row("Phone", "phone", p.phone ? `${p.countryCode ?? ""} ${p.phone}` : null)}
          {row("NIN", "nin")}
          {row("Registered", "createdAt", fmtDate(p.createdAt))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Link href="/patients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Patients
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Duplicate patient records</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          One person with two records means split history — a doctor can miss an allergy or a result. Review each
          pair, then merge them into one record or confirm they are different people.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {(["review", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t === "review" ? `To review${pairs ? ` (${pairs.length})` : ""}` : "Merge history"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "review" &&
        (isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !pairs || pairs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">
            No likely duplicates found.
          </div>
        ) : (
          <div className="space-y-4">
            {pairs.map((p) => (
              <div key={`${p.a.id}-${p.b.id}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[p.level]}`}>
                      {p.level === "definite" ? "Same NIN" : p.level === "likely" ? "Likely same person" : "Possible match"} · {p.score}
                    </span>
                    <span className="text-xs text-gray-600">{p.reasons.join(" · ")}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => dismiss(p)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      Different people
                    </button>
                    <button onClick={() => openMerge(p)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      Merge…
                    </button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  {personCard(p.a, p.b)}
                  {personCard(p.b, p.a)}
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "history" &&
        (merges.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">No merges yet.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {merges.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="text-sm">
                    <p className="text-gray-900">
                      <span className="font-semibold">{m.mergedFirstname} {m.mergedLastname}</span> ({m.mergedMrn ?? "no MRN"}) merged into{" "}
                      <Link href={`/patients/${m.survivorId}/history`} className="font-semibold text-blue-700 hover:underline">
                        {m.survivorFirstname} {m.survivorLastname}
                      </Link>{" "}
                      ({m.survivorMrn})
                    </p>
                    <p className="text-xs text-gray-500">
                      {fmtDate(m.mergedAt)} by {m.mergedByFirstname} {m.mergedByLastname} · {m.movedCount} item(s) moved
                      {m.walletTransfer ? ` · ₦${m.walletTransfer.toLocaleString()} wallet moved` : ""}
                      {m.matchScore != null && ` · match ${m.matchScore}`}
                    </p>
                    {m.reason && <p className="text-xs text-gray-600">“{m.reason}”</p>}
                    {m.undoneAt && <p className="text-xs font-medium text-amber-700">Undone {fmtDate(m.undoneAt)}: {m.undoReason}</p>}
                  </div>
                  {!m.undoneAt && (
                    <button onClick={() => setUndoing(m)} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                      Undo merge
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

      <Modal isOpen={merging !== null} onClose={() => setMerging(null)} title="Merge into one record">
        {merging && (
          <div className="space-y-4">
            {mergeError && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{mergeError}</p>}
            <p className="text-sm text-gray-700">Which record do you want to keep?</p>
            {[merging.a, merging.b].map((p) => (
              <label key={p.id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${keepId === p.id ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                <input type="radio" checked={keepId === p.id} onChange={() => setKeepId(p.id)} className="mt-1" />
                <span>
                  <span className="font-semibold text-gray-900">{p.firstname} {p.lastname}</span> · {p.mrn} · DOB {p.dob ?? "—"}
                  <span className="block text-xs text-gray-500">Registered {fmtDate(p.createdAt)}</span>
                </span>
              </label>
            ))}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              Everything on the other record — visits, results, prescriptions, bills, payments, wallet balance, allergies,
              conditions, observations, admissions, HMO coverage — moves to the kept record. Its MRN is kept as a
              &ldquo;previous number&rdquo; so it can still be found. Missing details (NIN, next of kin) are copied over.
              You can undo this from Merge history.
            </div>
            <label className="block text-sm font-medium text-gray-700">
              How did you confirm this is the same person? *
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Checked with patient at front desk — registered twice, name misspelt"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMerging(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={doMerge} disabled={busy || !reason.trim() || keepId == null} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
                {busy ? "Merging..." : "Merge records"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={undoing !== null} onClose={() => setUndoing(null)} title="Undo merge">
        {undoing && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Split {undoing.mergedFirstname} {undoing.mergedLastname} back out of {undoing.survivorFirstname} {undoing.survivorLastname}? The{" "}
              {undoing.movedCount} item(s) moved at merge go back. Anything recorded on the kept record since the merge stays there.
            </p>
            <input
              value={undoReason}
              onChange={(e) => setUndoReason(e.target.value)}
              placeholder="Reason (e.g. different people — siblings)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setUndoing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={doUndo} disabled={busy || !undoReason.trim()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">
                {busy ? "Undoing..." : "Undo merge"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
