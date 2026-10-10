# Clinical Documentation, Clinical Decision Support (CDS) and Patient-Safety Features of Leading EHRs (2025–2026), scoped for CareVault

Research date: October 2026. Baseline: CareVault already has patients, appointments, ADT (wards/beds/transfers/discharge), lab, radiology, pharmacy dispensing with generic prescriptions, inventory, orders, finance, RBAC, audit, consent, patient portal. The notes below look only at what goes beyond that baseline.

Note on sourcing: claims about vendors, studies and regulations have inline citations. Feature descriptions under "Inferences" ("how it typically works", data-model hints, Nigeria feasibility) are design inferences from general clinical-informatics knowledge. They are not vendor-confirmed specifications, and the report writer should present them that way.

---

## 1. Clinical documentation: what does a modern EHR offer beyond the basics (notes, templates, problem/allergy lists, flowsheets, nursing docs, eMAR/BCMA, I/O, care plans, discharge summaries, referrals)?

### Takeaway
The regulatory and vendor core of clinical documentation is still a set of structured, coded lists: problems, medications, allergies, vitals/flowsheets. Free-text notes are layered on top through templates, and in 2025–2026 increasingly through AI drafting. US certification (ONC 45 CFR 170.315(a)) has long required the coded problem, medication and allergy lists, CPOE, and drug-drug/drug-allergy checking. For CareVault, the highest-value additions are structured problem and allergy lists, a vitals flowsheet, and an eMAR, because most CDS and safety features depend on them.

