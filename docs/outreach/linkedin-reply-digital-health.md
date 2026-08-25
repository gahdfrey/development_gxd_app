# LinkedIn reply — "one patient, one record" vs "one patient, one journey"

Reply to Ugochukwu Akpor's post. His argument: the NDHA push for "One Patient, One
Health Record" is real progress, but a connected record is not a connected journey. He
lists five ways the journey stays broken — waiting for an approval, repeating
information, moving between departments, carrying documents between facilities, not
knowing the next step — and closes with "what happens when the system doesn't know
what to do?" plus an invitation to builders to say what they see from the inside.

Approach: answer his list item by item, naming what is actually built in CareVault
against each one. Do not lead with FHIR/NIN/interoperability — that is the layer he
already conceded.

LinkedIn caps a comment at 1,250 characters and does **not** render markdown, so no
bold or bullet characters in the posted text. Version A fits at 1,244.

---

## Version A — main comment (1,244 chars, plain text as posted)

Ugochukwu, the five gaps you list are essentially the build list for CareVault, an EHR
for Nigerian facilities:

Waiting for approval — admission is a request with a state. Raised from the
consultation, queued by triage severity rather than arrival, then admitted or declined
with a reason and a name attached.

Repeating information — the patient is registered once, against their NIN. Every
appointment, lab request, prescription and admission hangs off that record, so the lab
already knows who ordered it and why.

Moving between departments — a request routes to the receiving department's queue and
notifies them it's their turn. Ward moves are recorded as transfers, with a reason.

Carrying documents — results land in the patient's own portal, and the whole record
exports as a FHIR R4 bundle. Nothing to physically carry.

Not knowing the next step — everything carries a visible status, patient-side too:
what's paid, what's ready, what's new.

When the system doesn't know what to do, it says so rather than guessing: decline
reasons, cancellation reasons, prescribed vs dispensed, undetermined diagnoses. All on
an append-only audit trail.

Demo-ready. Feedback genuinely welcome, and I'm looking to build with people who see
it this way.

---

## Version B — DM / follow-up (he invites the inbox; no character cap here)

Hi Ugochukwu — commented on your post, but the short version doesn't do the point
justice, so here's the longer one.

I've spent the last stretch building CareVault, a multi-tenant EHR for Nigerian
facilities, and your distinction is the one that reorganised how I built it. The
record was the easy half. Here's what each of your five gaps actually became in the
system:

Approvals. A doctor raises an admission request from inside the consultation. It
enters a queue ordered by triage severity — critical, urgent, high, routine — not by
who asked first. The desk admits it against a specific ward and bed, or declines it
with a reason, and both the decision and the person who made it are stored. The same
shape covers supply orders: the requesting department and the store see the same order
through two independent statuses, so neither is blocked waiting on the other's view of
it.

Repetition. Registration is anchored on the NIN. A second record with the same NIN is
refused outright; a matching phone or name raises a soft warning that staff can
override, and the override itself is audit-logged. Next of kin, HMO and policy number
are captured once. Everything downstream — appointments, visits, lab and radiology
requests, prescriptions, admissions — references that one patient record.

Department handoffs. A request is routed to a department, lands in that department's
queue, and raises a notification for the staff there. Results are uploaded back onto
the same request. Ward-to-ward moves during an admission are written as transfer rows
— from, to, reason, who, when — so you get the whole movement history, not just the
patient's current bed.

Documents. Clinical files are stored privately and served only through an
authenticated proxy — no public URLs. Patients see their own results in a portal, and
the system tracks whether a result has actually been opened. For portability, any
patient's record exports as a FHIR R4 bundle (Patient, Practitioner, Encounter,
Condition, DiagnosticReport, MedicationRequest, Consent, Coverage), with diagnoses
coded to WHO ICD-11 rather than free text.

Next step. Every artifact carries an explicit status, and the patient sees their side
of it: appointments, results marked new or viewed, and what has been paid.

Your closing question is the one I found hardest, and I think it's the right one. What
happens when the system doesn't know what to do? My answer was to make the exception a
first-class citizen rather than a dead end. A declined admission stores why. A
cancelled order stores why. A diagnosis that can't yet be coded is still recorded as
clinical text. And pharmacy stores what was prescribed separately from what was
actually dispensed, down to the brand and batch — because brands go out of stock, and
a system that can't record the substitution quietly falsifies the patient's history
and breaks any adverse-event trace later.

