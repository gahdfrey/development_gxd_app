"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon } from "@heroicons/react/24/outline";
import SearchableSelect, { type SearchableSelectOption } from "./SearchableSelect";

export interface GenericOption {
  id: number;
  name: string;
  strength: string;
  form: string | null;
}

interface Props {
  value: GenericOption | null;
  onChange: (generic: GenericOption | null) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  /** Only offer active ingredients that currently have an in-stock brand. */
  onlyWithStock?: boolean;
  /** Hide the inline "new active ingredient" affordance (e.g. for prescribing, where the formulary should be managed by Setup/Pharmacy). */
  allowCreate?: boolean;
}

/**
 * Active-ingredient (generic) picker — the level clinicians should prescribe
 * against (RxNorm "Semantic Clinical Drug": ingredient + strength + form),
 * kept separate from the brand/SKU chosen in `products`. Supports creating a
 * new active ingredient inline so Setup/Pharmacy can build the formulary as
 * brands are added, without a dedicated management screen.
 */
export default function GenericSelect({
  value,
  onChange,
  label = "Active Ingredient",
  error,
  disabled,
  onlyWithStock,
  allowCreate = true,
}: Props) {
  const qs = onlyWithStock ? "?withStock=true" : "";
  const { data: generics, isLoading, mutate } = useSWR<GenericOption[]>(
    `/api/drug-generics${qs}`,
    fetcher,
  );

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newForm, setNewForm] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const options: SearchableSelectOption[] = (generics ?? []).map((g) => ({
    id: g.id,
    label: `${g.name} ${g.strength}`,
    sublabel: g.form ?? undefined,
  }));

  const selectedOption: SearchableSelectOption | null = value
    ? { id: value.id, label: `${value.name} ${value.strength}`, sublabel: value.form ?? undefined }
    : null;

  const handleChange = (opt: SearchableSelectOption | null) => {
    if (!opt) {
      onChange(null);
      return;
    }
    const generic = generics?.find((g) => g.id === opt.id) ?? null;
    onChange(generic);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newStrength.trim()) {
      setCreateError("Name and strength are required.");
      return;
    }
    setSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/drug-generics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), strength: newStrength.trim(), form: newForm.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create active ingredient");
      await mutate();
      onChange(data);
      setCreating(false);
      setNewName("");
      setNewStrength("");
      setNewForm("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create active ingredient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <SearchableSelect
        label={label}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={
          isLoading
            ? "Loading…"
            : options.length === 0
              ? "No active ingredients yet"
              : "Search active ingredient…"
        }
        disabled={disabled || saving}
        error={error}
      />

      {allowCreate && (
        !creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New active ingredient
          </button>
        ) : (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="grid grid-cols-3 gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Amlodipine"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="e.g. 5mg"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                value={newForm}
                onChange={(e) => setNewForm(e.target.value)}
                placeholder="Form, e.g. Tablet"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
