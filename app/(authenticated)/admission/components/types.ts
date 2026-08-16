export interface AdmissionPatient {
  id: number;
  firstname: string;
  lastname: string;
  mrn: string | null;
}

export interface AdmissionWard {
  id: number;
  name: string;
}

export interface AdmissionBed {
  id: number;
  bedNumber: string;
}

export interface AdmissionDoctor {
  id: number;
  firstname: string;
  lastname: string;
}

export interface AdmissionRecord {
  id: number;
  admissionType: string;
  admissionReason: string;
  severity: string;
  /** "requested" | "admitted" | "discharged" | "declined" */
  status: string;
  requestedAt: string | null;
  /** Null until a bed is allocated — a requested admission has no admit time. */
  admittedAt: string | null;
  dischargedAt: string | null;
  dischargeSummary: string | null;
  declineReason: string | null;
  declinedAt: string | null;
  appointmentId: number | null;
  createdAt: string;
  patient: AdmissionPatient | null;
  ward: AdmissionWard | null;
  bed: AdmissionBed | null;
  doctor: AdmissionDoctor | null;
  /** The doctor who raised the request; null for direct desk admissions. */
  requestedBy: AdmissionDoctor | null;
}

export interface AdmissionTransferRecord {
  id: number;
  reason: string | null;
  transferredAt: string;
  fromWardName: string | null;
  fromBedNumber: string | null;
  toWardName: string | null;
  toBedNumber: string | null;
  transferredByFirstname: string | null;
  transferredByLastname: string | null;
}

export interface AdmissionDetail extends AdmissionRecord {
  transfers: AdmissionTransferRecord[];
}

export interface Ward {
  id: number;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  createdAt: string;
}

export interface Bed {
  id: number;
  bedNumber: string;
  status: "available" | "occupied" | "maintenance";
  wardId: number;
  wardName: string | null;
  createdAt: string;
}
