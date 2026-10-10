# CareVault: test guide for everything shipped so far

This guide is one end-to-end walkthrough. Each stage uses the data created in the stage before it, so work through it **in order**.

Every stage has:
- a short brief on what was built and how;
- numbered steps to follow;
- **✅ Expect:** what you should see if it works.

For the technical detail behind each feature, see [`implementation-roadmap.md`](implementation-roadmap.md).

---

## Stage 0: Before you start

### 0.1 Use a test database, not production
Your `.env` `DATABASE_URL` points at the **production** Neon database. Anything you click while testing creates real records: patients, payments, SMS log entries and audit entries.

**Recommended setup:**
1. In the Neon console, create a branch from `main`, for example `testing`.
2. Copy that branch's connection string into `.env.local` as `DATABASE_URL`. `.env.local` overrides `.env`.
3. Run `npm run dev` and test against that branch. Delete the branch when you're done.

**Careful with `npm run …` scripts** such as `cron:messages` and `db:studio`. They load `.env` through `dotenv`, **not** `.env.local`, so they still hit production. Prefix them with the branch URL, for example:
`DATABASE_URL="<testing-branch-url>" npm run cron:messages`

Branching copies the schema, so every migration that has already run is included. If you test on production instead, create a separate **test organisation** and keep everything inside it.

### 0.2 SMS is safe by default
Unless `SMS_GATEWAY=termii` is set, the SMS gateway is the **mock**. Nothing is sent to phones, and every message just appears in **Org Setup → Messaging → Message log**. That's where you'll check SMS in this guide.

### 0.3 Test accounts
Create these users and roles under **Roles** and **Users** in your test organisation. Several features depend on two *different* people being involved.

| Account | Role permissions | Used for |
|---|---|---|
| **Admin** | everything | setup |
| **Doctor A** | appointments, my-appointments, patient-history, admission | consultations, prescribing, acknowledging critical results |
| **Nurse** | admission (view/edit), patient-history | vitals, giving medicines |
| **Nurse 2** (or any second clinician) | same as Nurse | witness for high-alert drugs |
| **Lab scientist** | laboratory | entering results |
| **Cashier** | finance **view + add** (no edit) | taking payments, opening and closing a shift |
| **Finance supervisor** | finance **view + add + edit** | price lists, claims, signing off shifts |
| **Records officer** | dashboard/patients **view/add/edit/delete** | registering patients, merging duplicates |
| **Patient** | a portal login linked to a test patient | the patient view |

---

## Stage 1: Catalog and setup

### 1.1 HMOs are per organisation, with payer details
**What was built:** each hospital now has its own HMO list instead of one shared global list. Each HMO has payer fields: type (private HMO, NHIA, state scheme or corporate), short code, contact person, phone, email, and the claim submission window in days.

**How:** an `organisationId` column was added to `hmos`, and existing data was split into one copy per organisation. Names are unique within each hospital.

**Test:**
1. As **Admin**, open sidebar **Setup → HMO Setup** and create an HMO, for example *"Test Health HMO"*. Set type *Private HMO*, short code `THH`, a phone number, and a submission window of `30` days.
2. Try to create a second HMO called *"test health hmo"* (same name, different case).
3. Log in as a user in a *different* organisation, if you have one, and open HMO Setup.

✅ **Expect:**
- Step 1 saves.
- Step 2 is refused as a duplicate.
- Step 3 doesn't show your HMO, because each organisation sees only its own list.

### 1.2 VAT on tests and products
**What was built:** every lab test and product has a VAT treatment: zero-rated (the default), standard 7.5%, or exempt. Prices are treated as VAT-inclusive.

**Test:**
1. Open **Org Setup → Test**, edit any test, and look for the VAT field. Leave lab tests zero-rated.
2. Open **Org Setup → Products**, edit a non-drug product, and set VAT to *Standard 7.5%*.

✅ **Expect:** the VAT choice saves and is still selected when you reopen the form.

### 1.3 Structured lab result fields
**What was built:** lab results used to be a file upload only. Each test can now define result fields (for example FBC → Hb, WBC, platelets), each with a unit, normal range (optionally by sex and age) and critical limits. Templates are built in for FBC, malaria, FBS/RBS, E/U/Cr, LFT, lipids, urinalysis, genotype, blood group, HBsAg, HCV and hCG.

