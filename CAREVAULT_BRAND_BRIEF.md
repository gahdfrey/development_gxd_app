# CareVault: Brand and Logo Design Brief

> A complete picture of what CareVault is, who it serves, how it looks today and where its logo has to work. Written for a logo designer, or for anyone briefing one, who has never seen the product.
>
> Compiled from the codebase (`gxd_app`) on 31 October 2026.

---

## 1. Snapshot

| | |
|---|---|
| **Name** | CareVault, written as one word in camel case with a capital C and a capital V |
| **Internal codename** | `gxd_app` (never shown to users) |
| **What it is** | An Electronic Health Record (EHR) and hospital management system. It is the software a hospital or clinic runs on, from patient registration to discharge and billing. |
| **Delivery** | Web app (cloud / SaaS), used in desktop browsers by staff and on phones by patients |
| **Primary market** | Nigeria. Based in Lagos (8b Dipo Awolesi Street, Magodo). Domain is `carevault.com.ng`. |
| **Who buys it** | Private practices, multi-specialty clinics, hospital systems, urgent care centres |
| **Who uses it daily** | Doctors, nurses, lab scientists, radiographers, pharmacists, cashiers and finance staff, administrators, and patients |
| **Current tagline (site title)** | "The Modern EHR for Connected Care" |
| **Hero headline** | "The EHR built for the way **clinicians think**" |
| **Access model** | Invitation only for now. Sign-up and trial buttons on the landing page are deliberately disabled, and leads come in through "Request a demo". |
| **Contact** | info@carevault.com.ng · +234 905 669 9774 |

---

## 2. The name

**CareVault = Care + Vault.**

