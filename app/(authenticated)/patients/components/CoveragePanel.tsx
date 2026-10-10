"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { ShieldCheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import EligibilityCheckForm from "./EligibilityCheckForm";

interface EligibilityCheckRow {
  id: number;
  channel: string;
  result: "eligible" | "not_eligible" | "pending";
  reference: string | null;
  notes: string | null;
  checkedAt: string;
  checkedByFirstname: string | null;
  checkedByLastname: string | null;
}

interface CoverageRow {
  id: number;
  hmoId: number;
  hmoName: string | null;
  planName: string | null;
  membershipNumber: string | null;
  relationship: "principal" | "spouse" | "child" | "other";
  principalName: string | null;
  principalMembershipNumber: string | null;
  primaryProvider: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: "active" | "suspended" | "ended";
  notes: string | null;
  checks: EligibilityCheckRow[];
}

interface CoverageResponse {
  inEffect: { coverageId: number; eligibilityStale: boolean } | null;
  coverages: CoverageRow[];
}

interface HmoOption {
  id: number;
  name: string;
}

const RELATIONSHIP_LABEL: Record<CoverageRow["relationship"], string> = {
  principal: "Principal member",
  spouse: "Dependant — spouse",
  child: "Dependant — child",
  other: "Dependant — other",
};

const CHANNEL_LABEL: Record<string, string> = {
  phone: "phone",
  whatsapp: "WhatsApp",
  hmo_portal: "HMO portal",
  email: "email",
  card: "enrollee card",
  other: "other",
};

const STATUS_STYLE: Record<CoverageRow["status"], string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-100 text-gray-600 border-gray-300",
};

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

type FormState = {
  hmoId: string;
  membershipNumber: string;
  planName: string;
  relationship: CoverageRow["relationship"];
  principalName: string;
  principalMembershipNumber: string;
  primaryProvider: string;
  validFrom: string;
  validTo: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  hmoId: "",
  membershipNumber: "",
  planName: "",
  relationship: "principal",
  principalName: "",
  principalMembershipNumber: "",
  primaryProvider: "",
  validFrom: "",
  validTo: "",
  notes: "",
};

function toForm(c: CoverageRow): FormState {
  return {
    hmoId: String(c.hmoId),
    membershipNumber: c.membershipNumber ?? "",
    planName: c.planName ?? "",
    relationship: c.relationship,
    principalName: c.principalName ?? "",
    principalMembershipNumber: c.principalMembershipNumber ?? "",
    primaryProvider: c.primaryProvider ?? "",
    validFrom: c.validFrom ?? "",
    validTo: c.validTo ?? "",
    notes: c.notes ?? "",
  };
}

/**
 * The patient's HMO enrollee records: the coverage billing uses today, its
 * eligibility-check history, and past/suspended coverages. Adding a new
 * active coverage ends the previous one.
 */