**How:** a new `lab_test_parameters` table, plus result values stored per field. The flag (High/Low/Critical) and the reference range that applied are saved with each result, so later range changes don't rewrite history.

**Test:**
1. In **Org Setup → Test**, create or pick a test called **"Full Blood Count"**. Open its **Result fields** button.
2. The modal suggests the FBC template. Load it and save.
3. Do the same for a **"Random Blood Sugar"** test, using the RBS template. Note its critical limits; you'll trigger one in Stage 6.

✅ **Expect:** the fields appear with units, normal ranges and critical low/high values.

### 1.4 Services catalog (new)
**What was built:** a catalog for charges that aren't a lab test or a drug, such as consultations, nursing care, procedures, feeding and registration.

**Test:**
1. Open **Org Setup → Services** and click **Add service**.
2. Add *"Nursing care (daily)"*: category Nursing, ₦2,000.
3. Add *"Specialist consultation"*: category Consultation, ₦10,000.
4. Edit one service, then untick *Available to charge* and save.

✅ **Expect:**
- Both services appear in the list.
- The unticked service shows as *(inactive)*.
- Tick it back on afterwards.

### 1.5 Drug families (for allergy checks)
**What was built:** 16 built-in drug families, such as penicillins, cephalosporins, sulfonamides including SP, NSAIDs, artemisinins and ACE inhibitors. Each family lists the ingredient names that belong to it, and some families cross-react (for example penicillins ↔ cephalosporins). Hospitals can add their own families.

**Test:**
1. Open **Org Setup → Drug Families**.
2. Find *Penicillins* and confirm amoxicillin is a member.

✅ **Expect:** the built-in families are listed and read-only. You can add a custom family.

### 1.6 Ward bed charges (new)
**What was built:** each ward can have a daily bed charge. Bed days are then added to an admitted patient's bill automatically.

**Test:**
1. Open **Admission → Wards & Beds**.
2. Edit a ward (or create *"Test Ward A"* with 2 beds) and set the **daily bed charge** to ₦5,000.
3. Create *"Test Ward B"* with a charge of ₦8,000.

✅ **Expect:** each ward card shows *"₦5,000 / day"* (or ₦8,000 for Test Ward B). Wards without a rate show *"No daily bed charge"*.

### 1.7 SMS messaging settings
**What was built:** a pluggable SMS layer.
- Termii is used for live sending; the mock gateway is the default.
- Each hospital controls a master on/off switch (**off by default**), its sender ID, which automatic messages go out, and the wording of each message.
- It also has a test send and a message log.

**Test:**
1. Open **Org Setup → Messaging** and switch SMS **on**.
2. Enable all the automatic messages: booking confirmation, reminders, results ready and payment receipt.
3. Edit the booking confirmation wording and watch the live preview and the SMS segment count.
4. Do a **test send** to your own phone number.

✅ **Expect:** with the mock gateway, the test appears in the **Message log** as *sent (mock)*. With Termii set up, it arrives on your phone.

---

## Stage 2: HMO price lists (tariffs)

**What was built:** each HMO contract has a tariff schedule, called a price list, with effective dates. Each service on the list has:
- the HMO's price;
- whether it's covered or excluded;
- the patient's co-pay %;
- whether HMO authorization is required.

A single pricing engine (`priceBillItems`) decides for every bill line whether it's self-pay, covered, excluded or not listed, and splits the amount between HMO and patient. The engine now also covers services and bed days.

**Test:**
1. As **Finance supervisor**, open **Finance → HMO Price Lists** and create a list for *Test Health HMO*, effective from today. Choose *seed from self-pay prices*.
2. Open the list. In the tariff editor:
   - Full Blood Count: covered, co-pay **10%**, **requires authorization** ✔.
   - Random Blood Sugar: covered, co-pay 0%.
   - Pick any drug: **excluded**.
   - Use the type filter to switch to **Services**. Set *Nursing care* to covered at ₦1,800.
   - Switch the filter to **Bed charges (per day)**. Set *Test Ward A* to covered at ₦4,000, co-pay 10%.
   - Save.
3. Try to create a *second* active list for the same HMO with overlapping dates.

✅ **Expect:**
- Step 2 saves, and the lines show as listed.
- Step 3 is refused, because only one active tariff is allowed per HMO for any given period.

---

## Stage 3: Patients

