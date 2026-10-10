# Revenue Cycle Management, Billing and Insurance Claims for CareVault (Nigeria focus, 2025–2026)

Context: CareVault already has a finance module, Paystack patient payments, patient wallets with wallet billing, platform subscriptions, payment status on requests/prescriptions, insurance type on patients (HMO selection + policy number), inventory and pharmacy. These notes list what is missing or worth deepening. Research done October 2026; about 17 searches and fetches. Many Nigerian sources are vendor blogs (AjirMed, Pharmacare, Hyella, Helium), so they show what the market sells and how HMOs commonly work, but they are not regulation. Flagged where relevant.

## Q1. Global RCM features (Epic Resolute, athenaCollector, eCW, Oracle Health)

### Takeaway
Big-vendor RCM rests on four ideas: (1) charges flow automatically from clinical/ancillary events into a billing account, with rules that hold bad charges in an error pool; (2) edits ("scrubbing") run on each claim before it goes out; (3) work queues send exceptions such as denials, held charges and unbilled accounts to the right staff; (4) money is reconciled across systems. CareVault can use the same patterns at a much smaller scale.

### Cited Findings
- Epic's charge router collects, reviews, changes and routes charges from ancillary systems into Resolute billing. Charges that fail router rules are held in an error pool or deleted automatically. — [UC Davis audit report via auditreports.ucop.edu](https://auditreports.ucop.edu/?action=public_ar_display&id=ec1a0b2003913b76)
- Resolute Hospital Billing does consolidated facility billing for room charges, procedures, medications and ancillary care. It applies pre-claim edits to catch coding errors before submission. — [Transcure: Epic features](https://transcure.net/medical-billing/software/emr/epic-features/)
- Resolute work queues pick out hospital accounts, transactions or claims that need manual review. Payer denials and line reductions go to denial work queues. — [Mindbowser: Epic Resolute denials management](https://www.mindbowser.com/epic-resolute-denials-management/)
- Epic splits Hospital Billing (HB), Professional Billing (PB) and Single Billing Office (SBO). — [Nirmitee: What is Epic Resolute](https://nirmitee.io/blog/epic-resolute-integration/)
- Reconciling Epic against ancillary systems is a standard control, so every charge actually reaches billing. — [UC Davis audit report](https://auditreports.ucop.edu/?action=public_ar_display&id=ec1a0b2003913b76)

### Inferences
Global features that map onto CareVault. The standard RCM pieces are listed here; individual vendor pages were not checked for each item.
- **Charge capture from clinical events.** Lab and radiology orders, prescriptions dispensed, admission bed-days, procedures and consumables should post charge lines to one encounter/admission "billing account" automatically. Unpriced or unmapped items go to a "held charges" queue instead of failing silently. CareVault already has payment status on requests/prescriptions; the gap is one ledger per encounter.
- **Chargemaster / price lists per payer.** One master service catalog, plus several tariff tables (Cash/Self-pay, Corporate X, HMO A, HMO B, NHIA, State scheme). Each table needs effective dates and versioning.
- **Eligibility verification** at check-in. Results are logged with timestamp, who checked, and how: portal, phone or WhatsApp.
- **Pre-authorization tracking.** Store the auth code, the services it covers, its validity window and an expiry warning.
- **Claim scrubbing.** Before submission, check that the claim has an auth code where one is required, has a diagnosis code, falls within the submission window, is not a duplicate, and has a valid enrollee ID.
- **Remittance and denial management.** Record payer payments against claims line by line (paid / reduced / denied with reason). Denied lines go to a work queue for resubmission or write-off.
- **Patient statements and invoices**, and the patient-responsibility portion (co-pay, excluded items).
- **Deposits and advance payments** (admission deposits). CareVault's wallet already covers part of this.
- **Packages and bundles** (e.g. antenatal package, normal delivery, CS package): a fixed price with included items, and overage billing for anything outside it.
- **Discounts and waivers with approval**: a reason code, an approver role and an audit log entry.
- **Refunds**: to wallet or to the original channel, with approval.
- **Cashier shifts and end-of-day reconciliation**: open/close a till; expected vs counted totals per channel (cash, POS, transfer, Paystack); a variance report.

### Gaps
- I did not fetch athenaCollector, eClinicalWorks or Oracle Health RCM product pages, so comparisons between those vendors are not cited.
- I did not consult HFMA/AAPC definitions directly. The RCM vocabulary above is standard industry usage, not quoted.

## Q2. Nigeria: HMOs, NHIA, state schemes, BHCPF, claims platforms

### Takeaway
Private Nigerian hospitals work with HMOs mostly through manual steps. They verify the enrollee, then get an authorization or referral code by phone or WhatsApp. They bill against a tariff specific to each HMO and send claims in batches, usually monthly. The HMO vets the claims and raises queries, and payment arrives 30–90+ days later. Primary care is often paid by capitation and secondary/specialist care by fee-for-service. Since 2025, NHIA has required HMOs to issue authorization codes within one hour, and in February 2025 it raised capitation and FFS rates sharply. I found no national electronic claims exchange for Nigeria comparable to Ghana's CLAIM-it.

### Cited Findings
**Authorization codes and NHIA enforcement**
- NHIA requires HMOs to process elective and standard pre-authorization requests within one hour, effective April 2025. Emergency care must start immediately without waiting for a code. If an HMO does not respond, the facility escalates to the NHIA state office through digital channels. HMOs that miss the deadline face penalties and possible accreditation suspension. Hospitals that delay care without justification can also be penalized. — [Streamlinefeed](https://streamlinefeed.co.ke/news/nhia-enforces-one-hour-hmo-authorisation-policy-to-end-hospital-delays). Secondary source; I did not find the NHIA circular itself.
- Complaints against HMOs include delayed or denied referral authorization codes and delays in settling agreed reconciled payments. NHIA has sanctioned HMOs and facilities: headlines report 49 facilities and 47 HMOs sanctioned, 10 facilities delisted or suspended, and 2,929 cases resolved. — [Guardian NG](https://guardian.ng/news/nigeria/national/nhia-sanctions-49-healthcare-facilities-47-hmos-resolves-2929-cases/) (page returned 403, figures taken from the headline/snippet); [BusinessDay](https://businessday.ng/news/article/nhia-delists-suspends-10-health-facilities-sanctions-47-hmos-over-poor-service/)
- Hospitals sometimes hold back diagnosis and treatment until the HMO approves. — [The Sun via search summary](https://thesun.ng/health-insurance-when-patients-get-caught-between-hmos-hospitals/)
- Authorization codes often arrive "via WhatsApp or phone call". They must be linked to the patient's visit, and a claim without the code is rejected. Claim contents: patient name, HMO membership number, treatment with diagnostic codes, total cost split into HMO portion and co-pay, submission date and tracking reference. — [Pharmacare blog](https://pharmacare.app/blog/hmo-billing-dental-clinic-nigeria) (vendor blog)

**Payment mechanisms and tariffs**
- In February 2025 NHIA announced a 93% rise in capitation over December 2023 rates and a 378% rise in fee-for-service rates, effective April 2025. These were described as interim measures until a full actuarial review is done. They were approved by the Minister of Health, Prof. Pate, and announced by DG Dr Kelechi Ohiri. — [Guardian NG, Feb 4 2025](https://guardian.ng/news/nhia-increases-capitation-service-fees/); [Daily Trust](https://dailytrust.com/nhia-increases-capitation-fees-by-93/)
- Guardian calls capitation "fixed yearly payments" per enrollee. In practice it is usually quoted per enrollee per month and paid monthly. **Conflict/uncertain:** I could not confirm the payment frequency from an NHIA primary source.
- Under the BHCPF, 50% of funds go through the NHIS/NHIA gateway. Primary care providers are paid by capitation and secondary facilities by fee-for-service. — [World Bank: Payment Method and Tariff Options for NHIS Gateway of BHCPF](https://documents1.worldbank.org/curated/en/465201615805182969/pdf/Payment-Method-and-Tariff-Options-for-Nigeria-s-National-Health-Insurance-Scheme-NHIS-Gateway-of-the-Basic-Health-Care-Provision-Fund-BHCPF.pdf)
- For years capitation lagged behind costs. Hospitals responded by turning away HMO patients, giving insured patients worse care, or dispensing lower-quality drugs. — [AjirMed / search summary](https://ajirmed.com/step-by-step-guide-to-registering-your-hospital-in-nigeria-for-hmo-and-getting-paid-faster.electronic-medical-records-emr-nigeria)
- An NHIA forum also covered discriminatory treatment of insured patients compared with cash patients, and drug shortages at accredited facilities. — [Streamlinefeed](https://streamlinefeed.co.ke/news/nhia-enforces-one-hour-hmo-authorisation-policy-to-end-hospital-delays)

**Claims lifecycle, vetting, denials and timelines (vendor sources)**
- Lifecycle: patient visit → clinical documentation → billing capture → claim compilation → submission to HMO → verification and review → approval or rejection → payment → reconciliation. HMOs audit diagnosis accuracy, coding, fit with the benefit package, and completeness of documentation. Queried claims need a response within 48–72 hours. Late submissions are rejected automatically. Payment takes 30–90 days, over 90 for problem HMOs. — [AjirMed](https://ajirmed.com/step-by-step-guide-to-registering-your-hospital-in-nigeria-for-hmo-and-getting-paid-faster.electronic-medical-records-emr-nigeria) (vendor blog; the 48–72h query window and "10% rejection → 30–40% revenue drop" are their claims, not regulation)
- Common rejection reasons: incomplete documentation, ICD/CPT mismatches, late submission, unverified eligibility, duplicate or manual billing errors, missing patient details, expired authorization. — [AjirMed](https://ajirmed.com/step-by-step-guide-to-registering-your-hospital-in-nigeria-for-hmo-and-getting-paid-faster.electronic-medical-records-emr-nigeria); [Pharmacare](https://pharmacare.app/blog/hmo-billing-dental-clinic-nigeria); [NairaCompare](https://nairacompare.ng/blogs/why-health-insurance-claims-get-rejected-in-nigeria)
- Typical reimbursement takes 60–90 days. HMOs accept claims up to 90 days after the visit, some up to 6 months. — [Pharmacare](https://pharmacare.app/blog/hmo-billing-dental-clinic-nigeria)
- Under NIIRA 2025 (Nigerian Insurance Industry Reform Act), insurers including HMOs must settle valid claims within 60 days of receiving complete documentation. — search summary citing [The Sun](https://thesun.ng/endless-controversies-over-hmo-operations/). **Uncertain:** NIIRA mainly regulates NAICOM insurers, and HMOs are regulated by NHIA. I could not confirm from the Act's text whether this rule binds HMOs.

**State schemes**
- LASHMA runs Ilera Eko, whose plans include Standard, Senior, Diaspora and Telemedicine. It also oversees BHCPF/NHIA-gateway implementation in Lagos. Front-line staff often confuse BHCPF with Ilera Eko. — [Lagos MoH](https://lagosministryofhealth.org/lagos-expands-oversight-on-basic-healthcare-fund-implementation/)
- Lagos has issued an executive order requiring all residents and workers to subscribe to the state health insurance scheme. — [Mondaq](https://www.mondaq.com/nigeria/insurance-laws-and-products/1505780/lagos-state-government-issues-executive-order-for-the-subscription-to-health-insurance-scheme-by-all-residents-and-workers-in-lagos-state)
- In March 2025 LASHMA warned residents not to pay Ilera Eko premiums into private accounts. — [Nairametrics](https://nairametrics.com/2025/03/25/lagos-state-health-agency-warns-residents-against-making-ilera-eko-premium-payments-into-private-accounts/)
- Lagos has a cooperative route ("Ilera N'Tiwa") for informal-sector workers. — [Western Post](https://www.westernpost.ng/lagos-deepens-health-insurance-inclusion-for-informal-sector-workers-through-ilera-ntiwa-cooperative/)

**NHIA digital and claims platforms**
- On 12 September 2025 NHIA launched a self-service portal for enrollees covering enrollment, adding dependants and changing provider. The announcement says nothing about provider claims or verification functions. — [NHIA](https://www.nhia.gov.ng/nhia-unveils-self-service-electronic-portal/)
- Caution: search results about "NHIA CLAIM-it", "Provider Claims Portal" and "99.96% electronic claims" refer to **Ghana's** NHIA ([nhis.gov.gh](https://www.nhis.gov.gh/News/nhia-holds-a-2-day-workshop-on-provider-claims-portal-(pcp)--6059)), not Nigeria's. Do not mix them up.

**Private claims platforms**
- Curacel (Lagos, founded 2019) gives HMOs and insurers AI claims processing and fraud detection. It collects claims from partner providers and claims to cut processing cost by up to 75% and cycle time from months to days. Wellness HMO reports 30% lower operating costs. Curacel says it works in over 10 countries with over 7,000 organizations and over 750,000 claims. — [Curacel](https://www.curacel.co/); [Curacel case study](https://www.curacel.co/case-studies/how-wellness-hmo-transformed-its-claims-processes-with-curacels-technology-2)

### Inferences
- **HMO/payer master data**: payer type (Private HMO, NHIA-FSSHIP, State scheme e.g. Ilera Eko/KADCHMA, BHCPF, Corporate, Self-pay), plan/benefit package, NHIA registration code, contact for authorizations, submission window in days, payment terms.
- **Enrollee record on patient**: HMO, plan, membership number, principal vs dependant, primary provider assignment (needed for capitation), verification status with timestamp.
- **Authorization code module**: request log (timestamp sent, channel), code received (timestamp, code, services covered, validity). An "SLA timer" flags requests with no reply after 60 minutes, so the hospital has evidence for NHIA escalation. Emergency override: treat now, attach the code later.
- **Benefit/exclusion rules per plan**: items outside the package are billed to the patient as co-pay or out-of-pocket, with patient acknowledgment. This matters because NHIA penalizes unjustified charges to enrollees.
- **Monthly claim batches per HMO**: claim form export (PDF/Excel in the HMO's format), status tracking (draft → submitted → queried → approved → part-paid → paid → written off), query response deadline, resubmission.
- **Capitation ledger**: monthly capitation received per HMO per enrollee list, compared with the cost of services used by capitated enrollees. This gives a utilization/profitability view for each HMO contract.
- **HMO receivables ageing** (0–30/31–60/61–90/90+) and payer performance dashboards: average days to pay, rejection rate per HMO.
- **NHIA/state scheme reports**: utilization and encounter reports. Exact formats were not found (see Gaps).
- **Integration**: there are no clear public APIs from HMOs. Exports in an HMO's or Curacel's format are realistic for now. A future connector to Curacel or HMO portals should sit behind a gateway-style interface, like CareVault's payments abstraction.

### Gaps
- I could not reach the NHIA Operational Guidelines 2023/2025 text (nhia.gov.ng PDF). The official claims submission timeline, capitation payment schedule (monthly vs quarterly), claim form fields, tariff schedule and authorization-code format are unconfirmed from the primary source.
- No current naira capitation figures were found (only percentage increases).
- KADCHMA (Kaduna) and other state schemes were not researched in detail.
- I found no reliable evidence of a Nigerian national electronic claims exchange or a standard API (e.g. FHIR Claim) used by Nigerian HMOs.
- CarePay-type platforms in Nigeria were not found. CarePay mainly operates in Kenya, from background knowledge, unverified here.

## Q3. Nigerian payment realities, VAT and e-invoicing

### Takeaway
Patients pay by cash, POS, bank transfer, Paystack/Flutterwave and virtual accounts. Co-pays and part payments are common. Under the Nigeria Tax Act 2025 (in force 1 Jan 2026), medical services, pharmaceutical products and medical equipment are **zero-rated** for VAT, not exempt. NRS (formerly FIRS) e-invoicing through the MBS platform is rolling out by taxpayer size, so large hospital groups may need to issue fiscalized invoices.

### Cited Findings
- Paystack Dedicated Virtual Accounts give each customer a reserved bank account number. They are for Nigeria-registered businesses only, limited to 1,000 accounts per business by default, and need the customer's phone, name and email. Fee: 1% capped at NGN 300. — [Paystack docs](https://paystack.com/docs/payments/dedicated-virtual-accounts/); [Paystack support](https://support2.paystack.com/hc/en-us/articles/360009881760-What-are-Dedicated-Virtual-Accounts)
- Nigerian HMS vendors advertise: several HMO price lists, electronic claims, payment tracking and claim reconciliation, HMO co-pay splits, Paystack integration, outstanding-bill tracking, co-pay collection by cash/POS/transfer linked to invoices, POS with daily till reconciliation, Paystack/Flutterwave, and bank transfer with proof-of-payment upload. — [ClinikEHR blog](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026); [medsoftwares](https://www.medsoftwares.com/news/hospital-software-nigeria-guide) (search-result summary; vendor marketing)
- NTA 2025 zero-rates "all medical and pharmaceutical products, including medicinal herbal products", "medical services" and "medical equipment". Suppliers can reclaim input VAT. The Act was signed 26 June 2025. — [Mondaq: VAT provisions under NTA 2025](https://www.mondaq.com/nigeria/tax-authorities/1793598/examination-of-the-value-added-tax-provisions-under-the-nigeria-tax-act-2025); NTA effective 1 Jan 2026 and repealed the VAT Act — [PwC Nigeria](https://www.pwc.com/ng/en/publications/the-nigerian-tax-reform-acts.html) (search summary)
- E-invoicing (NRS MBS platform) timeline: pilot from July 2025 for large taxpayers (turnover ≥ ₦5bn), large-company go-live 1 Nov 2025 (deadline extended), then medium and small taxpayers in later phases. Sources disagree: one says all VAT-registered businesses from 1 Jan 2026, another says medium in 2026 and small in 2027. Large-taxpayer post-go-live review ran Jan–Mar 2026, with enforcement from April 2026. It covers B2B, B2G and B2C. NTAA 2025 allows penalties from 1 Jan 2026. FIRS has been rebranded NRS. — [Sovos](https://sovos.com/regulatory-updates/vat/nigeria-nrs-publishes-e-invoicing-timeline/); [EY](https://www.ey.com/en_gl/technical/tax-alerts/nigerias-federal-inland-revenue-service-rolls-out-e-invoicing-platform); [VATupdate Sep 2025](https://www.vatupdate.com/2025/09/09/firs-extends-e-invoicing-compliance-deadline-for-large-nigerian-taxpayers-to-november-2025/); [VATupdate Feb 2026](https://www.vatupdate.com/2026/02/19/briefing-document-podcast-e-invoicing-and-e-reporting-in-nigeria/)

### Inferences
- **VAT**: hospital services, drugs and devices should carry a 0% VAT tax code, not "exempt", so input-VAT recovery stays possible. Non-medical items (cafeteria, cosmetic, parking) may be standard-rated at 7.5%. CareVault needs a tax code on each catalog item, not a single global flag. Have a tax adviser confirm edge cases such as cosmetic procedures.
- **E-invoicing**: zero-rated supplies are still taxable supplies, so a VAT-registered hospital is likely in scope once its size tier goes live. This is an inference; check the NRS guidance. Building an invoice data model that can carry an IRN/QR from an NRS-accredited Access Point Provider is low-regret.
- **Payment channels to model**: cash, POS (with terminal/RRN reference), bank transfer (proof upload plus manual confirm), Paystack card/transfer, per-patient virtual account (auto-credit to wallet), USSD (via Paystack). USSD details were not researched separately.
- **Partial payments and credit**: invoice balance tracking. Corporate/retainer accounts get a credit limit, a monthly statement and staff-linked billing. Deposits draw down from the wallet.
- **Cashier controls**: shift open/close per cashier, channel totals, variance, supervisor sign-off. Auto-reconcile Paystack settlements against receipts.

### Gaps
- I did not research Flutterwave and Monnify reserved-account pricing or limits.
- I found no source on NRS e-invoicing applying specifically to hospitals or clinics.
- Corporate retainer practices in Nigerian hospitals are not documented in a citable source.

## Q4. What Nigerian HMS vendors advertise for billing

### Takeaway
Nigerian vendors focus on HMO tariff upload, auto-billing by service, claim form generation and tracking, revenue by HMO, multi-channel payments (cash, transfer, POS, insurance), consolidated discharge billing, consumables billing, and HMO reconciliation. Few advertise denial work queues, capitation profitability analytics or authorization-SLA evidence. Those are possible gaps CareVault could fill.

### Cited Findings
- Helium Health: upload HMO tariffs, auto-bill by service rendered, generate claim forms, see payouts per HMO and revenue by source. — [Helium Healthcare features](https://heliumhealthcare.com/features.html) (search summary)
- HeliumOS: multi-channel payments (cash, transfers, POS, insurance); RCM covering charge capture, claim administration and payment reconciliation; tariff and scheme management; claims generation, submission and tracking; charges consolidated automatically at discharge; store/consumables billing; scheduled reports to inbox or SMS. — [HeliumOS](https://heliumhealth.com/helium-os/)
- Helium also sells HeliumWallet (medical billing and payment) and has offered medical loans/financing. — [HeliumWallet](https://heliumhealth.com/helium-wallet/); [Crunchbase](https://www.crunchbase.com/organization/helium-healthcare)
- Hyella HMIS: HMO reconciliation, recovery of unclaimed funds, capitation agreements, handling patients who switch from private pay to HMO cover, real-time per-HMO data, and roles for HMO officers and billing officers. — [Hyella](https://hyella.com/hmo-reconciliation/)
- Other vendors in lists: ClinikEHR, Intuitive Global Healthcare, Musskart, Smart Hospital Manager, Momentum EMR. — [AjirMed list](https://ajirmed.com/best-seven-7-hospital-management-systems-hms-hospital-information-management-systems-hims-nigeria.electronic-medical-records-emr-nigeria); [ClinikEHR](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026)

### Inferences
Prioritized feature list for CareVault (author's synthesis):
1. **P0**: service catalog / chargemaster with multiple tariff tables (self-pay, each HMO, NHIA, corporate) and a 0% / 7.5% VAT code on each item.
2. **P0**: encounter/admission billing account with automatic charge capture from lab, radiology, pharmacy, procedures and bed-days; discharge bill; split between payer portion and patient co-pay.
3. **P0**: enrollee verification and authorization-code log with a 60-minute SLA timer and emergency override.
4. **P0**: cashier shifts, multi-channel receipts (cash/POS/transfer-with-proof/Paystack/virtual account), end-of-day reconciliation.
5. **P1**: HMO claim batches (monthly), scrubber rules, export per HMO, status lifecycle including "queried", remittance posting, denial work queue, ageing and per-HMO KPIs.
6. **P1**: deposits drawn from the wallet, packages/bundles, discounts and waivers with approval, refunds with approval, all audit-logged through the existing `logAudit()`.
7. **P1**: corporate/retainer accounts with credit limits and monthly statements.
8. **P2**: capitation ledger and per-HMO contract profitability; NHIA/state-scheme utilization reports; an e-invoicing data model ready for NRS MBS; a claims-platform connector (e.g. Curacel) behind a gateway interface.

### Gaps
- No Smartcare, MedSyn, Bloom EHR or Amo HMS billing pages were found or fetched. Their feature claims are unverified.
- Vendor claims are marketing and were not independently verified.
