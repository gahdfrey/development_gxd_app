import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, users, roles } from "@/lib/db/schema";
import { desc, asc, or, ilike, and, gte, lte, eq, isNull } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
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
      conditions.push(or(ilike(patients.firstname, searchTerm), ilike(patients.lastname, searchTerm)));
    }

    let query = db.select({
      id: patients.id,
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
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      firstname, lastname, gender, dob, maidenName, email,
      countryCode, phone, insuranceType, hmoId, policyNumber,
      nextOfKinFirstname, nextOfKinLastname, nextOfKinRelationship,
      nextOfKinAddress, nextOfKinPhone, nextOfKinEmail,
    } = body;

    if (!firstname || !lastname || !gender || !dob || !countryCode || !phone || !insuranceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const [newPatient] = await db
      .insert(patients)
      .values({
        organisationId: orgId,
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