On the governance side, since it's usually the next question: consent is captured at
registration with purpose, information types, expiry and withdrawal; there's an
append-only audit trail over every mutation and every login; patients can file
rectification and erasure requests that staff work through a review queue; access is
role-based down to module and action; and every query is scoped to the facility.

Two things I'd rather say up front than be caught on: the FHIR export isn't yet
constrained to Nigerian profiles, because NDHTO hasn't published them, and the
national registry IDs are reserved fields until those registries are actually live.

It's demo-ready. I'd value your read on it, and I'm looking for people to build this
with properly — happy to take you through it whenever suits.

---

## Version C — short comment (~640 chars), if A feels too long for the thread

Ugochukwu, your five gaps are more or less my build list. In CareVault: admission is a
request that can be declined with a reason, queued by triage severity rather than
arrival; the patient is registered once against their NIN and everything downstream
hangs off that record; requests route to a department's queue and notify it; results
reach the patient's own portal, and the record exports as FHIR R4, so there's nothing
to carry.

And when the system doesn't know what to do, it records that instead of guessing —
decline reasons, prescribed vs dispensed, undetermined diagnoses, all audit-logged.

Demo-ready, and I'd welcome your eyes on it.

---

## Evidence for every claim above

| Claim | Where it lives |
| --- | --- |
| Admission is a request state, declined with reason / who / when | `admissions.status`, `requestedBy`, `declineReason`, `declinedBy`, `declinedAt` — `lib/db/schema.ts:545` |
| Queue ordered by triage severity, not arrival | `ADMISSION_SEVERITIES` with `rank` driving the sort — `lib/constants.ts:26` |
| Admitted against a specific ward and bed | `admissions.wardId` / `bedId`, `wards` / `beds` tables |
| Ward moves recorded as transfers with reason | `admissionTransfers` (from/to ward+bed, reason, by, at) |
| Supply order carries two independent statuses | `supplyOrders.departmentStatus` + `supplyStatus` — `lib/db/schema.ts:338` |
| NIN anchors registration; duplicates refused, overrides logged | `app/api/patients/route.ts:144-234`, audit action `duplicate.override` |
| Requests route to a department and notify its staff | `requests.departmentId`, `notifications` table, `app/api/notifications/` |
| Results attach back to the request | `requestResults`, `app/api/requests/` |
| Patient portal; result-opened tracking | `requestResults.viewedAt`, `app/(authenticated)/my-history` |
| Clinical files private, authenticated proxy only | `app/api/blob/download/route.ts` |
| FHIR R4 export bundle | `lib/fhir.ts`, `app/api/patients/[id]/fhir/route.ts` |
| ICD-11 MMS coded diagnoses; undetermined still recordable | `icd11Codes`, `visitDiagnoses` (`icdCode` nullable + `clinicalText`) |
| Prescribed vs actually dispensed, brand + batch | `prescriptions.genericId` / `productId` / `dispensedProductId` / `batchNumber` — `lib/db/schema.ts:381` |
| Cancellations store a reason | `cancellationReason` on `supplyOrders` and `prescriptions` |
| Payment status visible on the request | `requests.paymentStatus`, `lib/payments/`, `app/api/payments/` |
| Consent: purpose, information types, expiry, withdrawal | `patientConsents`, `app/api/patients/route.ts:241-266` |
| Append-only audit trail over mutations and auth events | `lib/audit.ts`, `auditLogs` (no FKs, never updated or deleted) |
| Rectification / erasure requests with review queue | `dataRequests`, `app/api/data-requests/`, `app/(authenticated)/data-requests/` |
| RBAC per module and action | `lib/authz.ts`, `lib/constants.ts` |
| Every query scoped to the facility | `organisationId` on every table, `lib/org.ts#getOrgId()` |

Known limits — state these plainly if challenged:

- The FHIR export is not constrained to Nigerian FHIR profiles (NDHTO hasn't published
  them) — see the header comment in `lib/fhir.ts`.
- `clientRegistryId` / `workerRegistryId` are reserved columns; no live integration
  with the national registries.
- Analytics is facility-level operational reporting, not the privacy-preserving
  national aggregation the NDHA describes (`app/api/analytics/route.ts`).
- No automated test suite in the repo.