### 3.1 Registration and duplicate warning
**What was built:** a duplicate-patient matcher (MPI, master patient index). It scores each pair of records using:
- NIN;
- phone number (last 10 digits);
- date of birth, including day/month swaps;
- name similarity, including sound-alike spellings such as Mohammed / Muhammad;
- sex.

A pair scores as *likely* at 70 or above and *possible* at 50–69. The warning appears at registration.

**Test:**
1. As **Records officer**, register *"Chinedu Okafor"*: male, DOB 12/03/1990, phone 08031234567. Give him HMO *Test Health HMO*, membership no. `THH-0001`, and NIN `12345678901`.
2. Register a second patient, *"Chinedu Okafo"*: same DOB and phone, no NIN.
3. Register *"Ngozi Okafor"*: same surname and phone, different DOB.

✅ **Expect:**
- Step 2 shows a **likely duplicate** warning, with the score, the reasons and a link to the existing record. You can still save it, so do; you'll merge it in 3.5.
- Step 3 scores much lower. A clearly different first name counts against a match, which helps tell siblings apart.

### 3.2 Patients table
**What was built:** first and last name now share one column, and the name links to the patient's history. A new column shows whether the patient is currently admitted, with their ward and bed.

**Test:**
1. Open **Patients** and click *Chinedu Okafor's* name.

✅ **Expect:** it opens `/patients/{id}/history`. The admission column is blank for now; you'll admit him in Stage 8.

### 3.3 HMO coverage (enrollee record) and eligibility
**What was built:** a full coverage record per patient.
- Each coverage holds the membership number, plan, principal or dependant, validity dates, and status (active, suspended or ended). Only one coverage can be active at a time.
- Eligibility checks are logged with channel, result and HMO reference.
- Coverage counts as **stale** when there has been no "eligible" check in the last 30 days. You can change that window per hospital.
- If coverage is suspended or expired, the patient is billed self-pay.

**Test:**
1. Open Chinedu's **View** modal and go to the coverage panel.
2. Click **Log eligibility check**: channel *Phone*, result *Eligible*, reference `REF-1`.
3. Suspend the coverage, then reactivate it.

✅ **Expect:** the coverage shows the latest check. While it's suspended, his bill lines would price as self-pay.

### 3.4 Allergies, conditions, weight, other identifiers and SMS opt-out
**What was built:**
- **Allergies:** a structured list. Each entry is a drug, drug family, food, environment or other, marked as allergy or intolerance, with reaction, severity and certainty.
- **Allergy status:** not assessed, NKDA or has allergies.
- **Problem list:** coded with ICD-11.
- **Weight and height:** BMI is calculated.
- **Other identifiers:** legacy MRN, NHIA number, passport and similar.
- **SMS opt-out**, plus sending a one-off SMS.

**Test:**
1. In Chinedu's View, open the clinical record panel:
   - Add allergy: drug family **Penicillins**, reaction *rash*, severity *moderate*, confirmed.
   - Add condition: *Hypertension* (ICD-11 search), active.
   - Add weight: 78 kg, height 175 cm.
2. Under **Other identifiers**, add *Previous hospital number* `OLD-555`.
3. Try to add the same `OLD-555` to Ngozi.
4. Use **Send SMS** to send a one-off message to Chinedu.

✅ **Expect:**
- A **red allergy banner** ("Penicillins — rash") on his record.
- BMI is shown.
- Step 3 is refused as a likely duplicate.
- The SMS appears in the Message log.

### 3.5 Merge duplicates, and undo
**What was built:**
- **Merge:** one transaction that re-points **every** table holding a patient ID, from visits and payments to wallet, allergies and vitals. It fills the survivor's blank fields, keeps the old MRN as a legacy identifier, and leaves a "merged into" link on the old record.
- **Undo:** reverses exactly what was moved.
- **Refusal:** two records with different NINs can't be merged.

**Test:**
1. As **Records officer**, open **Patients → Duplicates**. The Chinedu Okafor / Okafo pair should be at the top.
2. Click **Merge**, keep *Chinedu Okafor* as the survivor, and give a reason.
3. Open the merged record's old URL.
4. Click **Undo merge** and give a reason.
5. Merge them again; you'll keep the merged state.
6. On another pair, click **Different people**.

✅ **Expect:**
- Step 3 shows "merged into …" with a link.
- After undo, both records are back as they were.
- The pair marked *Different people* no longer appears in the list.

