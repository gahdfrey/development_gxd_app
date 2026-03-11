import { ReactNode } from "react";
import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

interface FormSelectProps {
  id: string;
  label: string;
  icon: ReactNode;
  options: { value: string; label: string }[];
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  register: any;
  iconColor?: string;
  ringColor?: string;
}

export default function FormSelect({
  id,
  label,
  icon,
  options,
  error,
  register,
  iconColor = "text-blue-600",
  ringColor = "focus:ring-blue-500",
}: FormSelectProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700"
      >
        <div className={iconColor}>{icon}</div>
        {label} *
      </label>
      <div className="relative">
        <select
          {...register}
          id={id}
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${ringColor} transition-all appearance-none bg-white cursor-pointer ${
            error ? "border-red-500 bg-red-50" : "border-gray-300"
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && error.message && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {String(error.message)}
        </p>
      )}
    </div>
  );
}
