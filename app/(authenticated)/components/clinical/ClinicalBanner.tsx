"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ExclamationTriangleIcon, CheckCircleIcon, HeartIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { activeAllergies, clinicalKey, problemLabel, SEVERITY_LABEL, type ClinicalSummary } from "./types";

interface ClinicalBannerProps {
  patientId: number;
  /** Shows a "Update" link that calls this (e.g. to open the full panel). */
  onManage?: () => void;
  className?: string;
}

/**
 * At-a-glance safety strip for a patient: allergies (red), "no known
 * allergies" (green) or "not recorded" (amber), active conditions, and the
 * latest weight. Shown wherever clinicians consult or prescribe.
 */
export default function ClinicalBanner({ patientId, onManage, className = "" }: ClinicalBannerProps) {
  const { data, isLoading } = useSWR<ClinicalSummary>(clinicalKey(patientId), fetcher);

  if (isLoading || !data) {
    return <div className={`h-14 rounded-xl bg-gray-50 animate-pulse ${className}`} />;
  }

  const allergies = activeAllergies(data.allergies);
  const problems = data.problems.filter((p) => p.status === "active");
  const severe = allergies.some((a) => a.severity === "severe" || a.severity === "life_threatening");

  return (
    <div className={`space-y-2 ${className}`}>
      {allergies.length > 0 ? (
        <div className={`rounded-xl border px-4 py-3 ${severe ? "border-red-300 bg-red-50" : "border-red-200 bg-red-50/60"}`}>
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-red-800">
                Allergies ({allergies.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-red-800"
                    title={[a.reaction && `Reaction: ${a.reaction}`, a.verification === "confirmed" ? "Confirmed" : "Unconfirmed"].filter(Boolean).join(" · ")}
                  >
                    {a.substance}
                    <span className="font-normal text-red-600">
                      · {a.type === "intolerance" ? "intolerance" : SEVERITY_LABEL[a.severity].toLowerCase()}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            {onManage && (
              <button onClick={onManage} className="shrink-0 text-xs font-semibold text-red-700 hover:underline">
                Update
              </button>
            )}
          </div>
        </div>
      ) : data.allergyStatus === "nkda" ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-semibold">No known allergies</span>
          {onManage && (
            <button onClick={onManage} className="text-xs font-semibold text-green-700 hover:underline">
              Update
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <span className="font-semibold">Allergies not recorded.</span> Ask the patient before prescribing.
          </span>
          {onManage && (
            <button onClick={onManage} className="text-xs font-semibold text-amber-800 hover:underline">
              Record
            </button>
          )}
        </div>
      )}

      {(problems.length > 0 || data.latest.weightKg != null) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm">
          {problems.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <HeartIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conditions</span>
              {problems.map((p) => (
                <span key={p.id} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                  {problemLabel(p)}
                </span>
              ))}
            </div>
          )}
          {data.latest.weightKg != null && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <ScaleIcon className="h-4 w-4 text-gray-400" />
              <span className="font-semibold text-gray-800">{data.latest.weightKg} kg</span>
              {data.latest.weightMeasuredAt && (
                <span className="text-gray-400">
                  ({new Date(data.latest.weightMeasuredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})
                </span>
              )}
              {data.latest.bmi != null && <span className="text-gray-500">· BMI {data.latest.bmi}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