---

## Stage 4: Appointment, consultation and prescribing safety

### 4.1 Booking confirmation and reminder SMS
**Test:**
1. Book an appointment for Chinedu with **Doctor A** for tomorrow.
2. Check the **Message log**.
3. Run the reminder job: `DATABASE_URL="<testing-branch-url>" npm run cron:messages` (see 0.1).

✅ **Expect:**
- Step 2 shows a *booking confirmation*.
- Step 3 sends the **day-before reminder**, which says "tomorrow".
- Running the cron again sends **nothing new**, because each message goes at most once.

### 4.2 Consultation: diagnosis goes to the problem list
**Test:**
1. As **Doctor A**, open **My Appointments**, start the consultation, and add the diagnosis *Malaria*. Tick **Ongoing**, then save.

✅ **Expect:** the allergy/conditions banner shows at the top of the consultation. After saving, *Malaria* appears on Chinedu's problem list.

### 4.3 Drug-allergy alert (clinical decision support)
**What was built:** when a drug is prescribed, the server checks it against the patient's allergies.
- **Critical:** the same ingredient, or the same drug family.
- **Warning:** a family that cross-reacts, or an allergy status that has never been recorded.

The prescription is **refused** until the doctor picks an override reason, and every override is logged.

**Test:**
1. In the same consultation, prescribe **Amoxicillin**.
2. Cancel, and prescribe a **cephalosporin** such as ceftriaxone instead.
3. Prescribe something unrelated, such as paracetamol.
4. For a patient whose allergy status is *not assessed*, prescribe anything.

✅ **Expect:**
- Step 1 shows a **critical** alert ("allergic to Penicillins"). You can't submit until you pick a reason; then submit.
- Step 2 shows a **warning** (cross-reactivity).
- Step 3 shows no alert.
- Step 4 shows a warning that allergies haven't been recorded. Choosing *"Asked the patient — no known allergies"* also sets their status to NKDA.

---

## Stage 5: HMO authorizations (pre-auth codes)

**What was built:** an authorization log with the NHIA rule that the HMO must respond within 60 minutes.
- **Raised automatically:** ordering a covered service whose tariff says *requires authorization* creates a pending request.
- **The timer** starts when the request is **sent** to the HMO, not when it was raised.
- **Codes:** recorded here, or typed at the payment desk.
- **Declined:** the item becomes **self-pay** until the HMO approves it.

**Test:**
1. As **Doctor A**, order **Full Blood Count** and **Random Blood Sugar** for Chinedu.
2. As **Finance supervisor**, open **Finance → Authorizations**.
3. On the FBC request, click **Mark sent** (channel *Phone*) and watch the timer.
4. Click **Record code**: `AUTH-001`, valid until a week from today.
5. Order a second FBC. On its authorization, click **Declined**, with reason *"not covered on plan"*.
6. Open **Finance → Lab Requests** and look at the second FBC's billing cell.
7. Click **Export CSV**.

✅ **Expect:**
- Step 2 shows *one* pending request for FBC only, marked *not sent*. RBS doesn't need authorization.
- Step 3: the timer runs, and after 60 minutes the request is flagged as over the SLA.
- Step 6: the declined FBC shows **self-pay** at full price. Entering a new code at the desk switches it back to HMO billing.
- Step 7 downloads the full log.

---

## Stage 6: Lab results and critical alerts

**What was built:**
- **Result entry:** structured values with live High/Low/Critical flags.
- **Critical alerts:** a value past a critical limit raises an alert to the ordering doctor.
  - The doctor sees a **red bar on every page** until they acknowledge it with an action note.
  - The lab sees alerts waiting for acknowledgement, flagged *overdue* after 30 minutes.
- **Portal:** the patient doesn't see that result until the doctor has acknowledged it.
- **SMS:** a "results ready" text is sent, but held back while a critical alert is open.

**Test:**
1. As **Lab scientist**, open **Laboratory** and find Chinedu's FBC. Click **Enter results** and type normal values, with one high value.
2. For the **RBS**, enter a value **above the critical high limit** and save.
3. Log in as **Patient** and open *My History → Test Results*.
4. Log in as **Doctor A**.
5. Acknowledge the alert with an action, for example *"Called ward, insulin started"*.
6. Check the patient portal and the Message log again.
7. As **Lab scientist**, correct the RBS to a normal value.

