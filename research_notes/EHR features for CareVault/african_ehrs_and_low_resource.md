# African EHRs/HMS and Low-Resource Design Features (Nigeria / Sub-Saharan Africa, 2025–2026)

Research context: inform the roadmap of CareVault (multi-tenant Next.js EHR for Nigerian hospitals; already has patients, appointments, ADT, lab, radiology, pharmacy, inventory, orders, finance, Paystack payments/wallets, RBAC, audit logs, consent, patient portal). Research date: Oct 2026. Roughly 20 searches/fetches; coverage is uneven, and the Gaps sections say where.

## 1. Which systems exist, and what modules and differentiators do they have?

### Takeaway
The market splits into four groups. (a) Commercial Nigerian/pan-African platforms such as Helium Health compete on billing, HMO claims, financing and telemedicine, not on clinical depth. (b) Government-backed national or state EMRs (FMoH eClinic by Interswitch, Lagos PHC EMR, Ghana LHIMS, Kenya Taifa Care/KenyaEMR) are increasingly tied to **insurance claims submission**. (c) Open-source global goods (OpenMRS O3, Bahmni, DHIS2) win on offline/LAN deployment and program modules. (d) Insurance and payment rails (M-TIBA) win on claims speed. The clearest regional trend for 2025–2026 is that EHRs are becoming the required route for national health-insurance claims.

### Cited Findings

