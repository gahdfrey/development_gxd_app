import { ReactNode } from "react";
import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

interface FormInputProps {
  id: string;
  label: string;
  icon: ReactNode;
  type?: string;
  placeholder?: string;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  register: any;
  iconColor?: string;
  optional?: boolean;
}

export default function FormInput({
  id,
  label,
  icon,
  type = "text",
  placeholder,
  error,
  register,
  iconColor = "text-blue-600",
  optional = false,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700"
      >
        <div className={iconColor}>{icon}</div>
        {label}
        {!optional && " *"}
        {optional && (
          <span className="text-xs text-gray-500 font-normal">(Optional)</span>
        )}
      </label>
      <input
        {...register}
        type={type}
        id={id}
        className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"
        }`}
        placeholder={placeholder}
      />
      {error && error.message && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {String(error.message)}
        </p>
      )}
    </div>
  );
}
