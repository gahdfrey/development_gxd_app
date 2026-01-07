"use client";

import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

export interface SearchableSelectOption {
  id: number | string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: SearchableSelectOption | null;
  onChange: (value: SearchableSelectOption | null) => void;
  placeholder?: string;
  label: string;
  error?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  label,
  error,
  disabled = false,
  icon: Icon,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </label>
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <div
            className={`relative w-full cursor-default overflow-hidden rounded-xl border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all ${
              error
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
            }`}
          >
            <Combobox.Input
              className="w-full border-none py-3 pl-4 pr-10 text-sm leading-5 text-gray-900 dark:text-gray-100 bg-transparent focus:ring-0 focus:outline-none"
              displayValue={(option: SearchableSelectOption | null) =>
                option?.label || ""
              }
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {filteredOptions.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
                  No results found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={option.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active
                          ? "bg-blue-600 text-white"
                          : "text-gray-900 dark:text-gray-100"
                      }`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex flex-col">
                          <span
                            className={`block truncate ${
                              selected ? "font-medium" : "font-normal"
                            }`}
                          >
                            {option.label}
                          </span>
                          {option.sublabel && (
                            <span
                              className={`text-xs ${
                                active
                                  ? "text-blue-200"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {option.sublabel}
                            </span>
                          )}
                        </div>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-blue-600"
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
