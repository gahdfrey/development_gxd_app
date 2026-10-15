/** The register/edit patient form (shared by Create/EditPatientModal and the
 * field groups they render). Consent is only asked for on registration. */
export interface PatientFormData {
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  nin: string;
  email: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  hmoId?: string;
  policyNumber?: string;
  nextOfKinFirstname: string;
  nextOfKinLastname: string;
  nextOfKinRelationship: string;
  nextOfKinAddress: string;
  nextOfKinPhone: string;
  nextOfKinEmail: string;
  consentGiven?: boolean;
}
