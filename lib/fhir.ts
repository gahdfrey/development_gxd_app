import crypto from "crypto";

/**
 * Minimal FHIR R4 export builder. Assembles a patient's record into a
 * `collection` Bundle of Patient / Practitioner / Encounter / Condition /
 * DiagnosticReport / MedicationRequest / Consent / Coverage resources.
 *
 * This is a pragmatic export aligned with the NDHA's FHIR R4 requirement; it
 * is not (yet) constrained to the Nigerian FHIR profiles, which the NDHTO has
 * not published. Codes use the WHO ICD-11 MMS system for diagnoses.
 */

const ICD11_SYSTEM = "http://id.who.int/icd/release/11/mms";
const NIN_SYSTEM = "https://nimc.gov.ng/nin";
const MRN_SYSTEM = "urn:carevault:mrn";

export interface FhirInput {
  org: { id: number; name: string | null };
  patient: {
    id: number;
    firstname: string;
    lastname: string;
    gender: string;
    dob: string;
    countryCode: string;
    phone: string;
    email: string | null;
    nin: string | null;
    mrn: string | null;
    insuranceType: string | null;
    hmoName: string | null;
    policyNumber: string | null;
  };
  practitioners: {
    id: number;
    firstname: string | null;
    lastname: string | null;
    licenseNumber: string | null;
    licenseCouncil: string | null;
  }[];
  encounters: {
    id: number;
    date: string;
    time: string;
    status: string;
    visitType: string;
    doctorId: number | null;
    startTime: string | null;
    endTime: string | null;
  }[];
  conditions: {
    id: number;
    encounterId: number | null;
    icdCode: string | null;
    icdTitle: string | null;
    clinicalText: string | null;
    diagnosisType: string;
    recordedAt: string;
  }[];
  diagnosticReports: {
    id: number;
    testName: string | null;
    status: string;
    createdAt: string;
    results: { fileName: string; fileType: string; filePath: string; createdAt: string }[];
  }[];
  medications: {
    id: number;
    productName: string | null;
    dosage: string;
    status: string;
    createdAt: string;
  }[];
  consents: {
    id: number;
    purpose: string;
    status: string;
    grantedAt: string;
    expiresAt: string | null;
  }[];
}

const uuid = () => `urn:uuid:${crypto.randomUUID()}`;

function encounterStatus(s: string): string {
  switch (s) {
    case "completed": return "finished";
    case "cancelled": return "cancelled";
    case "no-show": return "cancelled";
    case "scheduled": return "planned";
    default: return "unknown";
  }
}

function conditionVerification(type: string): string {
  if (type === "provisional") return "provisional";
  if (type === "differential") return "differential";
  return "confirmed";
}

