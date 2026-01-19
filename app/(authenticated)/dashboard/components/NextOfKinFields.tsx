import {
  UserIcon,
  HeartIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import FormInput from "./form/FormInput";
import FormSelect from "./form/FormSelect";

interface NextOfKinFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export default function NextOfKinFields({
  register,
  errors,
}: NextOfKinFieldsProps) {
  const relationshipOptions = [
    { value: "", label: "Select Relationship" },
    { value: "spouse", label: "Spouse" },
    { value: "parent", label: "Parent" },
    { value: "sibling", label: "Sibling" },
    { value: "child", label: "Child" },
    { value: "friend", label: "Friend" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      {/* Next of Kin Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="nextOfKinFirstname"
          label="First Name"
          icon={<UserIcon className="h-4 w-4" />}
          placeholder="John"
          error={errors.nextOfKinFirstname}
          register={register("nextOfKinFirstname", {
            required: "Next of kin first name is required",
            minLength: {
              value: 2,
              message: "Minimum 2 characters required",
            },
          })}
          iconColor="text-purple-600"
        />

        <FormInput
          id="nextOfKinLastname"
          label="Last Name"
          icon={<UserIcon className="h-4 w-4" />}
          placeholder="Doe"
          error={errors.nextOfKinLastname}
          register={register("nextOfKinLastname", {
            required: "Next of kin last name is required",
            minLength: {
              value: 2,
              message: "Minimum 2 characters required",
            },
          })}
          iconColor="text-purple-600"
        />
      </div>

      {/* Relationship */}
      <FormSelect
        id="nextOfKinRelationship"
        label="Relationship to Patient"
        icon={<HeartIcon className="h-4 w-4" />}
        options={relationshipOptions}
        error={errors.nextOfKinRelationship}
        register={register("nextOfKinRelationship", {
          required: "Please select a relationship",
        })}
        iconColor="text-purple-600"
        ringColor="focus:ring-purple-500"
      />

      {/* Address */}
      <FormInput
        id="nextOfKinAddress"
        label="Address"
        icon={<MapPinIcon className="h-4 w-4" />}
        placeholder="Enter full address"
        error={errors.nextOfKinAddress}
        register={register("nextOfKinAddress", {
          required: "Address is required",
          minLength: {
            value: 5,
            message: "Please enter a valid address",
          },
        })}
        iconColor="text-purple-600"
      />

      {/* Phone Number and Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="nextOfKinPhone"
          label="Phone Number"
          icon={<PhoneIcon className="h-4 w-4" />}
          type="tel"
          placeholder="+234 801 234 5678"
          error={errors.nextOfKinPhone}
          register={register("nextOfKinPhone", {
            required: "Phone number is required",
            pattern: {
              value: /^[+]?[0-9\s-]{7,20}$/,
              message: "Enter a valid phone number",
            },
          })}
          iconColor="text-purple-600"
        />

        <FormInput
          id="nextOfKinEmail"
          label="Email Address"
          icon={<EnvelopeIcon className="h-4 w-4" />}
          type="email"
          placeholder="john@example.com"
          error={errors.nextOfKinEmail}
          register={register("nextOfKinEmail", {
            required: "Email address is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Enter a valid email address",
            },
          })}
          iconColor="text-purple-600"
        />
      </div>
    </>
  );
}
