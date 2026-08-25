# LinkedIn reply — "one patient, one record" vs "one patient, one journey"

Reply to Ugochukwu Akpor's post. His argument, in short: Nigeria's NDHA push for
"One Patient, One Health Record" is real progress, but a connected *record* is not a
connected *journey*. A patient can have a digital record and still wait for approval,
repeat information, get shuffled between departments, ferry documents between
facilities, or not know the next step. His closing question: "what happens when the
system doesn't know what to do?" — and a direct CTA asking builders what they see
from the inside.

**Do not lead this reply with FHIR / NIN / interoperability.** That is the layer he is
arguing is the easy, insufficient one; leading with it reads as not having read him.
Lead with the workflow layer and the exception paths. The compliance measures come in
as the guardrail on deviations, not as the headline.

LinkedIn caps a comment at 1,250 characters. Version A fits at 1,184.

---

## Version A — main comment (1,184 chars)

You've named the part most of us skip, Ugochukwu.

I'm building CareVault, an EHR for Nigerian facilities. The record layer was the quick
part. The journey layer took everything — and nearly all of that work was modelling
what happens when reality leaves the happy path.

Three examples:

A doctor requests admission; the bed may not exist. So "requested" is a real state
with an owner and a decline reason, and the queue sorts by triage severity, not
arrival time.

A supply order is one row carrying two statuses — what the requesting department sees,
and what stores sees. Same record, two vantage points, neither blocking the other.

Pharmacy stores what was prescribed and, separately, what was actually dispensed.
Brands go out of stock, and a system that can't say so quietly falsifies the patient's
history.

Every deviation — decline, override, substitution — lands on an append-only audit
trail with a reason attached. The exception is the thing you most need to reconstruct
later.

Digitising the happy path is easy. The exceptions are the job.

CareVault is demo-ready. I'd welcome your eyes on it, and I'm looking to build with
people seeing the same thing. Following the series.

---

## Version B — short comment (~700 chars)

"One patient, one record" is a storage problem. "One patient, one journey" is a
workflow problem, and they get solved by completely different work.

Building CareVault, an EHR for Nigerian facilities, the record layer was quick. What
took the time was the disconnected bits you list: an admission request that can be
declined, with a reason and an owner, queued by triage severity rather than arrival;
department handoffs that notify the next person it's their turn; a result the patient
can see the moment it's signed, so nobody carries paper.

Every deviation is audit-logged with a reason — because the exception is what you
need to reconstruct later.

Demo-ready, and I'd value your eyes on it.

---

## Version C — if you want the partner ask explicit

Swap Version A's last paragraph for:

CareVault is demo-ready. Feedback and input are genuinely welcome — and I'm looking
for a partner who sees this the same way, to build healthtech that actually fits how
Nigerian facilities work. My inbox is open too.

---

## Version D — alternate opening lines

1. "You've named the part most of us skip, Ugochukwu." (default — direct, no flattery)
2. "One patient, one record is a storage problem. One patient, one journey is a
   workflow problem. Different work entirely."
3. "The question at the end of your post — what happens when the system doesn't know
   what to do — is the one I've spent the most time on."

---

## Evidence for every claim in the drafts

| Claim | Where it lives |
| --- | --- |
| "requested" is a real admission state, with decline reason / who / when | `admissions.status`, `declineReason`, `declinedBy`, `declinedAt` — `lib/db/schema.ts:545` |
| Admission queue sorts by triage severity, not arrival | `ADMISSION_SEVERITIES` (`rank` drives the sort), `lib/constants.ts:26` |
| Supply order carries two statuses for two departments | `supplyOrders.departmentStatus` + `supplyStatus`, `lib/db/schema.ts:338` |
| Prescribed vs actually dispensed, incl. brand substitution + batch | `prescriptions.genericId` / `productId` / `dispensedProductId` / `batchNumber`, `lib/db/schema.ts:381` |
| Department handoff notifies the next person | `notifications` table (per-user, per-request, per-department), `app/api/notifications/` |
| Patient sees results without carrying paper; "seen" is tracked | `requestResults.viewedAt`, `app/(authenticated)/my-history` |
| Ward/bed movement history, not just current location | `admissionTransfers` (from → to, reason, who, when) |
| Cancellations capture a reason | `cancellationReason` on `supplyOrders` and `prescriptions` |
| Undetermined diagnosis still recordable | `visitDiagnoses.icdCode` nullable + `clinicalText` |
| Duplicate-patient override permitted but logged | `action: "duplicate.override"`, `app/api/patients/route.ts:234` |
| Append-only audit trail on every mutation and auth event | `lib/audit.ts`, `auditLogs` (no FKs, never updated or deleted) |

Supporting material (secondary — mention only if the thread goes there):

- FHIR R4 export per patient: `lib/fhir.ts`, `app/api/patients/[id]/fhir/route.ts`
- ICD-11 MMS coded diagnoses: `icd11Codes`, `visitDiagnoses`
- NIN as identity anchor, duplicate detection: `app/api/patients/route.ts:144`
- Consent with purpose, expiry, withdrawal: `patientConsents`
- Rectification / erasure requests: `dataRequests`, `app/api/data-requests/`
- RBAC per module + action: `lib/authz.ts`, `lib/constants.ts`
- Multi-tenancy: `organisationId` on every table, `lib/org.ts`

Known limits — say these plainly if challenged, don't paper over them:

- The FHIR export is not constrained to Nigerian FHIR profiles (NDHTO hasn't published
  them) — see the header comment in `lib/fhir.ts`.
- `clientRegistryId` / `workerRegistryId` are reserved columns; there is no live
  integration with the national registries.
- Analytics is facility-level operational reporting, not the privacy-preserving
  national aggregation the NDHA describes (`app/api/analytics/route.ts`).
- No automated test suite in the repo.
