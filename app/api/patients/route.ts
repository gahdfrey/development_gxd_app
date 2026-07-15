import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, users, roles, patientConsents } from "@/lib/db/schema";
import { desc, asc, or, ilike, and, gte, lte, eq, isNull } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions: any[] = [
      eq(patients.organisationId, orgId),
      isNull(patients.deletedAt),
    ];

    if (startDate) conditions.push(gte(patients.createdAt, new Date(startDate)));
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(lte(patients.createdAt, endDateTime));
    }
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(or(
        ilike(patients.firstname, searchTerm),
        ilike(patients.lastname, searchTerm),
        ilike(patients.mrn, searchTerm),
        ilike(patients.nin, searchTerm),
      ));
    }

    let query = db.select({
      id: patients.id,
      mrn: patients.mrn,
      nin: patients.nin,
      firstname: patients.firstname,
      lastname: patients.lastname,
      gender: patients.gender,
      dob: patients.dob,
      countryCode: patients.countryCode,
      phone: patients.phone,
      insuranceType: patients.insuranceType,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
    }).from(patients).where(and(...conditions)) as any;

    const allPatients =
      orderBy === "asc"
        ? await query.orderBy(asc(patients.firstname))
        : orderBy === "desc"
          ? await query.orderBy(desc(patients.firstname))
          : await query.orderBy(desc(patients.createdAt));

    return NextResponse.json(allPatients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authz = await requirePermission([["patients", "add"], ["dashboard", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const {
      firstname, lastname, gender, dob, maidenName, email,
      countryCode, phone, insuranceType, hmoId, policyNumber,
      nextOfKinFirstname, nextOfKinLastname, nextOfKinRelationship,
      nextOfKinAddress, nextOfKinPhone, nextOfKinEmail,
      consentGiven, nin, allowDuplicate,
    } = body;

    if (!firstname || !lastname || !gender || !dob || !countryCode || !phone || !insuranceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // NDPA 2023: personal health data may only be processed with recorded
    // consent. The registering staff member confirms the patient consented.
    if (consentGiven !== true) {
      return NextResponse.json(
        { error: "Patient consent to data processing is required to register a patient" },
        { status: 400 },
      );
    }

    if (insuranceType === "hmo") {
      if (!hmoId) return NextResponse.json({ error: "HMO selection is required for HMO insurance type" }, { status: 400 });
      if (!policyNumber?.trim()) return NextResponse.json({ error: "Policy number is required for HMO insurance type" }, { status: 400 });
    }

    if (email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (nextOfKinEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextOfKinEmail)) return NextResponse.json({ error: "Invalid next of kin email address" }, { status: 400 });
    }

    if (email?.trim()) {
      const [existingPortalUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email.trim()), eq(users.organisationId, orgId)))
        .limit(1);
      if (existingPortalUser) {
        return NextResponse.json(
          { error: "This email is already registered. Use a different email or leave the field blank." },
          { status: 409 },
        );
      }
    }

    // NIN: Nigeria's National Identification Number is 11 digits (NDHA/NHCR
    // patient identification anchor). Optional, since not everyone has one yet.
    const cleanNin = typeof nin === "string" && nin.trim() !== "" ? nin.trim() : null;
    if (cleanNin && !/^\d{11}$/.test(cleanNin)) {
      return NextResponse.json(
        { error: "NIN must be exactly 11 digits" },
        { status: 400 },
      );
    }

    const activePatientInOrg = and(
      eq(patients.organisationId, orgId),
      isNull(patients.deletedAt),
    );

    // Hard block: a NIN uniquely identifies one person — a second active
    // record with the same NIN is by definition a duplicate (one patient,
    // one health record).
    if (cleanNin) {
      const [ninMatch] = await db
        .select({ id: patients.id, mrn: patients.mrn, firstname: patients.firstname, lastname: patients.lastname })
        .from(patients)
        .where(and(activePatientInOrg, eq(patients.nin, cleanNin)))
        .limit(1);
      if (ninMatch) {
        return NextResponse.json(
          {
            error: `A patient with this NIN is already registered (${ninMatch.firstname} ${ninMatch.lastname}, ${ninMatch.mrn}). Open the existing record instead of creating a duplicate.`,
            duplicateType: "nin",
            matches: [ninMatch],
          },
          { status: 409 },
        );
      }
    }

    // Soft warn (CRF-1/2 duplicate detection): same phone number, or same
    // name + date of birth. Staff can override with allowDuplicate after
    // confirming it is genuinely a different person.
    if (allowDuplicate !== true) {
      const potentialMatches = await db
        .select({
          id: patients.id,
          mrn: patients.mrn,
          firstname: patients.firstname,
          lastname: patients.lastname,
          dob: patients.dob,
          phone: patients.phone,
          countryCode: patients.countryCode,
        })
        .from(patients)
        .where(and(
          activePatientInOrg,
          or(
            and(eq(patients.phone, phone), eq(patients.countryCode, countryCode)),
            and(
              ilike(patients.firstname, firstname.trim()),
              ilike(patients.lastname, lastname.trim()),
              eq(patients.dob, dob),
            ),
          ),
        ))
        .limit(5);

      if (potentialMatches.length > 0) {
        return NextResponse.json(
          {
            error: "Possible duplicate patient found",
            duplicateWarning: true,
            matches: potentialMatches,
          },
          { status: 409 },
        );
      }
    }

    const [newPatient] = await db
      .insert(patients)
      .values({
        organisationId: orgId,
        nin: cleanNin,
        firstname, lastname, gender, dob,
        maidenName: maidenName || null,
        email: email?.trim() || null,
        countryCode, phone, insuranceType,
        hmoId: hmoId ? parseInt(hmoId) : null,
        policyNumber: policyNumber || null,
        nextOfKinFirstname: nextOfKinFirstname || null,
        nextOfKinLastname: nextOfKinLastname || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
        nextOfKinAddress: nextOfKinAddress || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinEmail: nextOfKinEmail || null,
      })
      .returning();

    // Assign the local Medical Record Number (unique per facility).
    const mrn = `MRN-${orgId}-${String(newPatient.id).padStart(6, "0")}`;
    await db.update(patients).set({ mrn }).where(eq(patients.id, newPatient.id));
    newPatient.mrn = mrn;

    if (allowDuplicate === true) {
      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "duplicate.override",
        entityType: "patient",
        entityId: newPatient.id,
        details: { firstname, lastname, dob, reason: "staff confirmed different person" },
      });
    }

    // Record the consent that authorised this registration.
    await db.insert(patientConsents).values({
      organisationId: orgId,
      patientId: newPatient.id,
      purpose: "care_delivery",
      informationTypes: ["demographics", "clinical_records", "insurance_details"],
      status: "granted",
      recordedBy: actorId,
      notes: "Consent to collection and processing of personal health data for care delivery, recorded at registration.",
    });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "patient",
      entityId: newPatient.id,
      details: { firstname, lastname, insuranceType },
    });
    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "consent.granted",
      entityType: "patient_consent",
      entityId: newPatient.id,
      details: { purpose: "care_delivery" },
    });

    if (email?.trim()) {
      try {
        const baseUsername = `${firstname.toLowerCase().trim()}.${lastname.toLowerCase().trim()}`;
        const [patientRole, existingUsername, hashedPassword] = await Promise.all([
          db.select({ id: roles.id }).from(roles)
            .where(and(ilike(roles.name, "patient"), eq(roles.organisationId, orgId)))
            .limit(1).then(r => r[0]),
          db.select({ id: users.id }).from(users)
            .where(and(eq(users.username, baseUsername), eq(users.organisationId, orgId)))
            .limit(1).then(r => r[0]),
          bcrypt.hash("Password1", 10),
        ]);

        const username = existingUsername ? `${baseUsername}${newPatient.id}` : baseUsername;

        await db.insert(users).values({
          organisationId: orgId,
          firstname, lastname, username,
          email: email.trim(),
          password: hashedPassword,
          roleId: patientRole?.id ?? null,
          patientId: newPatient.id,
        });
      } catch (portalErr) {
        console.warn("Could not create patient portal account:", portalErr);
      }
    }

    return NextResponse.json(newPatient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}