function medicationStatus(s: string): string {
  if (s === "dispatched") return "completed";
  if (s === "cancelled") return "cancelled";
  return "active";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildPatientBundle(input: FhirInput): Record<string, any> {
  const { patient } = input;
  const patientUuid = uuid();
  const practitionerUuid = new Map<number, string>();
  const encounterUuid = new Map<number, string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: { fullUrl: string; resource: Record<string, any> }[] = [];

  // ── Patient ──────────────────────────────────────────────────────────────
  const identifiers: Record<string, unknown>[] = [];
  if (patient.nin) identifiers.push({ system: NIN_SYSTEM, value: patient.nin });
  if (patient.mrn)
    identifiers.push({ type: { text: "Medical Record Number" }, system: MRN_SYSTEM, value: patient.mrn });

  entries.push({
    fullUrl: patientUuid,
    resource: {
      resourceType: "Patient",
      identifier: identifiers.length ? identifiers : undefined,
      name: [{ family: patient.lastname, given: [patient.firstname] }],
      gender: ["male", "female", "other"].includes(patient.gender) ? patient.gender : "unknown",
      birthDate: patient.dob?.slice(0, 10) || undefined,
      telecom: [
        { system: "phone", value: `${patient.countryCode}${patient.phone}` },
        ...(patient.email ? [{ system: "email", value: patient.email }] : []),
      ],
      managingOrganization: { display: input.org.name ?? undefined },
    },
  });

  // ── Practitioners ────────────────────────────────────────────────────────
  for (const p of input.practitioners) {
    const u = uuid();
    practitionerUuid.set(p.id, u);
    entries.push({
      fullUrl: u,
      resource: {
        resourceType: "Practitioner",
        identifier: p.licenseNumber
          ? [{ system: `urn:council:${(p.licenseCouncil ?? "license").toLowerCase()}`, value: p.licenseNumber }]
          : undefined,
        name: [{ family: p.lastname ?? undefined, given: p.firstname ? [p.firstname] : undefined, prefix: ["Dr"] }],
      },
    });
  }

  // ── Encounters ───────────────────────────────────────────────────────────
  for (const e of input.encounters) {
    const u = uuid();
    encounterUuid.set(e.id, u);
    const period =
      e.startTime || e.endTime
        ? { start: e.startTime ?? undefined, end: e.endTime ?? undefined }
        : { start: `${e.date}T${e.time || "00:00"}:00` };
    entries.push({
      fullUrl: u,
      resource: {
        resourceType: "Encounter",
        status: encounterStatus(e.status),
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "AMB",
          display: "ambulatory",
        },
        type: [{ text: e.visitType }],
        subject: { reference: patientUuid },
        participant:
          e.doctorId && practitionerUuid.has(e.doctorId)
            ? [{ individual: { reference: practitionerUuid.get(e.doctorId) } }]
            : undefined,
        period,
      },
    });
  }

  // ── Conditions (diagnoses) ───────────────────────────────────────────────
  for (const c of input.conditions) {
    const coding = c.icdCode
      ? [{ system: ICD11_SYSTEM, code: c.icdCode, display: c.icdTitle ?? undefined }]
      : undefined;
    entries.push({
      fullUrl: uuid(),
      resource: {
        resourceType: "Condition",
        clinicalStatus: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
        },
        verificationStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
              code: conditionVerification(c.diagnosisType),
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-category",
                code: "encounter-diagnosis",
                display: "Encounter Diagnosis",
              },
            ],
          },
        ],
        code: { coding, text: c.icdTitle ?? c.clinicalText ?? undefined },
        subject: { reference: patientUuid },
        encounter:
          c.encounterId && encounterUuid.has(c.encounterId)
            ? { reference: encounterUuid.get(c.encounterId) }
            : undefined,
        recordedDate: c.recordedAt,
      },
    });
  }

  // ── Diagnostic reports (lab / imaging requests + results) ────────────────
  for (const d of input.diagnosticReports) {
    entries.push({
      fullUrl: uuid(),
      resource: {
        resourceType: "DiagnosticReport",
        status: d.results.length > 0 ? "final" : "registered",
        code: { text: d.testName ?? "Diagnostic test" },
        subject: { reference: patientUuid },
        effectiveDateTime: d.createdAt,
        presentedForm: d.results.map((r) => ({
          contentType: r.fileType,
          url: `/api/blob/download?url=${encodeURIComponent(r.filePath)}`,
          title: r.fileName,
          creation: r.createdAt,
        })),
      },
    });
  }

  // ── Medication requests (prescriptions) ──────────────────────────────────
  for (const m of input.medications) {
    entries.push({
      fullUrl: uuid(),
      resource: {
        resourceType: "MedicationRequest",
        status: medicationStatus(m.status),
        intent: "order",
        medicationCodeableConcept: { text: m.productName ?? "Medication" },
        subject: { reference: patientUuid },
        authoredOn: m.createdAt,
        dosageInstruction: [{ text: m.dosage }],
      },
    });
  }

  // ── Consents ─────────────────────────────────────────────────────────────
  for (const c of input.consents) {
    entries.push({
      fullUrl: uuid(),
      resource: {
        resourceType: "Consent",
        status: c.status === "granted" ? "active" : "inactive",
        scope: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/consentscope",
              code: "patient-privacy",
            },
          ],
        },
        category: [{ text: c.purpose }],
        patient: { reference: patientUuid },
        dateTime: c.grantedAt,
        provision: c.expiresAt ? { period: { end: c.expiresAt } } : undefined,
      },
    });
  }

  // ── Coverage (insurance) ─────────────────────────────────────────────────
  if (patient.insuranceType && patient.insuranceType !== "private") {
    entries.push({
      fullUrl: uuid(),
      resource: {
        resourceType: "Coverage",
        status: "active",
        type: { text: patient.insuranceType },
        beneficiary: { reference: patientUuid },
        payor: patient.hmoName ? [{ display: patient.hmoName }] : undefined,
        subscriberId: patient.policyNumber ?? undefined,
      },
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}
