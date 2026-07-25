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
  status: string;
  admittedAt: string;
  dischargedAt: string | null;
  dischargeSummary: string | null;
  appointmentId: number | null;
  createdAt: string;
  patient: AdmissionPatient | null;
  ward: AdmissionWard | null;
  bed: AdmissionBed | null;
  doctor: AdmissionDoctor | null;
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