- **Care** stands for the clinical, human half: patients, clinicians, healing, warmth, attention.
- **Vault** stands for the security half: a protected place where something valuable (a person's medical history) is kept safe, complete and retrievable for life.

The name promises that **your health information is held as safely as valuables in a vault, by people who care about you.** Two ideas drive the whole product, and the logo should hold both of them at once:

1. **Protection.** Privacy, consent, audit trails and compliance (HIPAA, GDPR, Nigeria's NDPA and NDHA) are built into the product's structure, not added on top. See §5.
2. **Connection.** One record follows the patient across the lab, pharmacy, radiology, wards and billing, and eventually across hospitals through national health information exchanges.

### Letterform notes
- 9 letters: `C a r e V a u l t`
- Natural split: **Care | Vault**, which gives two capitals, **C** and **V**, for a monogram.
- Both halves contain an **a**, and the word has a pleasing rhythm (Care-Vault, two stressed syllables plus a soft third).
- The **V** works as a strong geometric element: a checkmark, a shield's point, a downward "keep / store" motion, or a chevron.
- The **C** works as an open container, an embrace, a shield in profile, or a partial ring around something.
- **C + V together**: a C cradling a V, a V set inside a C, or a V whose stroke closes a C into a shield.
- At 9 characters it fits an SMS sender ID (11-character limit). The app does send patient SMS reminders.

---

## 3. What the product actually does

CareVault covers the whole hospital, not just one department. Each module below is a real, working part of the app.

### Clinical
| Module | Plain-English meaning |
|---|---|
| **Patients** | Register patients, look them up, and hold their master record (demographics, National Identification Number (NIN), Medical Record Number (MRN), next of kin). Detects and merges duplicate records. |
| **Appointments / My Appointments / All Appointments** | Scheduling, doctor diaries, check-in and waiting status |
| **Visits and Consultations** | The doctor's encounter: notes, vitals, coded diagnoses using **ICD-11**, the WHO's global disease coding system |
| **Allergies, Problems, Vitals, Measurements** | The ongoing clinical picture of the patient |
| **Clinical Decision Support (CDS)** | Automatic warnings, e.g. drug interactions and allergy clashes |
| **Laboratory** | Test requests, sample workflow, result entry, abnormal/critical flagging, critical-result alerts to doctors |
| **Radiology** | Imaging requests and uploaded result files |
| **Pharmacy and Prescriptions** | Prescribing, dispensing, drug generics/brands/classes |
| **eMAR** | Electronic Medication Administration Record, i.e. nurses logging each dose given on the ward |
| **Admission** | Wards, beds, transfers, admission requests triaged by severity (Routine → High → Urgent → Critical) |
| **Vaccination** | Vaccine catalogue, courses and individual doses |
| **Referrals** | Sending patients to, or receiving them from, other providers and referrers |

### Money and operations
| Module | Plain-English meaning |
|---|---|
| **Finance and Payments** | Charges, receipts, cashier shifts, online payments through Paystack (a Nigerian payment gateway) |
| **Wallets** | Prepaid patient balances |
| **Billing Plans and Subscriptions** | Recurring care plans (e.g. monthly packages) |
| **HMO** | Nigerian Health Maintenance Organisations (insurers): price lists, coverage, eligibility checks, pre-authorisations, claim batches |
| **Inventory, Products, Supply Orders, Orders** | Stock and procurement for drugs and consumables |
| **Messaging** | Automated SMS/notification templates and reminders to patients |
| **Analytics / Dashboard** | Volumes, revenue, operational overview |

### Trust and governance
| Module | Plain-English meaning |
|---|---|
| **Roles and Users** | Fine-grained, role-based permissions (who can view, add or edit what) |
| **Audit Logs** | Append-only record of every login and every view or change of patient data |
| **Consent** | Capturing a patient's consent to data processing |
| **Data Requests** | Patients can ask for their data to be exported, corrected or erased (GDPR-style rights) |
| **FHIR export** | Exports records in FHIR R4, the international standard format for exchanging health data between systems |

### Patient-facing portal
- **My History**: patients log in and see their own visits, results and records.
- **My Appointments**: patients see and manage their bookings.
- So the logo appears in front of **ordinary patients on their phones**, not only hospital staff.

### Multi-tenant
One CareVault installation hosts **many separate hospitals ("organisations")**, each fully walled off from the others. CareVault is the platform brand. Each hospital's own name appears inside the app (e.g. test SMS messages are signed with the hospital's name), and CareVault is the trusted layer underneath. **The logo has to sit comfortably next to a client hospital's logo without competing with it.**

---

## 4. Audience and personas

| Persona | What they need to feel from the brand |
|---|---|
| **Hospital owner / Medical Director** (the buyer) | "This is a serious, modern, reliable system that will make my hospital look good and pass regulation." |
| **Doctor** (lands on My Appointments) | "Fast, clear, gets out of my way." The hero line is literally about *how clinicians think*. |
| **Nurse** (wards, eMAR, vitals) | Calm, legible, dependable on a 12-hour shift |
| **Lab scientist / radiographer** (lands on Laboratory / Radiology) | Precision, accuracy, clinical rigour |
| **Cashier / finance officer** (lands on Finance) | Accountability, trust, money handled correctly |
| **Administrator** | Control and order |
| **Patient** (lands on My History) | "My information is safe, private and *mine*." Reassuring, not intimidating, not cold. |
| **Regulators / HMOs / partners** | Compliance, standards, interoperability |

Users log in for a fixed **8-hour "shift"** session, so this is everyday work software that people stare at all day. The mark needs to stay pleasant through constant exposure, not be loud.

---

## 5. Market and cultural context

- **Country:** Nigeria, with the head office in Lagos. Currency is the Naira (₦). Patients are identified by NIN.
- **National alignment:** The product is being aligned with the **Nigeria Digital Health Architecture (NDHA)**, the federal blueprint for how health systems should identify patients, code diagnoses and exchange data nationally, and with Nigeria's data protection law (**NDPA**).
- **International posture:** The site positions CareVault as "Built for HIPAA & GDPR-aligned data protection". The brand should look credible beside global EHR vendors, not parochial.
- **Local landscape:** Nigerian private healthcare runs heavily on **HMOs**, cash and wallet payments, and an often patchy infrastructure. A brand that signals *reliability and order* carries real weight here.
- **Opportunity:** A subtle, optional nod to Nigeria (e.g. a green accent in secondary materials) could work, but the primary mark should read as **pan-African and global-ready**, not as a national flag.

---

## 6. Brand personality

| CareVault is… | …but not |
|---|---|
| Trustworthy, secure | Paranoid, cold, bank-like |
| Clinical, precise | Sterile, hospital-gloomy |
| Modern, fast | Trendy, gimmicky, "startup-cute" |
| Calm, confident | Loud, aggressive |
| Caring, human | Soft, childish, overly sentimental |
| Connected, systematic | Complicated, busy |
| Professional and premium | Corporate-generic |

**Three words:** *Secure. Connected. Caring.*

**Voice samples from the current site:**
- "The EHR built for the way clinicians think"
- "Everything your practice needs, nothing it doesn't"
- "Connected to your entire care ecosystem… without the fax machine."
- "A partner, not just a platform"
- "Care delivery, at scale"

---

## 7. Current visual identity, as it exists in code today

There is **no real logo yet**. The current mark is a stock placeholder icon. Everything below is a starting point for a designer to keep, refine or replace.

### 7.1 Current placeholder mark
- A **solid blue (#2563EB) rounded square** (8 px corner radius at 32 × 32 px) holding a **white "HeartPulse" line icon** (from the open-source Lucide icon set: a heart outline with an ECG/heartbeat line through it), stroke weight 2.25.
- Used in the landing **navbar** (32 px tile with a soft blue shadow), the landing **footer**, and as a larger hub tile (blue rounded rectangle, white HeartPulse plus the word "CareVault") in the centre of the interoperability diagram.
- **Favicon:** still the default Next.js `favicon.ico` (16/32 px). **No CareVault favicon exists.**
- No dedicated logo file (SVG/PNG) exists in `/public`.

### 7.2 Current wordmark, which is inconsistent
| Location | Treatment |
|---|---|
| Landing navbar and footer | **Care** in near-black slate (#0F172A) + **Vault** in blue (#2563EB). Bold, tight tracking, ~17 px. |
| Inside the app (top navigation bar) | **Care** in blue (#2563EB) + **Vault** in black. Bold, ~20 px. |

The two halves are coloured the **opposite way round** in the two places. The new identity should settle on one rule. Recommendation: the **Vault** half carries the brand colour, since security is the differentiator. Equally, the designer may decide one colour suits the wordmark better.

### 7.3 Colour palette in use
The UI is built on Tailwind CSS's default palette. The brand reduces to **one blue, a family of cool slate greys, and clinical status colours.**

**Primary: Blue**
| Role | Name | Hex |
|---|---|---|
| **Primary brand colour** (buttons, logo tile, links, eyebrow labels) | blue-600 | `#2563EB` |
| Hover / pressed | blue-700 | `#1D4ED8` |
| Accent text on dark backgrounds | blue-400 | `#60A5FA` |
| Light rings / borders | blue-100 / blue-200 | `#DBEAFE` / `#BFDBFE` |
| Soft tinted fills (icon tiles, avatar chips) | blue-50 | `#EFF6FF` |

**Neutrals: Slate (cool blue-grey)**
| Role | Name | Hex |
|---|---|---|
| Dark sections (stats band, CTA panel) | slate-950 | `#020617` |
| Headlines / primary text | slate-900 | `#0F172A` |
| Body text | slate-600 | `#475569` |
| Muted text | slate-400 / 500 | `#94A3B8` / `#64748B` |
| Hairline borders | slate-200 | `#E2E8F0` |
| Section backgrounds | slate-50 | `#F8FAFC` |
| Page background | white | `#FFFFFF` |

**Semantic / status** (used for clinical states, not brand)
| Meaning | Hex |
|---|---|
| Success, "checked in", verified | emerald-500/600 `#10B981` / `#059669` |
| Waiting, warning | amber-400/700 `#FBBF24` / `#B45309` |
| Critical / error | red family (critical lab results, critical admission severity) |

> **Important:** red is reserved in the UI for *critical clinical alerts*. A red logo, or red as a main brand colour, would clash with that meaning. Avoid it.

### 7.4 Typography
- **Typeface:** **Geist** (by Vercel), a clean, geometric-leaning, neutral sans-serif, plus **Geist Mono** for code/data. Loaded through Google Fonts.
- Headlines are **bold (700) with tight negative tracking** (`tracking-tight`). Eyebrow labels are small, **uppercase, semibold, widely letter-spaced** (0.18–0.2 em) in blue.
- A custom wordmark should sit happily next to Geist, so geometric or neo-grotesque construction is a good match. Avoid high-contrast serifs and scripts.

### 7.5 Shape language
- **Rounded rectangles everywhere:** 8 px (small tiles), 12 px (buttons, inputs, cards), 16 px (feature cards, windows), 24–32 px (large panels).
- **Hairline 1 px borders** and soft, low, diffuse shadows.
- **Pill-shaped status badges** with a soft fill and a hairline ring.
- **Line icons** (Lucide) at **1.75 px stroke**, rounded caps and joins. The logo symbol should feel related to this family: a confident line or solid geometric form with rounded terminals.
- **Background motif:** a faint square **grid** (48–56 px), on both light and dark sections. It reads as "structured data / ledger / blueprint". A logo built on a grid would echo this.
- **Hub-and-spoke diagram:** CareVault sits at the centre with Labs, Pharmacy, Billing, Imaging and HIE (Health Information Exchange) orbiting it on dashed lines. This "centre of the care ecosystem" idea is a strong concept to borrow.

### 7.6 Owner's stated design preferences (important)
- **No gradients.** The owner has explicitly rejected gradients more than once. Use **solid colour**. The logo must be **flat, solid-fill**.
- **But not bland or grey.** When a design was too flat and grey, colour was asked to be put back. Colour should be confident.
- The bar is **"professional, 10/10"**: premium, polished, consistent.
- One consistent design language across every screen: blue primary accent, soft-fill pills, dark patient banners in clinical screens.

---

## 8. Where the logo will live

Design for every one of these. The two hardest are the **16 px favicon** and the **monochrome print** version.

| Context | Size / constraints | Background |
|---|---|---|
| **Browser favicon / tab** | 16 × 16 and 32 × 32 px. Currently missing. | Browser chrome, light or dark |
| **App icon / PWA / home-screen shortcut** for patients | 180 px (Apple), 192/512 px (Android), square with platform rounding | Mask/rounded |
| **Landing page navbar** | ~32 px symbol + ~17 px wordmark | White, and transparent over a pale grid |
| **Footer** | Same lockup | White |
| **Dark sections** (stats band, CTA) | Reversed / white version | Near-black `#020617` |
| **In-app top bar** (staff, all day) | ~20 px wordmark | White |
| **Collapsed sidebar** | Symbol only, ~32 px | Light |
| **Login and sign-up pages** | Larger lockup, the first impression | Light |
| **Interoperability hub graphic** | Symbol + name in a blue tile, white mark | Solid blue `#2563EB` |
| **Printed / PDF documents**: lab results, prescriptions, receipts, invoices, HMO claims, referral letters | Often printed in **black and white** on cheap office printers | Paper |
| **Co-branding with client hospitals** | "Powered by CareVault" next to the hospital's own logo | Varies |
| **Email** (contact form, "CareVault Website" sender) | Email header | White |
| **SMS** | Text only: "CareVault" | n/a |
| **WhatsApp support widget** (on landing page) | Circular avatar crop | Circle |
| **Social** (LinkedIn, Twitter/X links in footer) | Circular and square avatar crops, banner | Varies |
| **Pitch decks, ID badges, signage, merch** | Large | Varies |

### Required versions
1. **Primary lockup:** symbol + wordmark, horizontal
2. **Stacked lockup:** symbol above wordmark
3. **Symbol only:** must work alone at 16 px
4. **Wordmark only**
5. **Colour variants:** full colour on white · white on blue `#2563EB` · white on near-black `#020617` · single-colour black · single-colour white
6. **"Powered by CareVault"** small co-brand lockup
7. Favicon set (`.ico` 16/32, `.svg`), Apple touch icon 180, Android 192/512, social avatar
8. Clear-space and minimum-size rules

---

## 9. Concept territories

Ideas that follow directly from what the product is. These are starting points, not requirements.

### A. "The Protected Heart": care inside security
A heart, pulse or human form **held within a shield, vault outline or C-shaped embrace.** It states the name literally: care, kept safe. The risk is that "heart + shield" is common in health insurance, so it needs a distinctive construction.

### B. "C + V monogram"
A geometric monogram where the **C** wraps or cradles the **V**. The V can double as a **check mark** (verified, safe, done), a **shield point**, or a **downward "store" arrow.** Strong at favicon size and ownable. Suits the bold, tight-tracked typography.

### C. "The Hub": connected care
CareVault as the **centre point** with records flowing in from around it: a core dot or square with radiating nodes, a keyhole-shaped centre, or a ring of segments (the departments) locking around a centre. Borrows directly from the hub-and-spoke diagram on the site. Speaks to interoperability, FHIR and national exchange.

### D. "The Vault Door / Dial", softened
A circular vault-door or combination-dial motif whose **spokes form a medical cross or pulse line**, or whose dial notches become a heartbeat. The risk is that it reads as banking/fintech, so warmth must come from the colour and the clinical detail.

### E. "Folded Record / Keyhole"
A medical record or folder shape whose fold or tab forms a **keyhole** or a **V**: "your record, locked to you." Speaks directly to the patient portal ("My History").

### F. "Grid Cell"
A mark built strictly on the square grid the site already uses: a few filled cells forming a **C**, a **V**, a cross or a shield. Feels like structured data. Pixel-perfect at small sizes.

---

## 10. Things to avoid

- **Gradients**, glows, 3D bevels and glassy effects (explicit owner preference, and the mark must print flat).
- **The red cross on white**, or a red/white cross that resembles it. That emblem is legally protected under the Geneva Conventions, and red also clashes with the app's critical-alert colour.
- **Caduceus / Rod of Asclepius / Star of Life.** Heavily overused, generic, and the caduceus is often used incorrectly for medicine.
- **A plain padlock.** Too cold and generic, and it reads as a cybersecurity product, not care.
- **A literal bank-vault door** with no care signal, which reads as fintech.
- **Thin hairline detail** that disappears at 16 px or on a photocopied lab result.
- **Stock-looking heart-pulse icons.** The current placeholder *is* one, and the new mark must clearly move beyond it.
- **Overly cute or rounded "app" styling** that undermines clinical seriousness.
- **Anything that out-shouts a client hospital's logo** in co-branded contexts.

---

## 11. Practical design criteria checklist

- [ ] Recognisable at **16 × 16 px** (favicon) and in a **circle crop**
- [ ] Works in **one flat colour** (black and white print, fax-quality copies, stamps)
- [ ] Works **reversed** on blue `#2563EB` and on near-black `#020617`
- [ ] **No gradients**, solid fills only
- [ ] Colour harmonises with, or deliberately evolves, the existing **blue-600 `#2563EB`** primary and **slate** neutrals
- [ ] Red is not used as a brand colour
- [ ] Wordmark sits comfortably beside **Geist** body text, and the Care/Vault colour split is resolved consistently
- [ ] Conveys **both** halves of the name: *care* and *security*. Bonus if it also hints at *connection*.
- [ ] Looks credible next to international EHR vendors, and right for a Nigerian/African hospital
- [ ] Calm enough to look at for an 8-hour shift
- [ ] Supplied as **SVG** (master), plus PNGs and the favicon/app-icon set listed in §8

---

## 12. Facts vs. placeholder marketing copy

Some numbers on the current landing page are **placeholder marketing copy** and should be confirmed before they go into any brand material:

- "Join 10,000+ healthcare providers"
- "5,000+ clinics served · across 4 continents"
- "99.99% uptime"
- "Since 2018"
- The "trusted by" names (Northline Health, Beacon Medical, St. Aurelia, CarePoint, Vantage Clinics) and the testimonial from "Dr. Sarah Jenkins, Chief Medical Officer, City General Hospital"

**Verified facts from the code:** Lagos (Magodo) address · `carevault.com.ng` · info@carevault.com.ng · +234 905 669 9774 · Nigerian payments (Paystack, Naira) and HMO workflows · NDHA/NDPA alignment work · ICD-11 coding · FHIR R4 export · audit logging, consent and data-rights tooling · multi-hospital (multi-tenant) platform · patient portal · invitation-only access.

---

## 13. One-paragraph brief (copy-paste version)

> **CareVault** is a modern, cloud-based Electronic Health Record and hospital management platform from Lagos, Nigeria (`carevault.com.ng`). It runs the whole hospital (patient records, appointments, consultations, lab, radiology, pharmacy, wards, vaccinations, billing, insurance/HMO claims) for many hospitals at once, and gives patients a private portal to their own history. The name joins **Care** (clinical, human, warm) with **Vault** (secure, protected, permanent), and the product's edge is that privacy, consent and audit trails are part of its foundation, while connecting every department around one patient record. The brand should feel **secure, connected and caring**: professional, calm, premium and modern, never cold, cute or generic. The current UI uses a solid **blue `#2563EB`** primary colour, cool **slate** greys, the **Geist** sans-serif, rounded rectangles, 1.75 px line icons and a subtle square grid motif. **No gradients.** The logo must be flat and solid, work at 16 px and in single-colour print, sit beside client hospitals' logos, and avoid medical clichés (red cross, caduceus, plain padlock, stock heartbeat icon). Promising directions: a C + V monogram, a heart or person held inside a vault/shield form, or a hub mark expressing connected care.
