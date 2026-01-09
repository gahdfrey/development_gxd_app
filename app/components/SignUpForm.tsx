"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface FormData {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  termsAccepted: boolean;
}

export default function CustomSignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  const { data: roles = [], isLoading: rolesLoading } = useSWR<
    { id: number; name: string }[]
  >("/api/roles", fetcher);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    clearErrors,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      firstname: "",
      lastname: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      roleId: "",
      termsAccepted: false,
    },
    mode: "onChange",
  });

  const password = watch("password");

  const onSubmit = async (data: FormData) => {
    // Trim strings
    const trimmedData = {
      ...data,
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
      username: data.username.trim(),
      email: data.email.trim(),
    };

    setApiError("");
    setSuccessMessage("");

    if (!trimmedData.termsAccepted) {
      setError("termsAccepted", {
        type: "manual",
        message: "You must accept the Terms and Conditions to proceed",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trimmedData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          // Set field-specific errors from API
          Object.entries(result.errors).forEach(([key, message]) => {
            setError(key as keyof FormData, {
              type: "server",
              message: message as string,
            });
          });
        } else {
          setApiError(result.error || "Registration failed. Please try again.");
        }
      } else {
        setSuccessMessage(
          "Welcome aboard! Redirecting you to the login page..."
        );
        reset(); // Reset form on success
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (error) {
      console.error("Signup error:", error);
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof Pick<
      FormData,
      | "firstname"
      | "lastname"
      | "username"
      | "email"
      | "password"
      | "confirmPassword"
      | "roleId"
    >
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      clearErrors(field); // Clear error on change
    };
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
          Get Started
        </h1>
        <p className="text-gray-500">Create your EMS account in moments</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Global Messages */}
        {apiError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700">{successMessage}</p>
          </div>
        )}

        {/* Personal Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <label
              htmlFor="firstname"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              First Name *
            </label>
            <input
              {...register("firstname", {
                required: "First name is required",
                minLength: {
                  value: 2,
                  message: "First name must be at least 2 characters",
                },
                onChange: handleInputChange("firstname"),
              })}
              type="text"
              id="firstname"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.firstname
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder="e.g., Alex"
            />
            {errors.firstname && (
              <p className="mt-1 text-xs text-red-500">
                {errors.firstname.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastname"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Last Name *
            </label>
            <input
              {...register("lastname", {
                required: "Last name is required",
                minLength: {
                  value: 2,
                  message: "Last name must be at least 2 characters",
                },
                onChange: handleInputChange("lastname"),
              })}
              type="text"
              id="lastname"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.lastname ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              placeholder="e.g., Rivera"
            />
            {errors.lastname && (
              <p className="mt-1 text-xs text-red-500">
                {errors.lastname.message}
              </p>
            )}
          </div>
        </div>

        {/* Username Field */}
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Username *
          </label>
          <input
            {...register("username", {
              required: "Username is required",
              minLength: {
                value: 3,
                message: "Username must be at least 3 characters",
              },
              onChange: handleInputChange("username"),
            })}
            type="text"
            id="username"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.username ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            placeholder="e.g., alexriv"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Email Address *
          </label>
          <input
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Please enter a valid email address",
              },
              onChange: handleInputChange("email"),
            })}
            type="email"
            id="email"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            placeholder="e.g., alex@company.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Role Field */}
        <div>
          <label
            htmlFor="roleId"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Role *
          </label>
          <select
            {...register("roleId", {
              required: "Please select a role",
              onChange: handleInputChange("roleId"),
            })}
            id="roleId"
            disabled={rolesLoading}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.roleId ? "border-red-500 bg-red-50" : "border-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
              </option>
            ))}
          </select>
          {errors.roleId && (
            <p className="mt-1 text-xs text-red-500">{errors.roleId.message}</p>
          )}
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Password *
            </label>
            <div className="relative">
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters long",
                  },
                  pattern: {
                    value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message:
                      "Password needs at least one uppercase letter, one lowercase letter, and one number",
                  },
                  onChange: handleInputChange("password"),
                })}
                type={showPassword ? "text" : "password"}
                id="password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.password
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Confirm Password *
            </label>
            <div className="relative">
              <input
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match. Try again.",
                  onChange: handleInputChange("confirmPassword"),
                })}
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.confirmPassword
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="Match password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {/* Terms Checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
            <input
              {...register("termsAccepted", {
                required: "You must accept the Terms and Conditions to proceed",
              })}
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>
              I accept the{" "}
              <a
                href="#"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="mt-1 text-xs text-red-500">
              {errors.termsAccepted.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Account...
            </span>
          ) : successMessage ? (
            "Account Ready!"
          ) : (
            "Sign Up for Free"
          )}
        </button>

        {/* Footer Link */}
        <p className="text-center text-xs text-gray-500">
          Already registered?{" "}
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            Log in here
          </a>
        </p>
      </form>
    </div>
  );
}
