# LinkedIn reply — digital health / healthcare transformation post

Context: reply to Ugochukwu Akpor's post (#digitalhealth #healthcaretransformation
#healthtech). Every claim below is grounded in code that exists in this repo —
see "Evidence" at the bottom before editing.

LinkedIn caps a comment at 1,250 characters. Version A is written to fit.

---

## Version A — main comment

Ugochukwu, this is the exact problem set I've been building against.

CareVault is a multi-tenant EHR/HMIS for Nigerian facilities, and its design maps
onto what you raised:

• Fragmentation — NIN is the identity anchor at registration. Duplicate NINs are
hard-blocked, phone/name matches soft-warned, every override audit-logged. One
patient, one record.

• Silos — a patient's record exports as a FHIR R4 Bundle (Patient, Encounter,
Condition, DiagnosticReport, MedicationRequest, Consent), diagnoses coded to WHO
ICD-11, not free text.

• Trust — consent captured at registration with purpose, expiry and withdrawal; an
append-only audit trail on every mutation and login; NDPA-style rectification and
erasure requests; role-based access per module and action; clinical files behind an
authenticated proxy.

• The actual work — appointments, admission with ward/bed and triage severity, lab,
radiology, pharmacy, inventory, HMO capture and payments, plus a portal where
patients see their own results.

Honest caveat: the FHIR export isn't constrained to Nigerian profiles yet — NDHTO
hasn't published them.

It's demo-ready. Feedback and input are genuinely welcome, and I'm looking to build
with people who share the vision.

---

## Version B — short comment

Ugochukwu, well said. I've been building CareVault against exactly this: a
multi-tenant EHR for Nigerian facilities where NIN anchors one patient to one record,
diagnoses are ICD-11 coded, and any record exports as a FHIR R4 bundle so it can
actually travel. Consent, an append-only audit trail and NDPA-style
rectification/erasure requests are in the schema, not the roadmap — alongside the
day-to-day: appointments, admission, lab, radiology, pharmacy, inventory, HMO and
payments, plus a portal where patients see their own results.

It's demo-ready. Feedback and input are very welcome, and I'd love to connect with
people who share the vision of a healthtech solution built properly for Nigerians.

---

## Version C — opening line variants

Use whichever matches the tone of the post:

1. "Ugochukwu, this is the exact problem set I've been building against."
2. "Thank you for putting this so plainly, Ugochukwu — the gap you're describing is
   the one CareVault was built to close."
3. "Strongly agree, Ugochukwu. The hard part isn't the ambition, it's the plumbing —
   which is where I've been spending my time."

---

## Evidence (do not claim beyond this)

| Claim | Where it lives |
| --- | --- |
| Multi-tenant, per-facility isolation | `organisationId` on every table, `lib/org.ts`, `lib/db/schema.ts` |
| NIN identity anchor, MRN, reserved client-registry ID | `patients` table, `lib/db/schema.ts:119` |
| Duplicate: NIN hard block, phone/name soft warn, override audit-logged | `app/api/patients/route.ts:144-234` |
| Facility registry fields (registry ID, type, ownership, state, LGA, geo) | `organisations` table, `lib/db/schema.ts:19` |
| Provider licence + council (MDCN/NMCN/PCN) + reserved worker-registry ID | `users` table, `lib/db/schema.ts:87` |
| FHIR R4 export bundle | `lib/fhir.ts`, `app/api/patients/[id]/fhir/route.ts` |
| ICD-11 MMS coded diagnoses | `icd11Codes` + `visitDiagnoses`, `app/api/icd11/route.ts` |
| Consent at registration: purpose, info types, expiry, withdrawal | `patientConsents`, `app/api/patients/route.ts:83-266` |
| Append-only audit trail (mutations + auth events) | `lib/audit.ts`, `auditLogs` table |
| Rectification / erasure requests with review workflow | `dataRequests`, `app/api/data-requests/`, `app/(authenticated)/data-requests/` |
| RBAC per module + action | `lib/authz.ts`, `lib/constants.ts` |
| Failed-login lockout (5 / 15 min), 8-hour shift session | `auth.ts`, `auth.config.ts` |
| Private clinical file storage behind authenticated proxy | `app/api/blob/download/route.ts` |
| Soft deletes throughout | `deletedAt` columns, filtered with `isNull()` in reads |
| Admission: wards, beds, transfers, triage severity | `wards`/`beds`/`admissions`/`admissionTransfers`, `ADMISSION_SEVERITIES` |
| Gateway-agnostic payments (mock + Paystack) | `lib/payments/gateway.ts`, `paystack.ts` |
| HMO / insurance capture | `hmos` table, patient `insuranceType`/`policyNumber` |
| Patient portal with own history + results | `app/(authenticated)/my-history`, `my-appointments`, result-viewed tracking |
| Facility analytics dashboard | `app/api/analytics/route.ts` |

Known limits — state these rather than paper over them:

- The FHIR export is not constrained to Nigerian FHIR profiles (NDHTO has not
  published them); see the header comment in `lib/fhir.ts`.
- `clientRegistryId` / `workerRegistryId` are reserved columns — there is no live
  integration with the national registries.
- Analytics is facility-level operational reporting, not the privacy-preserving
  national aggregation the NDHA describes (see `app/api/analytics/route.ts`).
- There is no automated test suite in the repo.
