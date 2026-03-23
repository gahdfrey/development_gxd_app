"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options based on query
  const filteredOptions =
    query.trim() === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  }, []);

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option);
    close();
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setHighlightedIndex((i) =>
            i < filteredOptions.length - 1 ? i + 1 : 0,
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) =>
          i > 0 ? i - 1 : filteredOptions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        inputRef.current?.blur();
        break;
      case "Tab":
        close();
        break;
    }
  };

  const handleChevronClick = () => {
    if (disabled) return;
    if (isOpen) {
      close();
    } else {
      open();
      inputRef.current?.focus();
    }
  };

  // Input display: show query while open, show selected label when closed
  const inputDisplayValue = isOpen ? query : (value?.label ?? "");

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </label>

      <div ref={containerRef} className="relative">
        {/* Input wrapper */}
        <div
          className={`relative w-full overflow-hidden rounded-xl border text-left transition-all ${
            disabled
              ? "bg-gray-100 cursor-not-allowed opacity-60"
              : error
              ? "border-red-500 bg-red-50"
              : isOpen
              ? "border-blue-500 bg-white ring-2 ring-blue-500/20"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            value={inputDisplayValue}
            onChange={handleInputChange}
            onFocus={open}
            onClick={open}
            onKeyDown={handleKeyDown}
            placeholder={value ? value.label : placeholder}
            className="w-full border-none bg-transparent py-3 pl-4 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none disabled:cursor-not-allowed placeholder:text-gray-400"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleChevronClick}
            className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:cursor-not-allowed"
          >
            <ChevronUpDownIcon
              className={`h-5 w-5 transition-colors ${
                isOpen ? "text-blue-500" : "text-gray-400"
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Dropdown list */}
        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/10 focus:outline-none"
          >
            {filteredOptions.length === 0 ? (
              <li className="cursor-default select-none px-4 py-2.5 text-gray-500">
                No results found.
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = value?.id === option.id;
                const isHighlighted = highlightedIndex === index;

                return (
                  <li
                    key={option.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      // Prevent input blur before click registers
                      e.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                      isHighlighted
                        ? "bg-blue-600 text-white"
                        : isSelected
                        ? "bg-blue-50 text-blue-900"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`block truncate ${
                          isSelected ? "font-semibold" : "font-normal"
                        }`}
                      >
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span
                          className={`text-xs ${
                            isHighlighted ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          isHighlighted ? "text-white" : "text-blue-600"
                        }`}
                      >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