**Helium Health (Nigeria; HeliumOS / HeliumDoc / HeliumCredit / HeliumWallet)**
- HeliumOS is pitched as an "all-in-one operating system" for facilities. HeliumDoc handles provider–patient interaction, HeliumCredit provides financing, and HeliumWallet simplifies billing — [Ducit Blue](https://www.ducitblue.com/helium-health-powering-africas-healthcare-revolution-with-tech/)
- Listed features: EMR, telemedicine, analytics, patient management, secure messaging, customizable workflows, patient portal, clinical decision support and public-health surveillance. The listing also claims "99.99% uptime" and 300+ facilities. This is an aggregator listing, so treat the numbers as marketing — [Zoftwarehub](https://zoftwarehub.com/products/helium-os/features)
- Founded in 2014. Raised $42.2M. Operates in Nigeria, Ghana, Liberia, Senegal, Cameroon, Uganda and Kenya. Its 2021 acquisition of Meddy and the HeliumDoc product added telemedicine, doctor discovery, automated workflows and patient engagement — [Techeconomy](https://techeconomy.ng/helium-health-vs-reliance-hmo-nigeria-healthtech/)
- HeliumCredit launched in 2020. It lends to hospitals, clinics, pharmacies and diagnostic centres for equipment, drugs and expansion. Over $3.5M has been disbursed to about 200 facilities. The $30M Series B in 2023 was raised mainly to expand credit — [Techeconomy](https://techeconomy.ng/helium-health-vs-reliance-hmo-nigeria-healthtech/); [TechCabal](https://techcabal.com/2023/06/05/helium-health-secures-30m-funding-to-power-healthcare-financing/); [TechCabal 2023 financing model](https://techcabal.com/2023/07/12/helium-credit-innovative-healthcare/)

**Nigeria Federal Ministry of Health — eClinic (Interswitch)**
- FMoH's eClinic EMR is deployed in at least four federal institutions: sites in Osun, Ogun and Edo, plus the National Orthopaedic Hospital Enugu (commissioned May 2025). Functions: patient registration, diagnostics tracking, pharmacy management and administrative reporting — [ThisDay, May 2025](https://www.thisdaylive.com/2025/05/08/interswitch-boosts-healthcare-transformation-with-launch-of-emr-platform-at-enugu-national-orthopaedic-hospital/); [Vanguard, May 2025](https://www.vanguardngr.com/2025/05/interswitch-unveils-eclinic-emr-platform-at-enugu-orthopaedic-hospital/)
- The pilot started at federal tertiary hospitals, one state per geopolitical zone. The stated aim is a "national unified EMR platform" that public and private sub-national institutions are encouraged to adopt — [BusinessDay](https://businessday.ng/news/article/fg-begins-digitisation-of-nigerias-healthcare-system/)

**Lagos State**
- The Lagos State Primary Health Care Board, with CHAI and the Gates Foundation, has digitised 100 PHCs with EMR and targets all 326. The state says it wants EMRs to be "co-financed, locally-owned solutions," not donor pilots. It launched a Digital Health Champions training programme. The vendor is not named — [Leadership.ng](https://leadership.ng/lagos-govt-digitises-100-phcs-charts-roadmap-for-statewide-emr-rollout/); [Lagos MoH](https://lagosministryofhealth.org/lagos-drives-digital-revolution-in-primary-healthcare/)
- In May 2025, LASHMA deployed **biometric card readers** for the ILERA EKO social health plan across 100 provider-network facilities in phase 1. Pilots ran at General Hospital Odan and St. Nicholas Hospital — [Lagos State official site](https://lagosstate.gov.ng/news/all/view/683ab94b5e4c9d6ceca703c4)

**Other Nigerian commercial HMS (from a vendor-authored comparison, so it is biased)**
- ClinikEHR claims to be offline-first with auto-sync, optimised for 2G/3G, with AI clinical notes, drug-interaction checks, NHIS integration, automated HMO eligibility checks and e-claims. Pricing in Naira (from ₦129,900/month). Support over WhatsApp — [ClinikEHR blog (vendor)](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026)
- The same source describes HealthOne (Nigerian) as covering registration, documentation, pharmacy/inventory, lab and HMO integration. Quoted prices: ₦100k–200k/month for small hospitals and ₦600k+/month for large ones. It describes OpenMRS hosting at ₦50k–200k/month plus support at ₦100k–500k/month — [ClinikEHR blog (vendor)](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026)

**Ghana — LHIMS (Lightwave)**
- Started in 2018 under Ghana Health Service. By the end of 2024 it was in all teaching, regional and district hospitals (253 major facilities), including Korle Bu and Komfo Anokye. Those sites report gains in patient care, **revenue management** and disease surveillance — [Citi Newsroom, Feb 2025](https://citinewsroom.com/2025/02/how-ghanas-lightwave-health-information-management-system-is-transforming-healthcare-delivery/); search summary of [Lightwave coverage](https://www.adomonline.com/lightwave-ehealthcare-solutions-reaffirms-commitment-to-ghanas-e-health-agenda-ongoing-lhims-support/)
- **Vendor-funding failure:** Lightwave suspended LHIMS services on 31 May 2025 after about 9 months unpaid by the MoH, then reactivated them. In September 2025 it cut staff and operations to match available funding. In November 2025 there was a public dispute with the Health Minister over contract terms, data control and data residency (Lightwave says no data is stored outside Ghana) — [Techlabari](https://techlabari.com/lightwave-revoked-then-reactivated-its-digital-electronic-medical-record-services-for-ghana-health-institutions/); [Citi Newsroom, Nov 2025](https://citinewsroom.com/2025/11/lightwave-rejects-akandohs-claims-on-e-health-contract-data-control-and-payments/); [GhanaWeb](https://www.ghanaweb.com/GhanaHomePage/NewsArchive/No-Ghanaian-medical-data-stored-outside-the-country-Lightwave-tells-health-minister-2010347)
- Reported LHIMS problems: power failures lengthen waits, connectivity slows record retrieval, integration with DHIMS2 is hard, and facilities are not standardised — [Citi Newsroom](https://citinewsroom.com/2025/02/how-ghanas-lightwave-health-information-management-system-is-transforming-healthcare-delivery/)

**Kenya — KenyaEMR / Taifa Care HMIS / SHA; CarePay M-TIBA**
- TaifaCare KenyaEMR is a modular, open-source EHR (built on OpenMRS lineage), "optimized for low-connectivity environments." It is meant to support integrated care across the life course rather than single-disease programmes — [Palladium](https://thepalladiumgroup.com/news/Building-a-New-Era-for-Digital-Health-in-Africa); [The Star, Jul 2025](https://www.the-star.co.ke/counties/nyanza/2025-07-16-government-launches-taifacare-in-kisumu-eyes-inclusive-digital-health)
- From July 2026, SHA requires **all Level 4 public hospitals** to move to the Taifa Care HMIS and to submit new claims only through it, with 24/7 support from SHA and the Digital Health Agency — [The Star, Jul 2026](https://www.the-star.co.ke/news/2026-07-01-sha-shifts-level-4-public-hospitals-to-taifa-care-hmis)
- SHA uses KMPDC practitioner-registry data plus AI and analytics to detect fraudulent claims. Taifa Care enrolment is about 24M — [Kenya News Agency](https://www.kenyanews.go.ke/taifa-care-enrolment-reaches-24-million-as-government-intensifies-war-on-health-sector-fraud/); [MoH Kenya](https://www.health.go.ke/ministry-health-confirms-progress-taifa-care-and-sha-rollout)
- CarePay's M-TIBA (with PharmAccess and Safaricom): 5,000+ Kenyan providers reach 10+ insurers from one platform and cut payment cycles by 95%. AI auto-processed about 40% of claims by April 2024, with approval in under 12 hours. Providers submit and track pre-authorisations and claims in real time. A provider profile includes departments, services, clinicians, pricing, contracts, licences and **bed/theatre availability** — [M-TIBA provider resources](https://www.mtiba.com/m-tiba-platform-resources); [CarePay](https://www.carepay.com/press/health-leaders-at-the-digital-pulse-explore-ais-quick-wins-in-insurance-to-cut-costs-and-expand-access)

**OpenMRS 3 (O3)**
- Releases: 3.0.0 (2024), 3.2.1 (Jan 2025), 3.4.0 (May 2025). 3.4.0 brought performance gains, new clinical features and a design-system upgrade — [OpenMRS 3.2.1 notes](https://openmrs.atlassian.net/wiki/spaces/docs/pages/324075587/Release+Notes+3.2.1+2025-01); [O3 3.4.0 release notes](https://talk.openmrs.org/t/o3-refapp-v3-4-0-release-notes/46160)
- Offline model: O3 runs fully offline on a local device or facility LAN. When the internet drops, users can switch to a local device that later updates the central cloud database, and this switch can be automated. The older tablet offline mode is **no longer maintained**. OpenMRS recommends separate CHW apps from the Global Goods ecosystem for offline community work — [O3 Internet Connection FAQs](https://openmrs.atlassian.net/wiki/spaces/docs/pages/152731650/O3+Internet+Connection+FAQs)

**Bahmni (OpenMRS + Odoo ERP + OpenELIS + DCM4CHEE PACS)**
- Bahmni Connect is an offline Android app (Cordova) and, from v0.89, an installable PWA. It does patient registration, dashboard view (observations, visits, treatments, lab orders, diagnoses), observation capture and two-way sync when back online. There is also an offline-ready Bahmni Outreach app for community healthcare — [Bahmni Connect features](https://bahmni.atlassian.net/wiki/spaces/BAH/pages/39813212/Bahmni+Connect+Features); [Bahmni Connect](https://bahmni.atlassian.net/wiki/spaces/BAH/pages/94535750/Bahmni+Connect); [Bahmni Outreach](https://bahmni.atlassian.net/wiki/spaces/BAH/pages/3238625296/Bahmni+Outreach+App+for+Community+Healthcare+Offline+ready)

**Other offline EHRs noted in the SSA literature**
- Blue EHR and Hikma Health EHR are cited as offline-capable. Kenya's mUzima is a mobile EHR for HIV care — [Mugauri et al. 2025 scoping review, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)

### Inferences
- Insurance claims are now the main reason facilities adopt an EHR in the region: Kenya mandates the HMIS for SHA claims, Ghana's LHIMS is credited with revenue management, Lagos ties ILERA EKO to biometric verification, and Nigerian vendors lead with HMO eligibility checks and e-claims. For CareVault, an **NHIA/HMO claims module** (enrolee eligibility, pre-auth/authorisation codes, tariff/capitation management, claim batching, rejection tracking) is likely the biggest gap against Nigerian competitors.
- Helium's moat is financial (credit, wallet), not clinical. CareVault already has Paystack wallets. Adding facility-side revenue analytics would put it in the same lane, but lending itself is a regulated business.
- Ghana's LHIMS shows a sovereignty and continuity risk: governments and hospitals worry about vendor lock-in and where data lives. Data export, in-country hosting and FHIR interoperability are selling points for CareVault.
- Government platforms (FMoH eClinic, Lagos PHC EMR) cover tertiary and primary public facilities. CareVault's addressable market is mainly private hospitals and hospital groups, and possibly state secondary facilities. Interoperability with any "national unified EMR" will matter.

### Gaps
- **Not researched or found:** SmartCare (Zambia), Medtrack, "Lafiya" HMS, Rwanda's national EMR, and DHIS2 Tracker feature details. I found no 2025–2026 primary sources on them in this pass.
- I could not get Helium's current official module list (heliumhealth.com was not fetched). Its HMO-claims features are not confirmed from a primary source.
- A search snippet claimed Patients Know Best won a 2024 Lagos "Single Patient Record" contract. The source was a Wikipedia page probably about NHS England's SPR, so this is **unverified and likely wrong**.
- The vendor behind the Lagos PHC EMR is not named in the sources.
- NHIA (Nigeria) e-claims or EMR integration mandates: not researched.

## 2. Which low-resource design features matter (offline, SMS/USSD, multilingual, power, tablets, printing, queues)?

### Takeaway
Unreliable power and internet are the most-cited failure factors in SSA EHR deployments. Successful systems either run on a local server/LAN with cloud sync (OpenMRS, KenyaEMR) or offer an offline PWA or Android client (Bahmni Connect). SMS reminders have Nigerian RCT evidence of roughly halving missed appointments, and SMS reaches basic handsets that WhatsApp cannot.

### Cited Findings
- Across 30 SSA EHR studies in 8 countries, unreliable power appeared in about 60% of studies and poor connectivity affected over 70% of implementations. The review recommends backup power (UPS/generators), simple UIs, tailored training and interoperability — [Mugauri et al. 2025, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)
- Nigerian infrastructure: reported electricity access is about 60.5% and internet penetration about 40%. Some regions report only 26.7% of health workers with basic computer skills — [search summary of Global Journal of Medical Students review](https://thegjms.org/barriers-to-the-adoption-of-electronic-health-records-in-nigerian-healthcare-systems-analysing-infrastructure-training-and-policy-challenges/)
- O3 pattern: a local device or LAN server that syncs to the cloud on reconnection. Bahmni pattern: an offline PWA/Android client with two-way sync — [O3 FAQ](https://openmrs.atlassian.net/wiki/spaces/docs/pages/152731650/O3+Internet+Connection+FAQs); [Bahmni Connect](https://bahmni.atlassian.net/wiki/spaces/BAH/pages/39813212/Bahmni+Connect+Features)
- Nigerian vendors now market offline-first operation, 2G/3G optimisation and WhatsApp support as differentiators — [ClinikEHR (vendor)](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026)
- Nigerian RCT (200 first-episode psychosis outpatients, tertiary psychiatric hospital): SMS-reminded patients were almost twice as likely to attend, and the SMS reminder independently cut the risk of a missed appointment by 50% — [PubMed 27582239](https://pubmed.ncbi.nlm.nih.gov/27582239/)
- SMS works on any phone and carrier without data, so it reaches basic-handset users where WhatsApp cannot. Vendor content argues for SMS plus WhatsApp in Africa — [Dendoo (vendor blog)](https://dendoo.net/blog/sms-vs-whatsapp-vs-email-best-appointment-reminders-for-dental-clinics-in-africa/)
- Biometric patient/enrolee identification is being rolled out for Lagos insurance (ILERA EKO card readers) — [Lagos State](https://lagosstate.gov.ng/news/all/view/683ab94b5e4c9d6ceca703c4)

### Inferences
- For CareVault (cloud Next.js): the practical low-resource steps are (1) a **PWA with offline read cache plus a queued write outbox** for high-frequency tasks (vitals, registration, queue check-in, dispensing); (2) aggressive payload reduction for 3G; (3) **print-friendly views** for lab results, prescriptions, discharge summaries and receipts, as a paper fallback during outages; (4) an optional on-premise or edge deployment for large hospitals. Full OpenMRS-style LAN parity is a large architectural change.
- An SMS-first notification layer, with WhatsApp as an upgrade (via providers such as Termii or Twilio), for appointment reminders, lab-result-ready alerts, immunisation and ANC recalls, and payment receipts is low-cost and evidence-backed.
- Queue/token management (OPD triage → consult → lab → pharmacy → cashier) is a common Nigerian HMS feature that maps onto CareVault's existing modules. It is not verified from a source in this pass.

### Gaps
- No sourced evidence found on USSD use in EHRs, multilingual UIs (Yoruba, Hausa, Igbo, Pidgin) in deployed Nigerian EHRs, or queue/token systems. These need dedicated searches.
- No primary data on Termii or WhatsApp Business API use by Nigerian hospitals.

## 3. Telemedicine and patient engagement

### Takeaway
Telemedicine, doctor discovery and patient engagement are add-ons in the leading Nigerian platform (HeliumDoc, via the Meddy acquisition). The strongest engagement driver with evidence behind it is still SMS reminders.

### Cited Findings
- HeliumDoc adds telemedicine, doctor discovery, automated workflows and AI-powered patient engagement — [Techeconomy](https://techeconomy.ng/helium-health-vs-reliance-hmo-nigeria-healthtech/)
- The HeliumOS listing includes a patient portal and secure messaging — [Zoftwarehub](https://zoftwarehub.com/products/helium-os/features)
- In SSA studies, 25% shorter waits and 30% less HIV loss to follow-up (Kenya CDSS) are reported benefits of EHR adoption — [Mugauri et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)

### Inferences
- CareVault already has a patient portal and Paystack. Next steps that fit: pay-before-consult teleconsultation booking (video link plus wallet debit), e-prescription sharing to partner pharmacies, and home sample-collection requests linked to lab orders.

### Gaps
- I found no sourced 2025–2026 data on uptake of e-prescriptions to partner pharmacies, home sample collection, or chat in Nigeria. Players such as Mobihealth, Reliance Health and Healthtracka were not researched.

## 4. Public-health programme modules and required reporting

### Takeaway
Nigerian facilities report monthly into DHIS2 (the NHMIS platform) using standard forms, most importantly the NHMIS Monthly Summary Form (2013 and 2019 versions) and the immunisation forms. An EHR that auto-generates these aggregates removes manual tallying, which is a concrete value proposition.

### Cited Findings
- DHIS2 has been the NHMIS platform for monthly aggregate facility reporting since 2013 — [Gavi ZDLH Nigeria assessment](https://zdlh.gavi.org/sites/default/files/2024-07/Rapid_Assessment_of_Immunization_Landscape_in_Nigeria_ZDLH_Nigeria.pdf); [PMC7436629](https://pmc.ncbi.nlm.nih.gov/articles/PMC7436629)
- About 8 monthly reporting forms exist on Nigeria DHIS2, including the NHMIS Monthly Summary (2013 and 2019), the Health Facility Vaccines Utilization Summary, the Health Facility Immunization Microplan and NHMIS supplementary forms — [search summary of Nigeria DHIS2 RI literature](https://www.researchgate.net/publication/343133588_Implementing_the_routine_immunisation_data_module_and_dashboard_of_DHIS2_in_Nigeria_2014-2019)
- The traditional flow is paper tally sheets → paper Monthly Summary Form → LGA → state → national. Immunisation focal persons compile daily and report to the LGA immunisation officer monthly. National RI reports go to NPHCDA and NERICC — [PMC6169671](https://pmc.ncbi.nlm.nih.gov/articles/PMC6169671/); [Gavi ZDLH](https://zdlh.gavi.org/sites/default/files/2024-07/Rapid_Assessment_of_Immunization_Landscape_in_Nigeria_ZDLH_Nigeria.pdf)
- Nigeria has integrated last-mile vaccine supply-chain data into DHIS2 — [DHIS2](https://dhis2.org/nigeria-vaccine-logistics/)
- FMoH lists its national platforms on [fmohconnect.gov.ng/platforms](https://fmohconnect.gov.ng/platforms/) (not fetched)
- A reported 20% improvement in maternal/child health record accuracy is attributed to EHR use in Nigeria — [Mugauri et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)

### Inferences
- High-value roadmap items: (1) an **NHMIS Monthly Summary Form generator** (an aggregate export from encounters, ANC, deliveries, immunisations and lab), with optional push to DHIS2 through its Web API; (2) an **immunisation module** using the NPHCDA schedule, with due-date recalls by SMS; (3) **ANC/delivery/postnatal** and **family-planning** encounter templates; (4) growth charts for under-5s. HIV/TB programme modules matter mainly to donor-supported facilities and are probably lower priority for private hospitals.

### Gaps
- I did not retrieve the exact NPHCDA immunisation schedule (antigens and ages), the field list of the NHMIS 2019 MSF, or HIV/TB programme reporting (NDARS/NMRS — Nigeria's NMRS is an OpenMRS distribution for HIV, not verified here).

## 5. Multi-branch / hospital-group features and owner analytics

### Takeaway
Little sourced detail was found. The available evidence suggests owners value revenue management and claims-cycle speed most, and that insurer-facing data (bed and theatre availability, service catalogues, pricing) is becoming platform data.

### Cited Findings
- LHIMS sites report gains in revenue management alongside clinical care and surveillance — [Citi Newsroom](https://citinewsroom.com/2025/02/how-ghanas-lightwave-health-information-management-system-is-transforming-healthcare-delivery/)
- M-TIBA provider profiles expose departments, services, clinicians, pricing, contracts, licences and bed/theatre availability. Providers report 95% shorter payment cycles — [M-TIBA](https://www.mtiba.com/m-tiba-platform-resources)
- Nigerian vendors market multi-department or multi-location support. The descriptions are vague — [ClinikEHR (vendor)](https://clinikehr.com/blog/top-5-emr-hospitals-nigeria-2026)

### Inferences
- CareVault is multi-tenant by organisation. Hospital groups would need a **facility/branch dimension within a tenant**: branch-scoped RBAC, per-branch inventory with inter-branch stock transfers, patient records shared across branches, inter-branch and external referrals, and a consolidated owner dashboard (revenue by branch, collections vs HMO receivables, bed occupancy, top services, stock-outs, no-show rate).

### Gaps
- I found no sourced feature lists for multi-branch Nigerian HMS (for example Helium's group features) or for owner-dashboard KPIs. This needs vendor-page fetches.

## 6. Why EHR adoption fails in Nigeria, and what overcame it

### Takeaway
The main barriers are infrastructure (power, internet), cost, weak digital literacy and training, policy gaps, workflow disruption and data-safety worries. Measures that helped include local co-financing and ownership (Lagos), health-worker champion programmes, backup power, simple UIs and offline tolerance. The Ghana case adds a new risk: vendor or government funding disputes that can switch systems off.

### Cited Findings
- Scientific Reports (2024/25) study of Nigerian implementation: the top obstacles were limited funds, insufficient ICT resources, unstable electricity and poor internet, plus a lack of comprehensive policy that leads to inconsistent and unsustainable local practice. The full text could not be fetched (paywall redirect), so this comes from the search summary — [Sci Rep s41598-024-83009-y](https://www.nature.com/articles/s41598-024-83009-y)
- Annual EHR costs are cited at over $10,000 per practice. The lack of structured training feeds resistance and workflow disruption, and users' concern about data safety lowers adoption — [GJMS review](https://thegjms.org/barriers-to-the-adoption-of-electronic-health-records-in-nigerian-healthcare-systems-analysing-infrastructure-training-and-policy-challenges/)
- Across SSA, 50% of health professionals raised usability concerns, training needs deterred adoption, and privacy concerns appeared in 35% of studies — [Mugauri et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)
- A 2025 Ogun State study of health workers' knowledge, attitudes and practices towards EMR exists (not fetched) — [medRxiv 2025](https://www.medrxiv.org/content/10.1101/2025.08.20.25334058.full.pdf). A 2025 scoping review on nurse EHR adoption in Africa also exists — [PMC12437165](https://pmc.ncbi.nlm.nih.gov/articles/PMC12437165/)
- Lagos is countering donor-pilot dependency with co-financing and a Digital Health Champions programme — [Leadership.ng](https://leadership.ng/lagos-govt-digitises-100-phcs-charts-roadmap-for-statewide-emr-rollout/)
- Ghana LHIMS services were suspended in May 2025 over unpaid fees, and data-control disputes followed — [Techlabari](https://techlabari.com/lightwave-revoked-then-reactivated-its-digital-electronic-medical-record-services-for-ghana-health-institutions/); [Citi Newsroom](https://citinewsroom.com/2025/11/lightwave-rejects-akandohs-claims-on-e-health-contract-data-control-and-payments/)
- Benefits that justify adoption: 20–30% fewer data-entry errors, 25% shorter waits and 40% less record duplication (Ethiopia) — [Mugauri et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12042231/)

### Inferences
- UX and features that answer these barriers: Naira-denominated, per-facility pricing; built-in onboarding and training (in-app guides, role-specific training mode or sandbox tenant); minimal-click forms that match the paper registers staff already know; outage tolerance (offline outbox, printable fallbacks); visible privacy controls (CareVault's consent and audit features are a marketing asset against the "data safety" concern); and **easy data export and portability**, to address the lock-in fear the Ghana case highlights.
- Revenue features (HMO claims, leakage control through mandatory billing before service, cashier reconciliation) give owners an ROI case. Pure clinical benefits rarely pay for the system in private Nigerian hospitals. This inference is supported indirectly by Helium's financing-led model and by Kenya and Ghana linking EHRs to claims and revenue.

### Gaps
- The quantified ranking from the Sci Rep study is unavailable (no full text).
- I found no published Nigerian case study tying specific UX features to adoption success.
