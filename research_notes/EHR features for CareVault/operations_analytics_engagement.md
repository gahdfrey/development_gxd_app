# Hospital Operations, Analytics, Security/Compliance and Patient Engagement — Feature Inventory for CareVault (2025–2026)

Context: CareVault already has patients, appointments, ADT with wards/beds, lab, radiology, pharmacy, inventory/products, orders, finance, payments/wallets, RBAC, audit logs, consent and data-subject requests, and a patient portal (history, appointments, result viewing). Everything below is a candidate addition or deepening. Note that some findings come from vendor or marketing pages (flagged as such); regulatory items come from law-firm summaries or primary texts.

## Scheduling and front office (self-booking, templates, rosters, waitlists, no-show prediction, reminders, kiosks, queue boards, visitor management)

### Takeaway
Self-scheduling is now a baseline expectation and measurably reduces no-shows. Risk-targeted reminders driven by no-show prediction give roughly 17% relative reductions. Visitor management for admitted patients (per-ward visiting hours, QR passes, visitor logs) is a distinct module that CareVault's ADT/bed data could power cheaply.

### Cited Findings
- A 2025 MGMA Stat poll found nearly 9 in 10 patients would choose a practice based on convenience features such as self-scheduling and texting. A 2025 Frontiers in Digital Health study reported no-show rates of 1.8% for online-booked visits vs 5.9% for staff-booked visits (as summarised by Clinekt, a secondary aggregator) — [Clinekt scheduling statistics](https://clinekthealth.com/blog/patient-scheduling-statistics)
- Zocdoc data: 43% of appointments were booked after office hours (about 28% evening, 5–11pm, and about 14% overnight). 68% of bookings came from mobile vs 32% desktop. More than a third of patients were seen within 48 hours of booking — [Clinekt](https://clinekthealth.com/blog/patient-scheduling-statistics); [TechTarget on Zocdoc 2025 report](https://www.techtarget.com/patientengagement/news/366636295/Zocdoc-Patients-valued-in-person-timely-access-to-care-in-2025)
- Zocdoc's 2025 "What Patients Want" report: 93% of non-mental-health visits in 2025 were in person, and patients prioritise timely, in-person access — [TechTarget](https://www.techtarget.com/patientengagement/news/366636295/Zocdoc-Patients-valued-in-person-timely-access-to-care-in-2025)
- An XGBoost no-show model plus phone reminders for the top 25% highest-risk patients cut the no-show rate from 19.3% to 15.9% (a 17.2% relative improvement) — [Malaysia tertiary hospital study, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10624443/)
- In a randomised QI initiative, adding model-driven live telephone outreach to standard automated reminders reduced in-person no-shows from 36% to 33% — [ResearchGate RCT](https://www.researchgate.net/publication/370443954_Reducing_Disparities_in_No_Show_Rates_Using_Predictive_Model-Driven_Live_Appointment_Reminders_for_At-Risk_Patients_a_Randomized_Controlled_Quality_Improvement_Initiative)
- Gradient boosting reached about 78% accuracy among the ML algorithms compared for no-show prediction. The predictions support targeted overbooking and reminders — [BMC Health Services Research](https://bmchealthservres.biomedcentral.com/articles/10.1186/s12913-023-10418-6)
- Hospital visitor management features: pre-registration with QR or digital passes; ID capture; check against patient permissions and visiting hours; per-ward visiting-hour windows; visitors-per-patient count with entry/exit times; watchlist screening; badge printing showing the patient visited and allowed areas; automatic ward notification; time-slot booking to prevent overcrowding; passes that expire after a set time or single use; and a tamper-proof audit trail (vendor guide) — [Coram hospital VMS guide](https://www.coram.ai/post/hospital-visitor-management-system); [Censinet visitor access best practices](https://censinet.com/perspectives/10-best-practices-for-hospital-visitor-access-control)
- A typical US policy example is 8am–8pm visiting with two visitors at a time, aged 18 or older — [Coram](https://www.coram.ai/post/hospital-visitor-management-system)

### Inferences
- Feature list for CareVault scheduling:
  - Recurring slot templates per doctor and clinic (duration, capacity, visit type).
  - Doctor duty rosters that feed slot availability, with leave and holiday blocking.
  - Patient self-booking in the portal with deposit or prepayment through the existing wallet/payments.
  - Waitlist with auto-offer when a slot is cancelled.
  - SMS/WhatsApp reminders at 72h, 24h and 2h, with confirm or cancel replies.
  - A simple no-show risk score (start with rules on prior no-shows, lead time, distance and payer; move to ML later), with high-risk patients routed to a phone-call list.
  - Front-desk check-in with queue tokens and a TV queue display board per clinic (a public URL showing token numbers only, no names, for privacy).
  - Optional check-in kiosk on a tablet.
- Visitor management fits naturally on top of the existing admission/bed data:
  - Ward-level visiting rules.
  - A patient- or nurse-approved visitor list.
  - QR visitor pass linked to the admission, expiring at discharge or end of the day.
  - Gate/security log.
  - Count of visitors currently on a ward.
  - Ability to block or ban a visitor.
- In Nigerian private hospitals, after-hours mobile booking and WhatsApp reminders are likely the highest-value items. The Zocdoc mobile and after-hours figures are US data, so this is an inference.

### Gaps
- No Nigeria-specific no-show rate data found.
- No reliable data found on SMS vs WhatsApp reminder effectiveness in Nigeria.
- No primary source found on check-in kiosk ROI.

## Patient portal and engagement (MyChart-style)

### Takeaway
MyChart's core set is secure messaging, proxy/family access, itemised bill pay with payment plans, scheduling, refills, questionnaires, after-visit summaries (AVS) and record download. Epic's 2025 additions are AI (the "Emmie" assistant): plain-language AVS, automatic follow-up reminders, pre-visit agenda capture, and help explaining results. IPS (FHIR) is the standard for a portable patient summary download.

### Cited Findings
- Proxy access lets one account manage family members' records, for example children or elderly parents. It is typically granted to parents or guardians of minors, legal guardians, or people with healthcare power of attorney. Each organisation sets its own proxy rules, including access that changes with the patient's age (for example adolescent confidentiality) — [IntuitionLabs on MyChart](https://intuitionlabs.ai/software/radiology-workflow-informatics/patient-communication-portals/epic-mychart); [Epic-hosted MyChart patient and proxy guide (2025)](https://mychart.et0948.epichosted.com/MyChart/en-us/docs/mychart-patient_and_proxy_guide.pdf)
- MyChart bill pay: view itemised bills, pay online, manage insurance information, and set up payment plans — [IntuitionLabs](https://intuitionlabs.ai/software/radiology-workflow-informatics/patient-communication-portals/epic-mychart)
- Emmie (Epic UGM, August 2025) is an always-on AI assistant in MyChart. It answers questions about lab results, proposes appointment times and suggests screenings to discuss with the doctor — [CNBC](https://www.cnbc.com/2025/08/20/epic-ugm-2025-epic-touts-new-ai-tools.html); [Epic Emmie page](https://www.epic.com/software/emmie/)
- Before a visit, Emmie contacts the patient to build a visit agenda. AI rewrites the AVS in plain language and turns visit documentation into proactive follow-up reminders. A wellness-goals feature (smoking cessation, activity, sleep) is planned — [ICT&health](https://www.icthealth.org/news/epic-launches-new-ai-tools-for-patients-and-healthcare-providers); [Becker's](https://www.beckershospitalreview.com/healthcare-information-technology/innovation/epics-mychart-to-add-ai-tool-for-patient-wellness-goals/)
- Sutter Health was the first adopter of Epic's patient AI chatbot — [Becker's](https://www.beckershospitalreview.com/healthcare-information-technology/ehrs/sutter-health-1st-to-adopt-epics-ai-chatbot-for-patients/)
- IPS is a minimal, non-exhaustive dataset (ISO 27269) expressed as a FHIR Document. HL7 IPS IG v2.0.0 is the current version (published about October 2025). Servers can generate an IPS through the FHIR `$summary` operation. IPS bundles can be shared to phones via SMART Health Links — [HL7 IPS IG](https://www.hl7.org/fhir/uv/ips/); [Oracle HDR IPS generator](https://docs.oracle.com/en/industries/health-sciences/healthcare-data-repository/8.2.0.3/fhir-guide/international-patient-summary-ips-generator.html); [CommonHealth](https://www.commonhealth.org/international-patient-summary)
- The NDPA grants data-portability, rectification, erasure, restriction and objection rights — [Mondaq: data-subject rights under NDPA](https://www.mondaq.com/nigeria/privacy-protection/1346702/rights-of-a-data-subject-under-the-nigeria-data-protection-act-2023)

### Inferences
- Portal backlog for CareVault, in suggested priority order:
  1. Bill view and pay, including outstanding balance, itemised invoice, wallet top-up and installment plans. This reuses the existing payments/wallets.
  2. Family/proxy linking: a parent manages children, an adult child manages an elderly parent. Use a proxy-relationship table with scope (view-only, booking, billing) and an expiry date, plus audit of proxy actions.
  3. Secure messaging to the care team, with triage routing and SLA flags.
  4. Prescription refill requests routed to the doctor, then to pharmacy.
  5. Pre-visit forms and questionnaires, including intake, consent and PROMs such as PHQ-9 and GAD-7, saved as structured data.
  6. AVS / discharge summary publishing, with plain-language text and follow-up reminders.
  7. Health-record download as a PDF summary first, then a FHIR IPS bundle. IPS also supports the NDPA portability right and NDHA interoperability.
  8. Feedback and satisfaction surveys after visits.
- Proxy access interacts with sensitive-record restriction (see the security section). Proxies should not see restricted categories by default.
- An LLM "explain my result" feature is a 2025–26 differentiator. It would need DPIA coverage under GAID because it is new technology processing health data.

### Gaps
- No published adoption or usage metrics for MyChart proxy or bill pay were found in this pass.
- No Nigeria-specific patient-portal adoption data found.

## Inventory and supply chain (expiry, batch/lot, reorder, POs, suppliers, transfers, controlled drugs, consumption)

### Takeaway
Batch- and expiry-level stock with FEFO allocation (first-expiry, first-out), recall by batch, and a NAFDAC controlled-substance register are standard in Nigerian pharmacy products. Hospital-pharmacy best practice requires a two-signature controlled-drug register with a running count.

### Cited Findings
- FEFO means stock with the shortest expiry is placed and issued first. Expiry dates correlate with efficacy and patient safety — [Pharmacy Times](https://www.pharmacytimes.com/view/the-art-of-inventory-management-how-techs-keep-pharmacies-running-smoothly); [IJHP FIFO/FEFO evaluation](https://ijhp.net/index.php/IJHP/article/download/8/11)
- Nigerian pharmacy/ERP products advertise batch-level inventory by batch, expiry and warehouse location; FEFO-aware allocation; one-step recalls by batch, SKU, brand or supplier; traceability on every invoice; and a NAFDAC controlled-substance register with drug-interaction alerts (vendor claims) — [EziPharmaPOS](https://ezipharmapos.zarahcl.com/); [MediRxTrack](https://medirxtrack.com/)
- MSH pharmaceutical-management guidance for facilities: a special register for controlled drugs records each receipt or issue with two signatures, a physical count after each entry, and signatures at handover/takeover — [MSH MDS-3 ch. 46](https://msh.org/wp-content/uploads/2013/04/mds3-ch46-facilitiespharmacymgmt-mar2012.pdf)

### Inferences
- Inventory feature list for CareVault:
  - **Stock tracking:** stock lots carry batch number, expiry date, supplier and cost. FEFO auto-selects the batch at dispense (the existing DispenseModal is the natural hook). Expiry alerts at 90, 60 and 30 days. Quarantine/expired status, plus write-off with reason and approval.
  - **Replenishment and purchasing:** reorder level, reorder quantity and lead time per item per store. A supplier master. Purchase requisition, then PO, then goods-received note (GRN) with batch capture, then supplier invoice matching.
  - **Multiple stores:** main store, pharmacy, ward and theatre stores. Inter-store transfer requests and issue vouchers. Periodic stock-take with variance reports.
  - **Controlled drugs:** a register (opioids, benzodiazepines, etc.) with dual sign-off (witness), running balance, per-shift count at handover, and a discrepancy workflow.
  - **Recalls:** recall a batch and list the patients it was dispensed to.
  - **Analytics:** consumption by department, ABC/VED analysis, dead stock, expiry losses in naira, and days-of-stock-on-hand.
- Recall-to-patient traceability needs a dispense record linked to the batch. Check whether CareVault's dispense rows store the batch.

### Gaps
- No primary NAFDAC or PCN text found on the required format of electronic controlled-drug registers. Whether e-registers are legally accepted in place of paper is unconfirmed.

## HR and operations (rosters, shifts, handover, assets, housekeeping/bed turnaround, dietary, mortuary, blood bank)

### Takeaway
Bed-turnaround tooling (bed states of occupied, dirty, cleaning, clean and maintenance, plus housekeeping alerts) shows large measured gains. Nigerian HMS competitors commonly ship mortuary, blood bank, shift management and HMO claims modules, so these are expected in the local market.

### Cited Findings
- A bed management system cut bed turnover time from 111 to 49 minutes, with transport time down from 45 to 26 minutes and housekeeping time down from 63 to 49 minutes — [ResearchGate study](https://www.researchgate.net/publication/233900692_Improving_Bed_Turnover_Time_With_a_Bed_Management_System)
- Epic's mobile "Rover" coordination between housekeeping and clinicians cut Parkview Health's turnaround by 7 minutes per bed — [Epic: Mobile teamwork for faster bed turnaround](https://www.epic.com/epic/post/mobile-teamwork-faster-bed-turnaround/)
- Bed status models use occupied, dirty, clean and maintenance states, with alerts when a bed stays "dirty" past a threshold (vendor) — [Oxmaint](https://oxmaint.com/industries/healthcare/hospital-bed-management-asset-tracking-saves-nurses-time); [Kontakt.io](https://kontakt.io/solutions/healthcare/care-operations/hospital-bed-management-system/)
- Large hospitals (over 300 beds) run 24/7 capacity command centres with tiered huddles and turnaround targets — [Cara Cook Consulting](https://www.caracookconsulting.com/bed-management-top-tips)
- Nigerian HMS products list mortuary management, blood bank, shift management, and HMO claims with tariff management and real-time pre-authorisation — [SoftwareSuggest Nigeria HMS 2026](https://www.softwaresuggest.com/blog/hospital-management-software-in-nigeria/); [MedSoftwares Nigeria guide](https://www.medsoftwares.com/news/hospital-software-nigeria-guide)
- In Nigerian hospitals, NHIS and HMO schemes increasingly require documented, auditable clinical pathways. Gaps lead to claim rejections and lost revenue (vendor blog) — [eLabAssist](https://blogs.elabassist.com/his-emr-ehr-integration-challenges-nigeria/)

### Inferences
- Operations feature list for CareVault:
  - **Staff rosters and handover:** staff rosters and shift schedules for nurses, doctors and lab staff, with shift swap requests and duty-roster publishing. Nursing shift handover notes in SBAR format per ward.
  - **Equipment and assets:** asset register with serial number, location and warranty. Planned preventive maintenance schedules, breakdown work orders and downtime log. This matters for generators and oxygen concentrators in Nigeria.
  - **Housekeeping and beds:** extend the existing bed status with dirty/cleaning/blocked states. A housekeeping task queue triggers on discharge, with dirty-to-clean time tracked as a KPI.
  - **Dietary:** diet orders per admitted patient (NPO, diabetic, soft, etc.) and a kitchen meal list per ward.
  - **Mortuary:** body intake, linked to the deceased patient record and death certificate. Storage-days billing, release to next of kin with ID verification, and an embalming log.
  - **Blood bank:** donor registry, screening results, unit inventory by group and expiry, crossmatch, issue and transfusion-reaction recording.
  - **HMO/NHIA:** payer/HMO master, tariffs per plan, pre-authorisation requests, claims batching and rejection tracking. This is arguably the highest-revenue item for Nigerian private hospitals, even though it sits partly outside "operations".

### Gaps
- No primary Nigerian data found on mortuary or blood bank module usage.
- No source found for NHIA claims-format technical specifications.

## Analytics and management reporting

### Takeaway
Standard KPI definitions are well established: bed occupancy, ALOS (inpatient days ÷ discharges), lab TAT (specimen receipt to result), and readmission rate (for example 30-day). Leaders such as Epic offer self-service slice-and-dice reporting (SlicerDicer) and now natural-language report generation. HIMSS EMRAM Stage 7 explicitly requires data warehousing and advanced analytics.

### Cited Findings
- KPI definitions:
  - Bed occupancy is the percentage of available beds in use.
  - ALOS is total inpatient days ÷ discharges.
  - Lab TAT is specimen receipt to result delivery.
  - Readmission rate is the share of patients returning within a defined period after discharge.
  - Operational dashboards track occupancy, discharge time, surgery cancellations and staffing. Clinical dashboards track ALOS, readmissions, satisfaction and mortality.
  - Sources: [Telecrm](https://telecrm.in/blog/healthcare-dashboard/); [insightsoftware hospital KPIs](https://www.insightsoftware.com/blog/16-top-hospital-kpis-for-reporting/)
- Epic SlicerDicer is self-service reporting over longitudinal and real-time data without a report writer. The embedded AI assistant "SideKick" builds reports from plain-language questions — [Epic Healthcare Intelligence](https://www.epic.com/software/healthcare-intelligence/)
- Epic Cosmos holds about 320M de-identified patient records from 23B encounters, pooled across Epic customers for benchmarking and research — [UC Davis Health](https://health.ucdavis.edu/data/epic-cosmos.html)
- EMRAM Stage 7: paper charts are no longer used, all data/documents/images are in the EMR, and the hospital uses data warehousing and advanced analytics to share information inside and outside the organisation. Certification is renewed every three years — [HIMSS EMRAM](https://www.himss.org/maturity-models/emram/); [Databank IMX](https://www.databankimx.com/2024/09/18/how-your-health-system-can-reach-himss-stage-7/); [NIH CC Stage 7 news 2025](https://www.cc.nih.gov/news/2025/may-jun/emram-stage-7)

### Inferences
- Dashboard set for CareVault, all computable from existing tables:
  - **Inpatient:** bed occupancy by ward, ALOS, and bed turnover.
  - **Outpatient:** visits per day by clinic/doctor, no-show rate, and wait time from check-in to consult.
  - **Lab and radiology:** order-to-result TAT, broken into order to sample, sample to result, and result to viewed (the existing result-viewed tracking enables this).
  - **Revenue:** by department/service/payer, collections vs billed, debtor ageing, and HMO receivables.
  - **Pharmacy:** sales, margin and expiry losses.
  - **Readmissions:** 30-day readmission rate.
  - **Staff:** staff productivity.
- Delivery approach:
  - Scheduled management reports (daily census email/PDF, monthly MD pack) and CSV/XLSX exports, permission-gated and audit-logged.
  - Org-scoped materialised views or nightly aggregate tables to keep dashboards fast.
- A cross-tenant "Cosmos-lite" benchmark is possible only with de-identification and explicit DPA terms. Under the NDPA this is health-data processing that likely needs a DPIA.

### Gaps
- No Nigerian benchmark values found for ALOS or occupancy in private hospitals.

## Security and compliance (break-the-glass, sensitive records, access reviews, audit analytics, encryption, backups/DR, retention, e-signatures, amendments, ISO 27001 / HIPAA)

### Takeaway
The proposed HIPAA Security Rule update (NPRM, January 2025, not yet final) converts encryption and MFA into mandatory controls and adds concrete timelines. Under Nigeria's GAID 2025 (effective 19 September 2025), health-data processors are classed as Data Controllers/Processors of Major Importance (DCPMI), with DPIA, DPO and annual Compliance Audit Return (CAR) obligations starting with the 2026 cycle. The NDPA requires breach notification to the NDPC within 72 hours. Break-the-glass access needs three parts: real-time override, automatic logging and mandatory review.

### Cited Findings
- HIPAA Security Rule NPRM (published 6 January 2025; comments closed 7 March 2025; still proposed) — [Bradley](https://www.bradley.com/insights/publications/2025/03/top-10-takeaways-from-the-new-hipaa-security-rule-nprm); [Accusights](https://accusights.com/blog/hipaa-security-rule-update-2026). Proposed requirements:
  - **Asset inventory and data mapping:** written inventory of assets, updated at least annually, and a map of how ePHI flows.
  - **MFA:** mandatory for all technology assets, with narrow legacy exceptions.
  - **Encryption:** ePHI encrypted at rest and in transit.
  - **Network segmentation.**
  - **Testing:** vulnerability scans at least every 6 months and penetration tests at least every 12 months.
  - **Recovery:** critical systems restored within 72 hours.
  - **Access termination:** within 1 hour of employment ending.
  - **Incident response:** plan tested annually.
  - **Audit:** annual compliance audit.
  - **Business associates:** notify within 24 hours of contingency-plan activation, and annual verification of their safeguards.
- GAID 2025 — [DLA Piper](https://privacymatters.dlapiper.com/2025/06/nigeria-ndpc-issues-gaid-key-compliance-insights/); [NDPC GAID PDF](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf); [Mondaq GAID summary](https://www.mondaq.com/nigeria/privacy-protection/1606106/the-nigeria-data-protection-commission-issues-the-general-application-and-implementation-directive-2025-gaid):
  - Took effect 19 September 2025 after a six-month transition.
  - CAR filing applies to DCPMIs, with fees of ₦100,000–₦1,000,000 depending on volume. Implementation begins with the 2026 audit cycle.
  - Higher-tier entities must file through a licensed Data Protection Compliance Organisation (DPCO).
  - Includes a DPIA template (Schedule 4).
  - Cross-border transfer instruments need Commission approval.
- GAID Schedule 7 lists organisations processing health data as DCPMIs. They must run DPIAs, keep records of processing (ROPA) and file annual CARs. A DPIA must be signed by a certified DPO and its outcome included in the CAR — [Mondaq: Data, Dignity & Digital Health](https://www.mondaq.com/nigeria/data-protection/1781892/data-dignity-digital-health-balancing-technological-innovation-and-patient-privacy); [UUBO regulatory update](https://uubo.org/wp-content/uploads/2025/03/REGULATORY-UPDATE-NDPC-ISSUES-GAID-2025.pdf)
- NDPA s.40 breach notification:
  - The controller notifies the NDPC within 72 hours of becoming aware of a breach that is likely to risk data subjects' rights.
  - Data subjects must be notified without undue delay if the risk is high.
  - Processors notify the controller.
  - The notification must cover the nature of the breach, categories and number of people affected, likely consequences, and mitigation.
  - Sources: [CookieYes NDPA guide](https://www.cookieyes.com/blog/nigeria-data-protection-act-ndpa/); [PrivacyNeedle](https://privacyneedle.com/compliance/legislation/the-72-hour-rule-what-ndpa-and-gdpr-say-about-data-breaches/)
- The NCC Internet Code of Practice 2026 sets a separate 48-hour breach rule. It applies only to Internet Access Service Providers, not hospitals or EHR vendors, so it is not a conflict with the NDPA's 72 hours — [Mondaq 48-hour analysis](https://www.mondaq.com/nigeria/privacy-protection/1808672/nigerias-48-hour-data-breach-notification-requirement-regulatory-implications-and-comparative-analysis)
- Break-the-glass is an emergency override letting a clinician open a record outside normal permissions. It needs three parts: real-time override, automatic logging and mandatory review. For 42 CFR Part 2 (substance-use) records in the US, a break-glass reason alone is not sufficient. Sensitive data should be containable at the program, encounter and form level — [EHRSource Part 2 guide 2026](https://www.ehrsource.com/articles/42-cfr-part-2-compliance-guide-2026/); [blueBriX Part 2 evaluation framework](https://bluebrix.health/blogs/choosing-a-42-cfr-part-2-ready-ehr-an-evaluation-framework-for-behavioral-health-leaders); [Censinet break-glass pros/cons](https://censinet.com/perspectives/break-glass-access-pros-and-cons-for-healthcare)
- The AMA notes that break-the-glass for employee or VIP record access is often adopted by organisations as policy rather than strictly required by HIPAA, and that it adds clinician burden — [AMA regulatory myth](https://www.ama-assn.org/health-care-advocacy/administrative-burdens/are-break-glass-functions-required-employee-ehr-access)

### Inferences
- Security/compliance backlog for CareVault:
  1. **Sensitive-record restriction:** flag encounters, diagnoses or documents as restricted (HIV, mental health, SUD, sexual/reproductive health, VIP/staff-patient). Restricted items are hidden from general roles, proxies and the portal by default.
  2. **Break-the-glass:** when a user lacks access, they must give a reason (from a list plus free text) to get time-boxed access (for example 1–4 hours). The event is audit-logged with high severity, and the privacy officer reviews it in a queue with an approve/flag outcome.
  3. **Access-review campaigns:** quarterly listing of users × roles per org. Managers attest or revoke. Dormant accounts (no login in N days) are auto-flagged. Deprovisioning is fast (the NPRM proposes 1 hour), which the DB-checked `getAuthContext` design already supports.
  4. **Audit analytics:** a dashboard with anomaly rules such as user viewing their own or same-surname records, unusual volume, after-hours access, and access to patients without an encounter. Patient-facing "who viewed my record" in the portal is optional.
  5. **Breach-incident register:** a 72-hour countdown to the NDPC deadline, notification template fields (nature, categories, counts, consequences, measures) and data-subject notification tracking.
  6. **Compliance artefacts as admin modules:** ROPA, DPIA records (GAID Schedule 4 fields), DPO details and CAR evidence export. This supports private-hospital tenants who must file CARs from 2026 and is a strong SaaS differentiator in Nigeria.
  7. **Retention policies:** per record type, with legal hold and anonymise-on-expiry. These link to the existing data-subject requests, where erasure must be balanced against medical-record retention law.
  8. **Record amendment requests:** the patient requests a correction (NDPA rectification right). The clinician accepts or denies with a reason. Denials are appended as a statement of disagreement, and the original version is preserved.
  9. **E-signatures and attestation:** clinician sign-off on notes and results, a lock-after-sign rule and addenda, consent e-signatures (drawn or typed, with timestamp, IP and hash).
  10. **Encryption and backups/DR:** encryption in transit and at rest (DB/disk, plus field-level for the most sensitive fields), backups with tested restores, documented RPO/RTO (the NPRM proposes 72-hour restoration), and annual pen tests plus 6-monthly vulnerability scans, matching NPRM cadence and ISO 27001 Annex A.
- **Tension with user preference:** the NPRM makes MFA mandatory, but the CareVault owner deliberately removed 2FA. Do not reintroduce it unprompted. If raised, present it as an optional per-tenant setting (for example only for platform admins or for remote access) and as a HIPAA-NPRM / ISO 27001 consideration, not a default. HIPAA does not legally bind Nigerian hospitals. NDPA/GAID require "appropriate" security measures but, per these sources, do not specify MFA.

### Gaps
- No direct primary text of GAID's specific technical security controls (for example whether encryption or MFA are mandated). DLA Piper explicitly notes the summary does not cover breach timelines, retention periods or encryption specifics.
- No Nigerian statute found giving a medical-record retention period. The commonly cited figures (for example retaining adult records for a set number of years) could not be sourced in this pass.
- No JCI standards text retrieved. JCI is behind a paywall and only secondary summaries exist.
- ISO 27001:2022 Annex A control mapping to EHR SaaS was not researched in depth.
- The HIPAA NPRM's final status as of October 2026 is unconfirmed. Sources up to 2026 still describe it as proposed.

## Nigeria-specific prioritisation context

### Takeaway
EMR penetration in Nigeria is low and systems are fragmented, while HMO/NHIS claims increasingly depend on auditable documentation. Integrated billing/HMO, WhatsApp-friendly engagement, and offline-tolerant operations likely matter more than US-style AI features.

### Cited Findings
- Only about 18–23% of Nigerian hospitals use EMRs and about 15% use CPOE. Barriers are infrastructure, training and digital literacy — [medRxiv Ogun State KAP study 2025](https://www.medrxiv.org/content/10.1101/2025.08.20.25334058.full.pdf); [PMC Lagos general hospitals](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12573650/)
- Departments in Nigerian tertiary hospitals often run separate systems that do not exchange data. For example, lab results don't flow into the EMR (vendor blog) — [eLabAssist](https://blogs.elabassist.com/digital-hospital-nigeria-connecting-his-emr-ehr-and-lims/)
- In one Nigerian teaching hospital, 73.3% of healthcare workers were efficient with WhatsApp — [eLabAssist / cited study](https://blogs.elabassist.com/his-emr-ehr-integration-challenges-nigeria/)
- Local competitors highlight Nigerian bank integration, HMO eligibility checks and Nigerian forms and protocols (for example HealthOne) — [SoftwareSuggest](https://www.softwaresuggest.com/blog/hospital-management-software-in-nigeria/)

### Inferences
- Suggested top-10 for Nigerian private hospitals, ranked by revenue and operational impact:
  1. HMO/NHIA tariffs, pre-authorisation and claims.
  2. Batch/expiry/FEFO pharmacy and stores, with POs and suppliers.
  3. Portal bill pay with installments, plus family/proxy linking.
  4. WhatsApp/SMS reminders, plus self-booking with deposit.
  5. Management KPI dashboard (occupancy, ALOS, revenue by department, TAT).
  6. Doctor and nurse rosters linked to slot templates.
  7. Queue tokens and display board.
  8. Sensitive-record restriction plus break-the-glass, plus access reviews.
  9. GAID compliance pack (ROPA, DPIA, breach register, CAR export).
  10. Mortuary, blood bank, visitor passes and asset maintenance as add-on modules.

### Gaps
- No market-share or willingness-to-pay data found for individual modules among Nigerian private hospitals.