✅ **Expect:**
- Step 1: values are colour-flagged as you type. The FBC result appears in his history as a table.
- Step 2: *Critical results awaiting doctor acknowledgement* appears on the Laboratory page.
- Step 3: the RBS shows *"Being reviewed by your doctor"*, and no "results ready" SMS has been sent for it yet.
- Step 4: a **red bar** at the top of every page, and a bell entry saying "CRITICAL RESULT …".
- Step 5: the bar clears.
- Step 6: the value is now visible to the patient, and the results SMS has been logged.
- Step 7: the correction is recorded with an amended time, and the alert stays closed.

---

## Stage 7: Cashier shift and desk payments

**What was built:** a cash drawer process.
- **Opening:** the cashier opens a **shift** with a starting float.
- **Taking payments:** every desk payment records the amount, cash/POS/transfer and an optional POS slip reference, and is tied to the shift.
- **HMO patients:** the desk collects only the co-pay, and the HMO's share is recorded as a receivable.
- **Closing:** the cashier counts the drawer. Any difference needs a note and a **supervisor's sign-off**, and nobody can sign off their own shift.

**Test:**
1. As **Cashier**, open **Finance**. The top bar says **No open shift**. Click **Open shift** and enter a float of ₦5,000.
2. Open the **Lab Requests** tab. On Chinedu's FBC (HMO, 10% co-pay, code AUTH-001), click **Mark as paid**.
3. Choose **Cash** and confirm.
4. On the **declined** FBC (self-pay), click Mark as paid. Choose **POS** and enter slip reference `000123456`.
5. On Ngozi or another self-pay patient's item, click Mark as paid and choose **Bank transfer**.
6. Check the **"My shift"** bar.
7. Open the **Payments** tab.
8. Click **Close shift**. Enter cash **₦1,000 less** than expected, with POS and transfer exactly as expected.
9. Add a note and close.
10. Still as Cashier, open **Finance → Shifts** and open the shift.
11. As **Finance supervisor**, open **Finance → Shifts**. Open the shift, write a sign-off note and click **Sign off**.
12. Click **Print cash-up**.
13. As Cashier, open a shift, then log in as Finance supervisor. Open the cashier's open shift in **Shifts** and close it for them.

✅ **Expect:**
- Step 2: the dialog shows the payer as the HMO, the HMO tariff, the amount billed to the HMO, and **"Collect from patient"** (the 10% co-pay). It asks how the patient paid.
- Step 6: the cash, POS and transfer totals match what you took.
- Step 7: the new payments show method **"Desk · Cash"**, **"Desk · POS"** and so on.
- Step 8: the cash line shows **"Short ₦1,000"** in red, and a note is required.
- Step 9: the status is **Awaiting sign-off**.
- Step 10: the Cashier can't sign off their own shift.
- Step 11: the sign-off box appears, and after signing the status is **Signed off**, with the supervisor's name.
- Step 12: a printable sheet with every payment and signature lines.
- Step 13: the supervisor can close another cashier's shift.

**Also try:**
- Close the shift and try to mark something paid. The dialog asks you to open a shift, and you can do it right there.
- Mark paid an item billed **100% to the HMO** (co-pay 0%, for example RBS). No payment type or shift is needed.

---

## Stage 8: Admission, the inpatient record and the inpatient bill

### 8.1 Admit and check the patients table
**Test:**
1. Admit Chinedu to **Test Ward A**, with the admission date set **3 days ago** if the form allows. Otherwise admit him today.
2. Open **Patients**.

✅ **Expect:** the admission column shows *Test Ward A · Bed …*, and clicking it opens the admission drawer.

### 8.2 Vitals and early-warning score (NEWS2 / MEOWS / paediatric)
**What was built:** a vitals chart that scores each set as it's typed.
- **NEWS2:** the standard UK adult early-warning score.
- **MEOWS:** for pregnant or postpartum patients.
- **Paediatric:** an interim score for under-16s.

The form shows the required action and next due time. When escalation is needed, it asks who was informed.

**Test:**
1. As **Nurse**, open the admission drawer and go to Observations. Enter normal vitals.
2. Enter a new set: RR 25, SpO₂ 91%, BP 95/60, pulse 120, temperature 38.9, ACVPU *Alert*.
3. Open the **Admissions** list.

