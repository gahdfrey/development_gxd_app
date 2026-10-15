"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { TrashIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import SearchableSelect, { type SearchableSelectOption } from "@/app/components/ui/SearchableSelect";
import { formatRefDiscount, referralDiscount } from "@/lib/referrals";
import type { Department } from "@/lib/db/schema";
import type { ReferrerRow, TestRow } from "@/app/(authenticated)/setup/org/components/types";

export interface ReferralState {
  referred: boolean;
  referrer: SearchableSelectOption | null;
  testIds: number[];
}

export const EMPTY_REFERRAL: ReferralState = { referred: false, referrer: null, testIds: [] };

interface ReferralFieldsProps {
  value: ReferralState;
  onChange: (value: ReferralState) => void;
  error?: string;
}

const naira = (n: number) => `₦${n.toLocaleString()}`;

/**
 * "Referred by" on the register-patient form: tick the box, pick the
 * referrer, then department → test (one or more). Each test shows its price
 * and what the referrer earns on it.
 */
export default function ReferralFields({ value, onChange, error }: ReferralFieldsProps) {
  const { data: referrers } = useSWR<ReferrerRow[]>(value.referred ? "/api/referrers" : null, fetcher);
  const { data: departments } = useSWR<Department[]>(value.referred ? "/api/departments" : null, fetcher);
  const { data: tests } = useSWR<TestRow[]>(value.referred ? "/api/tests" : null, fetcher);
  const [department, setDepartment] = useState<SearchableSelectOption | null>(null);

  const referrerOptions: SearchableSelectOption[] = (referrers ?? []).map((r) => ({
    id: r.id,
    label: r.code ? `${r.name} (${r.code})` : r.name,
    sublabel: `${r.bank} · ${r.whatsappNumber}`,
  }));
  const deptOptions: SearchableSelectOption[] = (departments ?? []).map((d) => ({ id: d.id, label: d.name }));
  const testOptions: SearchableSelectOption[] = (tests ?? [])
    .filter((t) => department && t.departmentId === department.id && !value.testIds.includes(t.id))
    .map((t) => ({ id: t.id, label: t.name, sublabel: naira(t.price) }));

  const selectedTests = useMemo(
    () => value.testIds.map((id) => tests?.find((t) => t.id === id)).filter((t): t is TestRow => !!t),
    [value.testIds, tests],
  );
  const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const totalDiscount = selectedTests.reduce(
    (sum, t) => sum + referralDiscount(t.price, t.refDiscountType, t.refDiscountValue),
    0,
  );

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.referred}
          onChange={(e) => {
            setDepartment(null);
            onChange(e.target.checked ? { ...EMPTY_REFERRAL, referred: true } : EMPTY_REFERRAL);
          }}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserGroupIcon className="h-5 w-5 text-blue-600" />
          Referred by
        </span>
        <span className="text-xs text-gray-500">Tick if someone referred this patient in for a test</span>
      </label>

      {value.referred && (
        <div className="mt-4 space-y-4">
          <SearchableSelect
            label="Referrer"
            options={referrerOptions}
            value={value.referrer}
            onChange={(referrer) => onChange({ ...value, referrer })}
            placeholder={
              !referrers
                ? "Loading referrers..."
                : referrerOptions.length === 0
                  ? "No referrers — add them in Setup → Referrers"
                  : "Search referrer..."
            }
            disabled={!referrers || referrerOptions.length === 0}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Department"
              options={deptOptions}
              value={department}
              onChange={setDepartment}
              placeholder={!departments ? "Loading departments..." : "Search department..."}
              disabled={!departments}
            />
            <SearchableSelect
              label="Test"
              options={testOptions}
              value={null}
              onChange={(opt) => opt && onChange({ ...value, testIds: [...value.testIds, Number(opt.id)] })}
              placeholder={!department ? "Pick a department first" : testOptions.length === 0 ? "No more tests in this department" : "Search test to add..."}
              disabled={!department || !tests}
            />
          </div>

          {selectedTests.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Referrer discount</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedTests.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">{t.name}</td>
                      <td className="px-3 py-2 text-gray-600">{t.departmentName ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{naira(t.price)}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {naira(referralDiscount(t.price, t.refDiscountType, t.refDiscountValue))}
                        <span className="ml-1 text-xs text-gray-400">({formatRefDiscount(t.refDiscountType, t.refDiscountValue)})</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onChange({ ...value, testIds: value.testIds.filter((id) => id !== t.id) })}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Remove test"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right">{naira(totalAmount)}</td>
                    <td className="px-3 py-2 text-right">{naira(totalDiscount)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
