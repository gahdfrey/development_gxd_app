"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export interface Diagnosis {
  icdCode: string | null;
  icdTitle: string | null;
  clinicalText: string | null;
  diagnosisType: string;
}

interface Icd11Result {
  code: string;
  title: string;
  chapter: string | null;
  isLeaf: boolean;
}

interface DiagnosisPickerProps {
  value: Diagnosis[];
  onChange: (diagnoses: Diagnosis[]) => void;
}

const DIAGNOSIS_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "provisional", label: "Provisional" },
  { value: "differential", label: "Differential" },
];

const TYPE_STYLES: Record<string, string> = {
  primary: "bg-blue-50 text-blue-700 ring-blue-200",
  secondary: "bg-slate-100 text-slate-600 ring-slate-200",
  provisional: "bg-amber-50 text-amber-700 ring-amber-200",
  differential: "bg-purple-50 text-purple-700 ring-purple-200",
};

// Session-lived cache: query → results. Makes backspacing/retyping instant
// and survives the modal being closed and reopened.
const searchCache = new Map<string, Icd11Result[]>();

export default function DiagnosisPicker({ value, onChange }: DiagnosisPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Icd11Result[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = query.trim();

  const runSearch = useCallback(async (q: string) => {
    // Cancel any in-flight request — only the latest keystroke matters.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);
    try {
      const res = await fetch(`/api/icd11?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const rows: Icd11Result[] = await res.json();
        searchCache.set(q, rows);
        setResults(rows);
        setActiveIndex(0);
      }
    } catch {
      /* aborted or transient network error — keep previous results */
    } finally {
      if (abortRef.current === controller) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setResults([]);
      setShowResults(false);
      setIsFetching(false);
      abortRef.current?.abort();
      return;
    }

    setShowResults(true);

    // Cache hit → paint instantly, no spinner, no network.
    const cached = searchCache.get(trimmed);
    if (cached) {
      setResults(cached);
      setActiveIndex(0);
      setIsFetching(false);
      return;
    }

    // While waiting, narrow the previous results locally so the list keeps
    // responding on every keystroke (stale-while-revalidate feel).
    setResults((prev) =>
      prev.filter(
        (r) =>
          r.title.toLowerCase().includes(trimmed.toLowerCase()) ||
          r.code.toLowerCase().startsWith(trimmed.toLowerCase()),
      ),
    );

    debounceRef.current = setTimeout(() => runSearch(trimmed), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, runSearch]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const alreadySelected = useMemo(
    () => new Set(value.map((d) => d.icdCode).filter(Boolean)),
    [value],
  );

  const addCoded = (r: Icd11Result) => {
    if (!alreadySelected.has(r.code)) {
      onChange([
        ...value,
        {
          icdCode: r.code,
          icdTitle: r.title,
          clinicalText: null,
          diagnosisType: value.length === 0 ? "primary" : "secondary",
        },
      ]);
    }
    setQuery("");
    setShowResults(false);
  };

  const addFreeText = () => {
    if (!trimmed) return;
    onChange([
      ...value,
      {
        icdCode: null,
        icdTitle: null,
        clinicalText: trimmed,
        diagnosisType: value.length === 0 ? "primary" : "secondary",
      },
    ]);
    setQuery("");
    setShowResults(false);
  };

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const setTypeAt = (idx: number, type: string) =>
    onChange(value.map((d, i) => (i === idx ? { ...d, diagnosisType: type } : d)));

  // Options for keyboard navigation: results + the free-text row.
  const optionCount = results.length + (trimmed.length >= 2 ? 1 : 0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || optionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex < results.length) addCoded(results[activeIndex]);
      else addFreeText();
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  // Keep the active option in view while arrowing through the list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ClipboardDocumentCheckIcon className="h-4.5 w-4.5 text-blue-600" />
          Diagnoses
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">
            ICD-11
          </span>
        </label>
        {value.length > 0 && (
          <span className="text-xs font-medium text-gray-400">
            {value.length} recorded
          </span>
        )}
      </div>

      {/* Selected diagnoses */}
      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((d, idx) => (
            <li
              key={`${d.icdCode ?? d.clinicalText}-${idx}`}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-blue-200"
            >
              {d.icdCode ? (
                <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] font-bold tracking-wide text-white">
                  {d.icdCode}
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  UNCODED
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                {d.icdTitle || d.clinicalText}
              </span>
              <select
                value={d.diagnosisType}
                onChange={(e) => setTypeAt(idx, e.target.value)}
                className={`shrink-0 cursor-pointer appearance-none rounded-full px-3 py-1 text-xs font-semibold ring-1 focus:outline-none ${TYPE_STYLES[d.diagnosisType] ?? TYPE_STYLES.secondary}`}
              >
                {DIAGNOSIS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                aria-label="Remove diagnosis"
                className="shrink-0 rounded-full p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Search box */}
      <div ref={boxRef} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => trimmed.length >= 2 && setShowResults(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showResults}
            aria-controls="icd11-results"
            aria-autocomplete="list"
            placeholder="Search condition or code — e.g. malaria, 5A11…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          {isFetching && (
            <span
              className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
              aria-hidden
            />
          )}
        </div>

        {showResults && (
          <div
            id="icd11-results"
            ref={listRef}
            className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-black/[0.03]"
          >
            {results.map((r, i) => {
              const selected = alreadySelected.has(r.code);
              return (
                <button
                  key={r.code}
                  type="button"
                  data-idx={i}
                  disabled={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => addCoded(r)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                    selected
                      ? "cursor-default opacity-40"
                      : i === activeIndex
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">
                    {r.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                    {r.title}
                  </span>
                  {selected && (
                    <span className="shrink-0 text-[11px] font-medium text-gray-400">
                      added
                    </span>
                  )}
                </button>
              );
            })}

            {results.length === 0 && !isFetching && (
              <p className="px-4 py-3 text-sm text-gray-400">
                No ICD-11 match for “{trimmed}”.
              </p>
            )}

            {/* Always allow recording an uncoded/working diagnosis */}
            {trimmed.length >= 2 && (
              <button
                type="button"
                data-idx={results.length}
                onMouseEnter={() => setActiveIndex(results.length)}
                onClick={addFreeText}
                className={`flex w-full items-center gap-2 border-t border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-amber-700 transition-colors ${
                  activeIndex === results.length ? "bg-amber-50" : "hover:bg-amber-50/60"
                }`}
              >
                <PlusIcon className="h-4 w-4" />
                Add “{trimmed}” as an uncoded diagnosis
              </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        ↑↓ to navigate, Enter to add. Prefer coded diagnoses; use uncoded only
        for working or undetermined diagnoses.
      </p>
    </div>
  );
}