✅ **Expect:**
- Step 1: score 0–1, next set due in 12 hours.
- Step 2: the boxes turn amber and red as you type. The score is high (7 or more), the form says urgent or emergency response is needed, and it asks *"Who did you inform?"*.
- Step 3: the *Obs / score* column shows the score and when the next set is due.

### 8.3 eMAR (medication administration record)
**What was built:** inpatient prescriptions carry a dose, route and frequency (OD, BD, TDS, QDS, PRN and so on). The drug chart works out the dose times from the ward round times, and each dose is recorded as given, held, refused, not available or missed.

Safety rules:
- A dose can't be recorded twice.
- Anything other than *given* needs a reason.
- PRN doses enforce the 24-hour maximum and the minimum gap between doses.
- A stopped drug can't be given.
- **High-alert medicines** (insulin, opioids, potassium, heparin, oxytocin and others) need a **second staff member as witness**.

**Test:**
1. As **Doctor A**, open the drawer's **Medication chart** and click **Prescribe**:
   - Paracetamol 1 g PO **QDS**, 5 days.
   - Paracetamol 1 g PO **PRN**, max 4 doses in 24 hours, minimum 4 hours apart.
   - **Insulin** (soluble) 6 units SC **TDS**.
2. As **Nurse**, record the due paracetamol dose as **Given**, ticking the five-rights box.
3. Record the next dose as **Held** without a reason.
4. Give the PRN dose, then try to give it again straight away.
5. Give the insulin dose: first without a witness, then with **Nurse 2** as witness.
6. As Doctor, **Stop** the QDS paracetamol, then try to give it.
7. **Undo** a given dose, with a reason.

✅ **Expect:**
- Step 3: refused until you give a reason.
- Step 4: the second PRN dose is refused (minimum interval).
- Step 5: refused without a witness; saved with Nurse 2.
- Step 6: refused, because the drug is stopped.
- The dose times show as coloured chips, and the Admissions list *Meds* column shows doses due or overdue.

### 8.4 Inpatient bill (new)
**What was built:** every admission has a running bill.
- **Bed days** are added automatically: one per calendar day (Lagos time), at the rate of the ward the patient was in that night. The discharge day counts only if the patient leaves at **noon or later**.
- **Also on the bill:** services you add, plus every test and drug from the stay. HMO tariffs and co-pays apply to every line.
- **Actions:** mark lines paid, waive (reason required), remove (reason required), pay the whole bill from the wallet, or print.

**Test:**
1. Open the admission drawer and go to the **Bill** section.
2. Click **Add service** → *Nursing care*, quantity 2.
3. **Mark paid** on one bed day as **Cashier**, using an open shift and Cash.
4. **Waive** another bed day, with reason *"Approved by MD — staff relative"*.
5. **Remove** a line, with reason *"charged in error"*. Reload the bill.
6. Top up Chinedu's wallet: patient portal → Wallet, or a bank transfer you confirm in Finance → Payments. Then click **Settle from wallet**.
7. Click **Print bill**.
8. Open **Finance → Inpatient bills**.

✅ **Expect:**
- Step 1: one bed day per day of the stay, priced at the **HMO tariff** (₦4,000 with a 10% co-pay, because Ward A is on his tariff). The lab tests and drugs from the stay are also listed. Totals show gross, HMO share, patient share, paid and outstanding.
- Step 2: the line is priced at the HMO tariff of ₦1,800 each.
- Step 3: the payment appears in your shift.
- Step 5: the removed bed day does **not** come back.
- Step 6: the outstanding balance drops to ₦0, a payment receipt SMS is logged, and the wallet balance goes down.
- Step 7: a consolidated bill.
- Step 8: Chinedu is listed with his balance.

**Transfer test:** transfer him to **Test Ward B** (₦8,000, not on the HMO tariff). Tomorrow's bed day is charged at the Ward B rate and the **self-pay** price, because Ward B isn't on his tariff.

### 8.5 Discharge with an outstanding balance
**Test:**
1. Add another service so that the bill has an outstanding balance.
2. Click **Discharge**.
3. Discharge without a note.
4. Enter a note, for example *"Family to pay Friday"*, and discharge.
5. If it's before noon, reopen the bill.

✅ **Expect:**
- Step 2: the modal shows the **outstanding amount**.
- Step 3: refused.
- Step 4: accepted. The note and amount are saved, and Chinedu stays on **Finance → Inpatient bills** as *discharged, still owes*.
- Step 5: **today's bed day has been removed**.