### Cited Findings
- ONC certification (2015 Edition Cures Update) contains clinical criteria in 45 CFR 170.315(a), and the 21st Century Cures Act added, revised and removed certain criteria. The full list was not retrievable from the archived test-method page fetched. — [ONC Test Method archive](https://www.healthit.gov/topic/certification-ehrs/2015-edition-test-method)
- ONC's HTI-1 final rule (published Jan 9, 2024) created the "Decision Support Interventions" (DSI) criterion at §170.315(b)(11) as a revision and replacement of the CDS criterion §170.315(a)(9). From Jan 1, 2025, (b)(11) is part of the Base EHR definition and (a)(9) is removed. — [Federal Register HTI-1](https://www.federalregister.gov/documents/2024/01/09/2023-28857/health-data-technology-and-interoperability-certification-program-updates-algorithm-transparency-and); [ONC DSI fact sheet](https://www.healthit.gov/wp-content/uploads/2023/12/HTI-1_DSI_fact-sheet_508.pdf)
- Under DSI, certified modules must support "source attributes" for evidence-based and predictive DSIs, and let users record, change and access source attributes for DSIs built by other parties. This is a transparency requirement aimed at AI/ML. — [ONC DSI Criterion Resource Guide](https://healthit.gov/wp-content/uploads/2024/05/DSI-Criterion-Resource-Guide_508.pdf); [Dynamic Health IT on HTI-1](https://dynamichealthit.com/post/hti-1-is-here/)
- Bar-code verification built into an electronic medication administration record (eMAR) "essentially eliminated" transcription errors and their associated potential ADEs. The authors attribute this to the eMAR replacing manual transcription of orders onto paper MARs. — [Poon et al., NEJM 2010](https://www.nejm.org/doi/full/10.1056/NEJMsa0907115)
- Epic's Art drafts end-of-shift nursing care-plan notes by pulling from flowsheets, the MAR, vitals, orders and prior notes. It structures the note around the patient goals the nurse set for the shift. At Mercy Health, end-of-shift note time fell from 3.5 min to about 32 s (85%), and complete, on-time notes rose 225%. These are vendor-reported figures. — [Epic: Nurses write notes 85% faster](https://www.epic.com/epic/post/nurses-write-notes-85-faster-with-epic-ai/); [Nurse.org](https://nurse.org/news/epic-ai-nursing-charting-tools/)
- MEDITECH Expanse: an AI-generated, structured nursing handoff document pulls key record details. "Expanse Navigator" searches and summarizes structured data, unstructured data and scanned/handwritten/legacy documents. — [MEDITECH Expanse AI](https://ehr.meditech.com/ehr-solutions/expanse-artificial-intelligence); [MEDITECH Expanse for Nurses](https://ehr.meditech.com/ehr-solutions/expanse-for-nurses)
- WHO replaced the classic partograph with the WHO Labour Care Guide (LCG) in 2020. The LCG has 7 sections: admission identification/labour characteristics, supportive care, care of the baby, care of the woman, labour progress, medication, and shared decision-making. — [WHO news, Dec 2020](https://www.who.int/news/item/15-12-2020-monitoring-childbirth-in-a-new-era-for-maternal-health); [FIGO position statement 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12177285/); [WHO LCG implementation package](https://www.who.int/publications/i/item/9789240109346)

### Inferences (feature inventory for scoping; design inferences, not vendor specs)
Ordered roughly by dependency, so foundational items come first:

1. **Structured problem list (diagnoses).** Fields: coded diagnosis (ICD-10, or ICD-11 if the NDHA requires it), onset date, status (active/resolved/inactive), chronicity, recorded-by, linked encounter. It drives CDS (e.g. pregnancy, CKD, diabetes), discharge summaries and billing. Data model: `patientProblems` scoped by `organisationId`, with soft delete and an audit log on changes.
2. **Structured allergy and intolerance list.** Fields: allergen (drug class, specific generic, food, environmental), reaction, severity, type (allergy vs intolerance), verification status, and an explicit "No Known Drug Allergies" (NKDA) state, separate from "not yet assessed". This is a prerequisite for drug-allergy checks. CareVault's generic-based prescribing makes ingredient-level matching feasible.
3. **Vitals flowsheet.** Time-series grid of temperature, HR, RR, BP, SpO2 (with an on-oxygen flag), AVPU/GCS, pain score, weight/height/BMI, MUAC for children, and blood glucose. Trend charts and abnormal-value highlighting are the substrate for NEWS2/PEWS.
4. **Structured progress notes (SOAP / H&P / ward round notes).** Note types per specialty, sections, required fields, sign/cosign, addenda instead of edits once signed, and late-entry flags. Templates and "smart phrases" (text macros with tokens that auto-insert the latest vitals, active meds, problems and allergies) save typing. Copy-forward should be limited or highlighted, because copy-paste propagates errors.
5. **Nursing documentation.** Admission assessment, risk assessments (falls such as Morse; pressure injury such as Braden or Waterlow; VTE), wound charts and nursing care plans (problem, goal, interventions, evaluation).
6. **eMAR.** Converts each active inpatient prescription into scheduled administration events (due, given, held, refused, missed, with a reason). It records PRN doses with indication and effect, shows overdue doses, and handles IV infusions (rate, start/stop). Because it replaces handwritten MAR transcription, it is the feature with the clearest documented error elimination (Poon 2010 above).
7. **Barcode medication administration (BCMA).** Scan patient wristband, then drug, then compare against the eMAR ("five rights": right patient, drug, dose, route, time). This needs wristband printing and unit-dose or pack barcodes. In Nigeria many products lack GS1 barcodes, so hospitals would need to print pharmacy labels in-house (a QR code for each dispensed item linked to the dispensing record). Inexpensive Android phones can act as scanners.
8. **Intake/output (fluid balance) chart.** Hourly entries for oral, IV, NG, urine, drains and vomitus, with running 24 h balance. Useful in maternity (pre-eclampsia), paediatrics (dehydration), surgery and renal care.
9. **Care plans / clinical pathways per admission.** Goals, interventions, target discharge date. These link to handoff notes.
10. **Discharge summary.** Auto-populated from diagnoses, procedures, a discharge medication list reconciled against admission meds (medication reconciliation), pending results, follow-up appointments and patient instructions. It should produce a printable PDF (patients often carry paper copies) and, if NDHA requires it, a FHIR document.
11. **Referral letters / transfer-out letters.** Templated, with auto-included summary, investigations and reason for referral. Track outcome (accepted/seen).
12. **Labour Care Guide (digital partograph)** and antenatal record (see Section 3).

Low-resource feasibility (Nigeria): items 1–4 and 10–11 are high-value, low-hardware and form-based. Items 6–8 need bedside devices: tablets or phones per ward, with offline entry and sync. BCMA needs a printing and labelling workflow first. Paper downtime forms (printable blank flowsheets and MAR) should be supported so the hospital can continue during outages and back-enter later with a "late entry" flag.

### Gaps
- Could not retrieve the full current list of 170.315(a) criterion names from ONC (the page was an archive landing page). The criterion names are well known (CPOE, drug-drug/drug-allergy checks, demographics, problem list, medication list, medication allergy list, implantable device list, family health history, social/psychosocial/SDOH), but they were not verified this session.
- No independent (non-vendor) evaluation was found of Epic's or MEDITECH's AI nursing handoff notes.

---

## 2. CDS and safety: medication checks, dose checking, lab alerts, early-warning scores, sepsis, order sets, alert fatigue

### Takeaway
Medication-ordering CDS layered on CPOE has the strongest evidence of any CDS type. CPOE roughly halves medication errors, and the CDS is what makes the prevented errors clinically meaningful. The dominant failure mode is alert fatigue: overrides average about 90%. Predictive "black box" alerts such as the Epic Sepsis Model have performed poorly on external validation. CareVault should ship a small, high-severity, tiered rule set (drug-allergy, severe drug-drug interactions, duplicate therapy, dose-range limits, weight-based paediatric dosing) plus deterministic scores (NEWS2/PEWS). Opaque ML predictions should not be part of that set.

### Cited Findings
**Medication CDS / CPOE**
- Compared with paper ordering, CPOE was associated with about half as many medication errors (RR 0.46, 95% CI 0.35–0.60). Another analysis estimated a 48% (95% CI 41–55%) lower probability of error per order. — [Nuckols et al., Systematic Reviews 2014](https://link.springer.com/article/10.1186/2046-4053-3-56); [AHRQ PSNet CPOE primer](https://psnet.ahrq.gov/primer/computerized-provider-order-entry)
- ICU meta-analysis: commercial CPOE with CDS was associated with an 85% reduction in prescribing errors and a 12% reduction in ICU mortality. — [Prgomet et al., JAMIA 2017](https://academic.oup.com/jamia/article/24/2/413/2907924)
- "CDS is the key intervention in reducing errors": without CDS, CPOE may prevent mostly clinically inconsequential errors. A systematic review rated the certainty that CPOE+CDS reduces medication errors as "moderate". — [AHRQ Making Healthcare Safer IV, CDS chapter](https://www.ncbi.nlm.nih.gov/books/NBK600580/) (summary via search; the full page was blocked by a CAPTCHA); [PMC8214039 systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8214039/)
- CPOE reduced chemotherapy medication errors by about 81% (systematic review). — [PMC8275496](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8275496/)
- Renal dosing CDS: Chertow et al. (JAMA 2001; 17,828 admissions, alternating on/off periods) tested a CPOE add-on that adjusts dose and frequency for renal insufficiency. It is a landmark trial (older, 1997–98 data). — [Chertow, JAMA 2001](https://jamanetwork.com/journals/jama/fullarticle/194455)

**Alert fatigue**
- 2024 systematic review and meta-analysis: physicians override drug-drug interaction (DDI) alerts at a pooled rate of about 90% (95% CI 85–95%), with individual studies ranging from 55% to 98%. — [Felisberto et al., Health Informatics J 2024](https://journals.sagepub.com/doi/10.1177/14604582241263242)
- At a large academic centre (2025–26 publication), 1,799 providers saw 196,225 drug alerts, averaging 0.42 alerts per clinician-day. Override rates rose with burden: 98.6% at more than 5 alerts/day, 94.5% at 1–5, and 92.6% below 1 (p<0.001). — [PubMed 41726460](https://pubmed.ncbi.nlm.nih.gov/41726460/)
- Chinese hospital study (2024): 80.2% of overrides were appropriate, but only 57.9% of alerts were appropriate to fire in the first place. 88.3% of free-text override reasons were meaningless characters, a sign of fatigue. — [PubMed 38658357](https://pubmed.ncbi.nlm.nih.gov/38658357)
- Opioid drug-allergy alerts in particular have very high override rates, often due to intolerances recorded as allergies. — [PMC6989033](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6989033/)
- False-positive drug-allergy alerts can be identified with "drug tolerance assertions", meaning the patient previously tolerated the drug. — [PMC12848223](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12848223/)

**Sepsis / predictive alerts**
- The Epic Sepsis Model (external validation, University of Michigan, 38,455 hospitalizations, 2018–19) showed AUC 0.63 vs the 0.76–0.83 reported by Epic, with sensitivity 33%, PPV 12% and NPV 95%. It alerted on 18% of all inpatients yet missed 67% of sepsis cases. The data are older (2021), but this remains the canonical cautionary study. — [Wong et al., JAMA Intern Med 2021](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781307); [Editorial](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781313)
- Epic has since released an updated proprietary sepsis model, and a multicentre prospective validation was published in JAMA Network Open. Its performance details were not extracted this session. — [JAMA Netw Open](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2845595)
- Epic in 2025 announced Cosmos-powered risk prediction (Cosmos AI foundation model trained on more than 300 million patient records). — [Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/epic-unveils-major-ai-features-ai-charting-microsoft-cosmos-ai-risk-prediction-and-rcm); [Healthcare IT Today UGM 2025](https://www.healthcareittoday.com/2025/08/21/a-deep-dive-into-the-announcements-at-epic-ugm-2025/)
- HTI-1 DSI requires transparency "source attributes" for predictive DSIs, i.e. regulators now expect EHRs to disclose how a predictive alert was built and validated. — [ONC DSI fact sheet](https://www.healthit.gov/wp-content/uploads/2023/12/HTI-1_DSI_fact-sheet_508.pdf)

**Early-warning scores (EWS)**
- Introducing an electronic physiological surveillance system (electronic vitals with an automatically calculated EWS and escalation) was associated with abrupt, sustained mortality reductions coinciding with deployment across specialties at two UK hospitals. The design was observational, using statistical process control. — [Schmidt et al., BMJ Qual Saf 2015](https://pubmed.ncbi.nlm.nih.gov/25249636/)
- Digital EWS improved vital-sign observation protocol adherence (stepped-wedge evaluation, 2024). — [JMIR 2024 e46691](https://www.jmir.org/2024/1/e46691/)
- NEWS2 can be readily computerised and is integrated into some NHS EHRs. In ED patients it predicted 7-day death with c-statistic 0.865. — [PLOS One 2025 NEWS2 ED study](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0326058)
- A 2025 single-setting study reports NEWS2 rollout drove "systemic mortality reduction". It is observational and from one setting. — [ScienceDirect 2025](https://www.sciencedirect.com/science/article/abs/pii/S0964339725001697)

### Inferences (feature inventory; design inferences)
**Medication safety rules (fire on prescribe, with re-check at dispense and administer):**
- **Drug-allergy check.** Match prescribed generic and its drug class (e.g. penicillins, sulfonamides, NSAIDs) against the allergy list. Distinguish allergy from intolerance, and suppress alerts when there is a documented tolerance.
- **Drug-drug interaction check.** Needs an interaction knowledge base. Commercial options (First Databank, Medi-Span, Lexicomp) cost money. Open or cheaper options include DrugBank (licensing restrictions apply) and the NLM RxNav interaction API, which was discontinued in 2024; this should be verified. A pragmatic path: curate the top roughly 100–200 severe/contraindicated interactions for the Nigerian essential medicines list (e.g. artemether-lumefantrine with QT-prolonging drugs, rifampicin with antiretrovirals or oral contraceptives, warfarin interactions, metronidazole-alcohol, aminoglycoside with loop diuretic). Fire interruptive alerts only for "contraindicated" or "severe".
- **Duplicate therapy.** Same generic or same therapeutic class active twice, e.g. two NSAIDs or two ACE inhibitors. CareVault's generic-based prescribing makes this simple.
- **Dose-range checking.** Per generic: min/max single dose, max daily dose, and per-route limits, applied by age band. Hard stop above an absolute maximum; soft warning otherwise.
- **Weight-based paediatric dosing.** Order in mg/kg, auto-calculate, cap at the adult maximum, and require a weight recorded within N days. This is high-value in Nigeria because paediatric malaria, antibiotic and fluid dosing errors are common.
- **Renal dosing.** Compute CrCl (Cockcroft-Gault) or eGFR from the latest creatinine in CareVault's lab module, and flag drugs needing adjustment (e.g. gentamicin, metformin, enoxaparin).
- **Pregnancy/lactation alerts.** Trigger on pregnancy status from the problem list or ANC record, for teratogenic drugs (e.g. ACE inhibitors, warfarin, isotretinoin, valproate, tetracyclines, misoprostol outside obstetric use).
- **High-alert medication flags** (ISMP list: insulin, potassium chloride concentrate, heparin, opioids, magnesium sulfate) require independent double-check documentation in the eMAR.

**Lab and result safety:**
- **Critical value alerts.** A configurable critical range per lab test (e.g. K+ >6.5 or <2.5, glucose <2.5 mmol/L, Hb <5 g/dL). On result entry, notify the ordering clinician and ward nurse and require acknowledgement with a "read-back" record. Escalate if unacknowledged after N minutes, and audit-log the whole chain.
- **Results-pending-at-discharge list**, and "result not viewed" tracking. CareVault already has result-viewed tracking (commit ec04cfc).

**Deterioration:**
- **NEWS2** (adults), **PEWS** (children), **MEOWS** (obstetric). These are deterministic arithmetic over vitals: auto-calculate on each vitals entry, colour-band the result, and display the escalation protocol (e.g. NEWS2 ≥5 means urgent review, ≥7 means emergency response). Track observation frequency compliance (next obs due). They work fully offline, with no ML.
- **Sepsis screening.** Prefer rule-based screening (qSOFA/SIRS plus suspected infection, or NEWS2 ≥5 plus infection) that prompts a sepsis bundle order set. Avoid proprietary ML scores, given the Wong 2021 findings.

**Order sets / pathways:**
- Pre-built bundles that pre-fill orders: malaria (WHO/Nigeria national guidelines), severe pre-eclampsia (magnesium sulfate regimen), sepsis bundle, DKA, post-op, sickle-cell crisis, neonatal sepsis. Each should carry versioning and a source attribute, aligned with HTI-1 "source attributes".

**Alert-fatigue mitigation (implement from day one):**
- Tier alerts (hard stop / interruptive / passive info). Fire interruptive alerts only for high-severity issues. Require structured override reasons from a pick list instead of free text. Log every alert fire, override and acceptance to `auditLogs` for monthly override-rate review per rule. Let an admin disable or tune rules per organisation. Suppress repeat alerts for the same pair within the same admission, and route alerts to the right role (pharmacist vs prescriber).

Low-resource feasibility: all of the rule-based checks run locally against CareVault's own data and work offline if the rule tables are cached on the client. The cost and risk lie in maintaining the drug knowledge base, not in the software. A Nigeria-specific, pharmacist-curated rule table is more realistic than licensing a US compendium.

### Gaps
- The AHRQ Making Healthcare Safer IV CDS chapter could not be fetched (CAPTCHA). Per-CDS-type effect sizes (e.g. dose-checking alone vs DDI alone) were not extracted.
- Chertow 2001 quantitative outcomes (appropriate dose and frequency rates, length-of-stay effect) were not captured from the source this session.
- No Nigeria-specific study of CDS alert performance was found.
- Performance of Epic's updated sepsis model (JAMA Netw Open) was not extracted.
- The current status of free drug-interaction APIs (e.g. NLM RxNav interaction API discontinuation) was not verified this session.

---

## 3. Nursing / inpatient workflow: handover, task lists, bed boards, triage, ED tracking boards, theatre, maternity, immunization, growth charts

### Takeaway
Structured handover (I-PASS) has some of the best multi-centre outcome evidence of any workflow intervention: 23% fewer medical errors and 30% fewer preventable adverse events. The WHO Surgical Safety Checklist and the South African Triage Scale (SATS) are well suited to Nigeria. The WHO Labour Care Guide is the current standard for the partograph. All of these are form- and checklist-driven, so they are cheap to build and work offline.

### Cited Findings
- I-PASS handoff bundle (9 academic hospitals, 10,740 admissions): medical errors fell from 24.5 to 18.8 per 100 admissions (−23%) and preventable adverse events from 4.7 to 3.3 per 100 (−30%), both p<0.001. This is older (2014) but remains the reference standard. — [Starmer et al., NEJM 2014](https://www.nejm.org/doi/full/10.1056/NEJMsa1405556)
- I-PASS has been adapted to multiple handoff settings beyond resident sign-out, including nursing and ED-to-ward. — [PMC7382547](https://pmc.ncbi.nlm.nih.gov/articles/PMC7382547/)
- Vendors now auto-generate structured handoff documents with AI (MEDITECH Expanse; Epic Art end-of-shift notes). — [MEDITECH Expanse AI](https://ehr.meditech.com/ehr-solutions/expanse-artificial-intelligence); [Epic](https://www.epic.com/epic/post/nurses-write-notes-85-faster-with-epic-ai/)
- WHO Surgical Safety Checklist (19 items; 8 hospitals across high- and low-income countries): complications fell from 11% to 7% and in-hospital deaths from 1.5% to 0.8%. Surgical site infection and unplanned reoperation also fell. The study is from 2009. — [Haynes et al., NEJM 2009](https://dash.harvard.edu/entities/publication/925e19ef-d9b6-4d88-b933-21583f35eb2a)
- Contrast: a later population study of mandatory checklist introduction in Ontario (NEJM 2014) is commonly cited as showing no significant reduction in operative mortality or complications. That reading of the result is from background knowledge and was not verified in this session. — [Urbach et al., NEJM 2014](https://www.nejm.org/doi/full/10.1056/NEJMsa1308261)
- SATS: a 2018 systematic review of LMIC adult ED triage tools found SATS had the highest-quality evidence, with sensitivity 70–75% and specificity 91–97%. It is validated in rural district hospitals and with enrolled nursing assistants. — [Validation of modified SATS, PMC10026449](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10026449/); [SATS rural district hospital, ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2211419X17302148); [EMSSA SATS practice guideline](https://emssa.org.za/wp-content/uploads/2017/10/em014.pdf)
- WHO Labour Care Guide (2020) replaces the partograph and reflects updated evidence on labour duration, intervention triggers and respectful maternity care. FIGO issued a 2025 position statement on LCG vs partograph. — [WHO 2020](https://www.who.int/news/item/15-12-2020-monitoring-childbirth-in-a-new-era-for-maternal-health); [FIGO 2025](https://obgyn.onlinelibrary.wiley.com/doi/full/10.1002/ijgo.70151)
- MEDITECH Expanse ships ED-specific modules (tracking board style). Details come from a third-party summary. — [IntuitionLabs on MEDITECH ED modules](https://intuitionlabs.ai/software/emergency-department-operations/ed-specific-ehr-modules/meditech-expanse)

### Inferences (feature inventory; design inferences)
- **Shift handover (I-PASS / SBAR).** Per-ward handover view listing each patient with: Illness severity (stable/watcher/unstable), Patient summary, Action list (to-dos with owner and time), Situation awareness and contingency ("if X then Y"), and Synthesis by receiver (receiver acknowledges). Auto-populate from the latest NEWS2, active problems, pending results and due meds. Persist as a signed handover record. A later AI draft could summarise this, but the template alone carries the evidence.
- **Nursing task list / worklist.** Generated from eMAR due doses, obs-due times (driven by the NEWS2 frequency), wound care, turning schedules and pending specimen collection. Show overdue items in red, filterable by ward, nurse and shift.
- **Bed board (visual ward map).** CareVault has ADT. Add a visual grid of beds coloured by status (occupied, clean, dirty/awaiting cleaning, blocked, reserved) with per-patient badges (NEWS2 band, isolation, fall risk, NPO, allergy, pending discharge). Housekeeping turnaround tracking is optional.
- **Triage.** SATS for adults and children (TEWS physiological score plus clinical discriminators, giving Red/Orange/Yellow/Green/Blue with target times), or Manchester Triage System, which is licensed. Record triage time, category, re-triage and time-to-doctor.
- **ED tracking board.** Live list of ED patients with triage colour, waiting time vs target, assigned clinician, location, and outstanding orders/results, plus disposition (admit/discharge/refer). Auto-refresh by polling, which is low-bandwidth friendly.
- **Theatre / surgery.** Theatre list scheduling (rooms, surgeons, anaesthetists, cases), pre-op checklist (consent signed, NPO, site marked, blood available), the WHO Surgical Safety Checklist (Sign-In / Time-Out / Sign-Out) as mandatory digital steps, anaesthesia record (vitals timeline, drugs, fluids), operation note template, and swab/instrument counts.
- **Maternity.** Antenatal record (gravida/para, LMP to EDD calculator, gestational age, booking bloods, BP/urine trends, danger-sign checklist, tetanus toxoid/IPTp-SP doses), intrapartum WHO Labour Care Guide (plots of cervical dilatation, fetal heart rate, contractions and maternal vitals, with "alert" thresholds that flag deviations), delivery record, postpartum MEOWS, newborn record (APGAR, weight, BCG/OPV0/HepB0). PPH and pre-eclampsia order sets. This is highly relevant for Nigeria, which has one of the world's highest maternal mortality burdens; a sourced figure was not gathered this session, so see Gaps.
- **Immunization tracking.** Nigeria NPI schedule (BCG, OPV, Penta, PCV, Rota, IPV, measles, yellow fever, MenA, HPV, etc.), due/overdue calculator by date of birth, batch/lot recording (links to inventory), and a printable child health card. A national registry link would go through NDHA/DHIS2 if an interface exists.
- **Growth charts.** WHO Child Growth Standards (weight-for-age, length/height-for-age, weight-for-length, BMI-for-age, head circumference) with z-score calculation and MUAC. Flag SAM/MAM (severe/moderate acute malnutrition) and stunting. This is pure computation on CareVault data using published WHO LMS tables.

Low-resource feasibility: every item here is form- or checklist-based and computes locally. Bed board and ED board need near-real-time updates; use lightweight polling and cache the last state for offline viewing. Printable versions (handover sheet, LCG chart, child health card) matter during power or network outages.

### Gaps
- The current Manchester Triage System licensing cost and terms were not researched.
- No sourced Nigeria-specific SATS validation was found (the evidence is mainly South African and other LMIC settings).
- Sourced Nigerian maternal mortality figures and the evidence for digital LCG outcomes were not gathered.
- No sourced evidence was found for bed-board or ED tracking-board effects on outcomes. These are likely operational-efficiency features rather than safety features.

---

## 4. AI features recently shipped (ambient scribes, chart summarization, in-basket AI drafts): what exists and what is practical

### Takeaway
By 2025–2026 ambient AI scribes are mainstream in all six vendors, natively or via marketplace partners. Chart summarisation, AI-drafted patient-message replies and AI handoff notes are shipping. RCT evidence shows modest burnout and task-load improvements and mixed documentation-time savings. For CareVault, a review-before-sign AI summarisation feature (discharge summary or handoff draft) is more practical than a live ambient scribe, given bandwidth, the mix of local languages and Nigerian Pidgin, and data-residency and consent concerns.

### Cited Findings
- **Epic.** "AI Charting" in Art ambiently listens, drafts the note and queues orders from the conversation, with voice-agent customisation of note format. It was announced at UGM in August 2025 and released in early 2026. It uses Microsoft Dragon ambient tech for transcription, and Epic generates the note. Art is used more than 16M times per month, and 85% of Epic customers are live with gen-AI across Art, Emmie (patient-facing) and Penny (revenue cycle). — [Healthcare IT Today Feb 2026](https://www.healthcareittoday.com/2026/02/05/epic-ambient-ai-charting-released-and-more-updates-on-epics-ai-solutions/); [Fierce Healthcare](https://www.fiercehealthcare.com/ai-and-machine-learning/epic-rolls-out-ai-charting-and-more-built-automation-clinicians-and); [Healthcare Dive](https://www.healthcaredive.com/news/epic-rolls-out-ai-charting-art-notetaking-documentation-scribe/811462/); [Advisory Board](https://www.advisory.com/daily-briefing/2025/08/28/epic-meeting)
- **Epic.** An agent platform and Cosmos-powered predictions were announced. — [Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/epic-expands-ai-ambitions-agent-platform-cosmos-powered-predictions-and-deeper-workflow)
- **Oracle Health.** A new cloud-native, "voice-first" ambulatory EHR built on OCI, not on the legacy Cerner code. The Clinical AI Agent offers ambient note drafting, dictation into any field, automated chart-review summaries (history, labs, meds) and suggested professional-fee codes. — [Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/oracle-health-debuts-ai-powered-ehr-designed-voice-first-solution-embedded-agentic-ai); [Healthcare IT News](https://www.healthcareitnews.com/news/oracle-health-unveils-new-ai-powered-ehr); [PR Newswire](https://www.prnewswire.com/news-releases/oracle-health-expands-clinical-ai-agent-with-automated-coding-dictation-and-chart-review-302854383.html); [TechTarget](https://www.techtarget.com/searchhealthit/news/366649529/Oracle-Health-upgrades-AI-agent-with-coding-charting-features)
- **MEDITECH Expanse.** Native ambient intelligence for physicians and, from HIMSS 2026, for nurses inside the Expanse Point of Care app; it parses conversations into nursing assessments. Expanse Navigator search and summary, AI handoff documents and a claim-denial agent are also offered. — [HIT Consultant, Mar 2026](https://hitconsultant.net/2026/03/10/meditech-expanse-ai-native-ambient-intelligence-himss26/); [MEDITECH news](https://ehr.meditech.com/news/meditech-s-latest-ai-innovations-support-smarter-care-and-stronger-performance)
- **athenahealth.** "Ambient Notes" is a marketplace with embedded third-party scribes (Abridge, Suki, iScribe; Microsoft Dragon Copilot announced for H1 2026), rolled out to more than 160,000 clinicians. The first-party "athenaAmbient" was in testing. The vendor reports that 3 of 5 providers close more encounters within a day, an average 28% improvement. — [athenahealth Summer 2025](https://www.athenahealth.com/resources/blog/athenaone-summer-2025-update); [Fierce Healthcare](https://www.fiercehealthcare.com/ai-and-machine-learning/athenahealth-integrates-dragon-copilot-ai-assistant-microsoft-moves-deeper); [Commure review](https://www.commure.com/blog-scribe/athenahealth-ai-scribe-review)
- **eClinicalWorks.** The Sunoh.ai ambient scribe (from healow) produces notes, highlights, actionable alerts and next steps for clinician approval. — [eClinicalWorks](https://www.eclinicalworks.com/sunoh-ai-medical-scribe-technology-for-clinical-documentation/)
- **NextGen.** "Ambient Assist" converts conversations on mobile devices into SOAP notes. The vendor and third parties claim 90% accuracy and up to 2 h per day saved; these claims are not independently verified. — [SoapNoteAI guide](https://www.soapnoteai.com/soap-note-guides-and-example/nextgen-ambient-ai-2026/)
- **Ambient scribe RCT** (NEJM AI, Nov 2025): 238 outpatient physicians across 14 specialties were randomised to Microsoft DAX Copilot, Nabla or usual care (Nov 2024 – Jan 2025). Nabla reduced time-in-note. Either scribe produced modest improvements in burnout, work exhaustion and task load. — [NEJM AI](https://ai.nejm.org/doi/abs/10.1056/AIoa2501000); [medRxiv preprint](https://www.medrxiv.org/content/10.1101/2025.07.10.25331333.full.pdf)
- **AI-drafted in-basket replies** (Stanford, JAMA Netw Open 2024): mean draft utilisation was 20% after 5 weeks, with improvements in perceived burden and burnout. — [Garcia et al., JAMA Netw Open 2024](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2816494)
- Follow-up studies of AI-drafted replies exist in pediatrics (JAMIA Open 2025) and on utility (JAMA Netw Open 2024), but they were not extracted. — [JAMIA Open](https://academic.oup.com/jamiaopen/article/8/6/ooaf159/8341623); [PMC11581472](https://pmc.ncbi.nlm.nih.gov/articles/PMC11581472/)

### Inferences
- **Most practical for CareVault (2026):**
  1. **AI chart summary.** On demand, summarise the admission or history (problems, meds, recent results, last notes) for ward rounds or referral letters, with clinician review before saving. It is text-only, low bandwidth and asynchronous.
  2. **AI-drafted discharge summary and handoff note** from structured data. Same review-before-sign pattern as Epic Art's nursing notes.
  3. **AI-drafted replies to portal messages.** Only if portal messaging volume justifies it.
- **Ambient scribe** is lower priority. It needs reliable upload bandwidth for audio, recording consent (which ties into CareVault's consent module), speech recognition that handles Nigerian English, Pidgin, Yoruba, Hausa and Igbo (unverified quality), and clear data-processing agreements under the NDPA (Nigeria Data Protection Act 2023) for cross-border audio processing.
- Any AI feature should log the model, version, prompt type and the clinician's accept/edit/reject action to audit logs. It should expose "source attributes" in the spirit of HTI-1 DSI, and never auto-file into the legal record without a human signature.
- AI features must degrade gracefully offline, so the underlying workflow must never depend on them.

### Gaps
- No evidence was found on ambient-scribe accuracy for Nigerian or West African English accents and languages.
- No independent safety data (hallucination and omission rates in final notes) were gathered. An arXiv study on hedging-language edits exists but was not reviewed.
- Pricing of ambient-scribe APIs was not researched.

---

## 5. Which features have the highest evidence of reducing errors or harm?

### Takeaway
The strongest evidence, ranked:
1. CPOE with medication CDS: about 50% fewer medication errors; ICU mortality signal.
2. Barcode eMAR: 41% fewer administration errors, 51% fewer potential ADEs, transcription errors essentially eliminated.
3. I-PASS structured handoff: 23% fewer errors, 30% fewer preventable adverse events.
4. WHO Surgical Safety Checklist: deaths 1.5% to 0.8% in the original study, though later replication was mixed.
5. Electronic vitals with automated EWS: observational mortality reductions.

Predictive ML alerts (sepsis) have the weakest and most contested evidence, and alert fatigue erodes CDS value when alerts are poorly tuned.

### Cited Findings
- BCMA plus eMAR (tertiary US hospital, 14,041 administrations observed): 41.4% reduction in non-timing administration errors and 50.8% reduction in potential ADEs. Wrong-medication errors fell 57.4%, wrong-dose 41.9% and documentation errors 80.3%. Transcription errors were essentially eliminated. The authors projected about 95,000 potential ADEs prevented per year at that hospital. This is older (2010). — [Poon et al., NEJM 2010](https://www.nejm.org/doi/full/10.1056/NEJMsa0907115); [AMA J Ethics](https://journalofethics.ama-assn.org/article/use-bar-code-technology-reduce-drug-administration-errors/2011-03)
- BCMA implementation has also been linked to reduced patient harm in later implementation studies, including in EDs. — [PMC6257885](https://pmc.ncbi.nlm.nih.gov/articles/PMC6257885/); [ScienceDirect ED BCMA](https://www.sciencedirect.com/science/article/abs/pii/S009917672030235X)
- CPOE vs paper: RR 0.46 for medication errors. — [Nuckols 2014](https://link.springer.com/article/10.1186/2046-4053-3-56)
- ICU CPOE+CDS: 85% fewer prescribing errors and 12% lower ICU mortality. — [Prgomet, JAMIA 2017](https://academic.oup.com/jamia/article/24/2/413/2907924)
- I-PASS: −23% errors, −30% preventable AEs. — [Starmer, NEJM 2014](https://www.nejm.org/doi/full/10.1056/NEJMsa1405556)
- WHO SSC: complications 11% to 7%, deaths 1.5% to 0.8%. — [Haynes, NEJM 2009](https://dash.harvard.edu/entities/publication/925e19ef-d9b6-4d88-b933-21583f35eb2a)
- Electronic physiological surveillance with EWS: sustained mortality reduction (observational). — [Schmidt, BMJ Qual Saf 2015](https://pubmed.ncbi.nlm.nih.gov/25249636/)
- Counter-evidence and caution: the Epic Sepsis Model's poor external performance (AUC 0.63, PPV 12%) — [Wong 2021](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781307); DDI override rates of about 90% — [Felisberto 2024](https://journals.sagepub.com/doi/10.1177/14604582241263242)

### Inferences (recommended priority for CareVault, weighing evidence, dependency and Nigerian feasibility)
1. **Structured allergy list, problem list and weight recording.** These are prerequisites for everything else. Low effort.
2. **Prescribing CDS:** drug-allergy, duplicate therapy, dose-range, paediatric weight-based dosing, pregnancy, and a curated severe-DDI list. Tiered, with override logging. This builds on the existing generic-prescription model.
3. **Inpatient eMAR**, then BCMA later. The eMAR alone removes transcription errors. BCMA needs a labelling and printing workflow and devices.
4. **Vitals flowsheet with NEWS2/PEWS/MEOWS** and an escalation and obs-due task list.
5. **Critical lab value alert with acknowledgement and escalation.**
6. **I-PASS/SBAR handover module.**
7. **WHO Surgical Safety Checklist** in a theatre module, and the **WHO Labour Care Guide** in maternity. Both are high relevance for Nigeria.
8. **SATS triage** with an ED board.
9. **AI summarisation and drafting** (review-before-sign). Last, because it adds efficiency rather than proven safety, and it depends on connectivity.

Cross-cutting Nigerian constraints:
- An offline-capable client (PWA with local queue and sync) for vitals, eMAR and triage entry.
- Printable downtime forms.
- Rule tables cached client-side.
- Low-bandwidth polling for boards.
- Training burden: Nigerian studies cite insufficient training, workflow disruption, connectivity and power as the key EHR barriers.
— [Scoping review of SSA EHRs, Global Health Action 2025](https://www.tandfonline.com/doi/full/10.1080/16549716.2025.2492913); [Offline-first EHR feasibility study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12904448/); [OpenMRS lessons](https://www.researchgate.net/publication/349096057_OpenMRS_as_a_Global_Good_Impact_Opportunities_Challenges_and_Lessons_learned_from_fifteen_years_of_implementation)

### Gaps
- Most high-quality outcome evidence comes from high-income settings (US, UK) and is 2009–2017 vintage. Few studies replicate it in sub-Saharan Africa, and none Nigeria-specific was found for CDS, BCMA or EWS.
- No head-to-head study was found comparing the relative harm reduction of these interventions. The ranking above is an inference across heterogeneous studies.
- The WHO Global Patient Safety Action Plan 2021–2030 and "Medication Without Harm" guidance were not retrieved this session, but both are relevant framing sources for the report writer.
