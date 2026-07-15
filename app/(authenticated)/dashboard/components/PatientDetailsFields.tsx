import {
  UserIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { UseFormRegister, FieldErrors, FieldError } from "react-hook-form";
import { HMO } from "@/lib/db/schema";
import { COUNTRY_CODES } from "@/lib/constants/countryCodes";
import FormInput from "./form/FormInput";
import FormSelect from "./form/FormSelect";

interface PatientFormData {
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  email: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  hmoId?: string;
  policyNumber?: string;
}

interface PatientDetailsFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  hmos?: HMO[];
  insuranceType: string;
}

export default function PatientDetailsFields({
  register,
  errors,
  hmos,
  insuranceType,
}: PatientDetailsFieldsProps) {
  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];

  const insuranceOptions = [
    { value: "", label: "Select Insurance Type" },
    { value: "private", label: "Private" },
    { value: "hmo", label: "HMO" },
    { value: "corporate", label: "Corporate" },
  ];

  const hmoOptions = [
    { value: "", label: "Select HMO" },
    ...(hmos?.map((hmo) => ({ value: String(hmo.id), label: hmo.name })) || []),
  ];

  return (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="firstname"
          label="First Name"
          icon={<UserIcon className="h-4 w-4" />}
          placeholder="John"
          error={errors.firstname}
          register={register("firstname", {
            required: "First name is required",
            minLength: {
              value: 2,
              message: "Minimum 2 characters required",
            },
          })}
        />

        <FormInput
          id="lastname"
          label="Last Name"
          icon={<UserIcon className="h-4 w-4" />}
          placeholder="Doe"
          error={errors.lastname}
          register={register("lastname", {
            required: "Last name is required",
            minLength: {
              value: 2,
              message: "Minimum 2 characters required",
            },
          })}
        />
      </div>

      {/* Gender and DOB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          id="gender"
          label="Gender"
          icon={<HeartIcon className="h-4 w-4" />}
          options={genderOptions}
          error={errors.gender}
          register={register("gender", {
            required: "Please select a gender",
          })}
        />

        <FormInput
          id="dob"
          label="Date of Birth"
          icon={<CalendarIcon className="h-4 w-4" />}
          type="date"
          error={errors.dob}
          register={register("dob", {
            required: "Date of birth is required",
          })}
        />
      </div>

      {/* NIN and Maiden Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="nin"
          label="NIN (National Identification Number)"
          icon={<IdentificationIcon className="h-4 w-4" />}
          placeholder="11-digit NIN (optional)"
          error={errors.nin as FieldError | undefined}
          register={register("nin", {
            pattern: {
              value: /^\d{11}$/,
              message: "NIN must be exactly 11 digits",
            },
          })}
          optional
        />

        <FormInput
          id="maidenName"
          label="Maiden Name"
          icon={<IdentificationIcon className="h-4 w-4" />}
          placeholder="Optional"
          register={register("maidenName")}
          optional
        />
      </div>

      {/* Phone Number with Country Code */}
      <div className="space-y-2">
        <label
          htmlFor="phone"
          className="flex items-center gap-2 text-sm font-semibold text-gray-700"
        >
          <PhoneIcon className="h-4 w-4 text-blue-600" />
          Phone Number *
        </label>
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2 relative">
            <select
              {...register("countryCode", {
                required: "Country code is required",
              })}
              id="countryCode"
              className={`w-full px-2 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-white cursor-pointer ${
                errors.countryCode
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
              }`}
            >
              {COUNTRY_CODES.map((country) => (
                <option key={country.countryCode} value={country.code}>
                  {country.flag} {country.code}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
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
          <div className="col-span-3">
            <input
              {...register("phone", {
                required: "Phone number is required",
                pattern: {
                  value: /^[0-9]{7,15}$/,
                  message: "Enter a valid phone number",
                },
              })}
              type="tel"
              id="phone"
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.phone
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 bg-white"
              }`}
              placeholder="8012345678"
            />
          </div>
        </div>
        {(errors.countryCode || errors.phone) && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <span>⚠</span>
            {(errors.countryCode as FieldError)?.message ||
              (errors.phone as FieldError)?.message}
          </p>
        )}
      </div>

      {/* Email */}
      <FormInput
        id="email"
        label="Email Address"
        icon={<EnvelopeIcon className="h-4 w-4" />}
        type="email"
        placeholder="patient@example.com"
        error={errors.email}
        register={register("email", {
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Enter a valid email address",
          },
        })}
        optional
      />

      {/* Insurance Type */}
      <FormSelect
        id="insuranceType"
        label="Insurance Type"
        icon={<ShieldCheckIcon className="h-4 w-4" />}
        options={insuranceOptions}
        error={errors.insuranceType}
        register={register("insuranceType", {
          required: "Please select an insurance type",
        })}
      />

      {/* HMO Selection (Conditional) */}
      {insuranceType === "hmo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <FormSelect
            id="hmoId"
            label="Select HMO"
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            options={hmoOptions}
            error={errors.hmoId}
            register={register("hmoId")}
          />

          <FormInput
            id="policyNumber"
            label="Policy Number"
            icon={<IdentificationIcon className="h-4 w-4" />}
            placeholder="Enter policy number"
            error={errors.policyNumber}
            register={register("policyNumber")}
          />
        </div>
      )}
    </>
  );
}