export default function CoveragePanel({ patientId, insuranceType }: { patientId: number; insuranceType: string }) {
  const key = `/api/patients/${patientId}/coverages`;
  const { data, isLoading, mutate } = useSWR<CoverageResponse>(key, fetcher);
  const { data: hmoOptions = [] } = useSWR<HmoOption[]>("/api/hmo", fetcher);

  // null = closed, "new" = adding, number = editing that coverage
  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const refresh = () => {
    mutate();
    // insuranceType / HMO on the patient record mirror the active coverage.
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/patients"), undefined, { revalidate: true });
  };

  const active = data?.coverages.find((c) => c.status === "active") ?? null;
  const others = data?.coverages.filter((c) => c.id !== active?.id) ?? [];
  const inEffect = data?.inEffect && active && data.inEffect.coverageId === active.id ? data.inEffect : null;

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditing("new");
  };
  const openEdit = (c: CoverageRow) => {
    setForm(toForm(c));
    setFormError("");
    setEditing(c.id);
  };

  const save = async () => {
    setFormError("");
    setIsSaving(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? key : `${key}/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hmoId: Number(form.hmoId), ...(isNew && { status: "active" }) }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error || "Failed to save coverage");
        return;
      }
      setEditing(null);
      refresh();
    } catch {
      setFormError("Failed to save coverage");
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = async (c: CoverageRow, status: CoverageRow["status"]) => {
    const res = await fetch(`${key}/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error || "Failed to update coverage");
      return;
    }
    refresh();
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const eligibilityBadge = (c: CoverageRow) => {
    const last = c.checks[0];
    if (!last) {
      return <span className="text-xs font-medium text-amber-700">Eligibility never verified</span>;
    }
    if (last.result === "not_eligible") {
      return <span className="text-xs font-medium text-red-700">HMO said not eligible {daysAgo(last.checkedAt)}</span>;
    }
    if (last.result === "pending") {
      return <span className="text-xs font-medium text-amber-700">Awaiting HMO response ({daysAgo(last.checkedAt)})</span>;
    }
    return (
      <span className={`text-xs font-medium ${inEffect?.eligibilityStale ? "text-amber-700" : "text-green-700"}`}>
        Verified eligible {daysAgo(last.checkedAt)} via {CHANNEL_LABEL[last.channel] ?? last.channel}
        {inEffect?.eligibilityStale && " — due for re-check"}
      </span>
    );
  };

  const formFields = (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm font-semibold text-gray-900">{editing === "new" ? "Add HMO coverage" : "Edit coverage"}</p>
      {formError && <p className="text-xs text-red-600">{formError}</p>}
      {editing === "new" && active && (
        <p className="text-xs text-amber-700">
          Saving will end the current {active.hmoName} coverage.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-gray-600">
          HMO
          <select value={form.hmoId} onChange={(e) => setForm({ ...form, hmoId: e.target.value })} className={inputClass}>
            <option value="">Select…</option>
            {hmoOptions.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Membership / policy no.
          <input type="text" value={form.membershipNumber} onChange={(e) => setForm({ ...form, membershipNumber: e.target.value })} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Plan <span className="font-normal text-gray-400">(optional)</span>
          <input type="text" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} placeholder="e.g. Gold, Family Plus" className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Member type
          <select
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value as FormState["relationship"] })}
            className={inputClass}
          >
            {Object.entries(RELATIONSHIP_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        {form.relationship !== "principal" && (
          <>
            <label className="block text-xs font-medium text-gray-600">
              Principal member&apos;s name
              <input type="text" value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Principal&apos;s membership no.
              <input type="text" value={form.principalMembershipNumber} onChange={(e) => setForm({ ...form, principalMembershipNumber: e.target.value })} className={inputClass} />
            </label>
          </>
        )}
        <label className="block text-xs font-medium text-gray-600">
          Valid from <span className="font-normal text-gray-400">(optional)</span>
          <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Valid to <span className="font-normal text-gray-400">(optional)</span>
          <input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
          Primary care provider (capitation) <span className="font-normal text-gray-400">(optional)</span>
          <input type="text" value={form.primaryProvider} onChange={(e) => setForm({ ...form, primaryProvider: e.target.value })} placeholder="Facility the enrollee is registered with" className={inputClass} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving || !form.hmoId || !form.membershipNumber.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save coverage"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Insurance &amp; HMO coverage</h3>
        {editing === null && (
          <button onClick={openNew} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="h-4 w-4" />
            {active ? "Change HMO" : "Add coverage"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-20 rounded-xl bg-gray-50 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {editing === "new" && formFields}

          {active ? (
            editing === active.id ? (
              formFields
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {active.hmoName}
                        {active.planName && <span className="font-normal text-gray-500"> · {active.planName}</span>}
                      </p>
                      <p className="text-sm text-gray-700">No. {active.membershipNumber ?? <span className="text-red-600">missing</span>}</p>
                      <p className="text-xs text-gray-500">
                        {RELATIONSHIP_LABEL[active.relationship]}
                        {active.relationship !== "principal" &&
                          ` of ${active.principalName ?? ""}${active.principalMembershipNumber ? ` (${active.principalMembershipNumber})` : ""}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Valid {active.validFrom ?? "—"} → {active.validTo ?? "open-ended"}
                        {!inEffect && <span className="ml-1 font-medium text-red-600">(not in effect today — billed self-pay)</span>}
                      </p>
                      <div className="mt-1">{eligibilityBadge(active)}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE.active}`}>Active</span>
                </div>

                {checkingId === active.id ? (
                  <div className="mt-3">
                    <EligibilityCheckForm
                      patientId={patientId}
                      coverageId={active.id}
                      onCancel={() => setCheckingId(null)}
                      onSaved={() => {
                        setCheckingId(null);
                        mutate();
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setCheckingId(active.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      Verify eligibility
                    </button>
                    <button onClick={() => openEdit(active)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => setStatus(active, "suspended")} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-50">
                      Suspend
                    </button>
                    <button onClick={() => setStatus(active, "ended")} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      End coverage
                    </button>
                  </div>
                )}

                {active.checks.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
                    {active.checks.slice(0, 5).map((k) => (
                      <li key={k.id} className="text-xs text-gray-600">
                        <span className={k.result === "eligible" ? "text-green-700" : k.result === "not_eligible" ? "text-red-700" : "text-amber-700"}>
                          {k.result === "eligible" ? "Eligible" : k.result === "not_eligible" ? "Not eligible" : "Pending"}
                        </span>
                        {" · "}
                        {new Date(k.checkedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} via{" "}
                        {CHANNEL_LABEL[k.channel] ?? k.channel}
                        {k.checkedByFirstname && ` by ${k.checkedByFirstname} ${k.checkedByLastname ?? ""}`}
                        {k.reference && ` · ref ${k.reference}`}
                        {k.notes && ` · ${k.notes}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : (
            editing !== "new" && (
              <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                No active HMO coverage — billed as self-pay
                {insuranceType && insuranceType !== "hmo" && <span className="text-gray-400"> ({insuranceType})</span>}.
              </div>
            )
          )}

          {others.length > 0 && (
            <div>
              <button onClick={() => setShowHistory((v) => !v)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                {showHistory ? "Hide" : "Show"} past coverages ({others.length})
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-2">
                  {others.map((c) =>
                    editing === c.id ? (
                      <li key={c.id}>{formFields}</li>
                    ) : (
                      <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{c.hmoName}</span>
                          <span className="text-gray-500"> · {c.membershipNumber ?? "no number"}</span>
                          <span className="block text-xs text-gray-500">{c.validFrom ?? "—"} → {c.validTo ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[c.status]}`}>
                            {c.status === "suspended" ? "Suspended" : "Ended"}
                          </span>
                          <button onClick={() => setStatus(c, "active")} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                            Reactivate
                          </button>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