---

## Stage 9: Monthly HMO claims

**What was built:** claim batches per HMO per month, built from every HMO share recorded so far.

Pre-submission checks:
- **Errors:** missing or expired authorization code, missing membership number.
- **Warnings:** no diagnosis, past the submission window, eligibility not verified, possible duplicate lines.

After submission you post the HMO's response line by line: paid, part-paid, queried or rejected. An ageing table shows outstanding amounts at 0–30, 31–60, 61–90 and 90+ days.

**Test:**
1. As **Finance supervisor**, open **Finance → Claims**. Click **New claim**: *Test Health HMO*, this month.
2. Review the checks on each line.
3. Remove a line, then add it back.
4. Export the CSV and print the claim form.
5. **Submit** the batch.
6. Post the responses: one line **paid in full**, one **part-paid**, one **rejected** (reason required), one **queried**, then **answer the query** and mark that line paid.
7. Look at the ageing table.
8. Open **Finance → HMO Billing**.

✅ **Expect:**
- Step 1: the draft contains Chinedu's FBC, RBS, nursing care and bed days.
- Step 2: the FBC with AUTH-001 passes. A line with no code where one is required shows an **error**.
- Step 5: the batch submits, or asks you to confirm if errors remain. Its lines become *claimed*.
- Step 6: the batch **closes automatically** once every line is paid or rejected.
- Step 7: amounts outstanding by HMO and age.
- Step 8: the HMO receivables. The bulk buttons don't change lines that are already in a claim.

---

## Stage 10: Patient portal

**Test:**
1. Log in as **Patient** (Chinedu) and open **My History**.
2. Check **Pending Payment**.
3. Check the **My allergies & conditions** card.
4. Check **Test Results**.

✅ **Expect:**
- Step 2: only the patient's **co-pay** is due on HMO items. Fully covered items say *covered by your HMO* and can't be selected for payment. Declined-authorization items show the full self-pay price.
- Step 3: penicillin allergy, hypertension and malaria, read-only.
- Step 4: the FBC and RBS appear as tables with their flags.

---

## Stage 11: Audit trail

Almost every action above writes to the audit log, including these:

| Area | What's logged |
|---|---|
| Prescribing | allergy overrides |
| Patients | merges and undos |
| Authorizations | changes |
| Medication chart | undone doses |
| Inpatient bill | waivers, removed charges, discharge with a balance |
| Cashier shifts | open, close, sign-off |
| HMO billing | claim submissions and responses |
| Messaging | messages sent |

**Test:** the app has no audit-log screen yet. Run `npm run db:studio`, open the `audit_logs` table, and filter by today's date.

✅ **Expect:** each action has a row with the user, time, entity and details, such as the reason or note you typed.

---

## Quick reference: where things live

| Feature | Where in the app |
|---|---|
| HMOs and payer details | Setup → HMO Setup |
| Test result fields, VAT | Org Setup → Test |
| Product VAT | Org Setup → Products |
| Services | Org Setup → Services |
| Drug families | Org Setup → Drug Families |
| SMS settings and log | Org Setup → Messaging |
| Ward bed charges | Admission → Wards & Beds |
| Price lists / tariffs | Finance → HMO Price Lists |
| Coverage, eligibility, identifiers, allergies, SMS opt-out | Patients → View |
| Duplicate patients | Patients → Duplicates |
| Authorizations | Finance → Authorizations |
| Desk payments, shifts | Finance (top bar), Finance → Shifts |
| Inpatient bills | Admission drawer → Bill; Finance → Inpatient bills |
| Claims | Finance → Claims |
| HMO receivables | Finance → HMO Billing |
| Vitals, eMAR | Admission drawer, Patient history |
| Critical results | Red bar (doctor); Laboratory / Radiology page (lab) |
| Reminder job | `npm run cron:messages` (or `POST /api/cron/messages/process`) |

## Known gaps (not bugs)

These are documented as "not done yet" in the roadmap, so don't log them as failures:
- outpatient visit bills;
- admission deposits;
- transfer receipt uploads;
- refunds;
- WhatsApp;
- SMS delivery reports;
- a ward board view;
- barcode scanning at the bedside;
- verifying NIN with NIMC;
- a pharmacy allergy re-check at dispensing;
- per-HMO claim file formats.
