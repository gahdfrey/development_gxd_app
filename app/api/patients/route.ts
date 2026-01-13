import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { desc, asc, or, ilike, and, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build base query
    let query = db.select().from(patients);

    // Build WHERE conditions
    const conditions = [];

    // Add date range filtering (by createdAt)
    if (startDate) {
      conditions.push(gte(patients.createdAt, new Date(startDate)) as any);
    }
    if (endDate) {
      // Add one day to endDate to include the entire end date
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(lte(patients.createdAt, endDateTime) as any);
    }

    // Add search filter if search parameter exists
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(patients.firstname, searchTerm),
          ilike(patients.lastname, searchTerm)
        ) as any
      );
    }

    // Apply conditions if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply ordering
    const allPatients =
      orderBy === "asc"
        ? await query.orderBy(asc(patients.firstname))
        : orderBy === "desc"
        ? await query.orderBy(desc(patients.firstname))
        : await query.orderBy(desc(patients.createdAt));

    return NextResponse.json(allPatients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstname,
      lastname,
      gender,
      dob,
      maidenName,
      countryCode,
      phone,
      insuranceType,
      hmoId,
      policyNumber,
    } = body;

    if (
      !firstname ||
      !lastname ||
      !gender ||
      !dob ||
      !countryCode ||
      !phone ||
      !insuranceType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate HMO fields when insurance type is "hmo"
    if (insuranceType === "hmo") {
      if (!hmoId) {
        return NextResponse.json(
          { error: "HMO selection is required for HMO insurance type" },
          { status: 400 }
        );
      }
      if (!policyNumber || policyNumber.trim() === "") {
        return NextResponse.json(
          { error: "Policy number is required for HMO insurance type" },
          { status: 400 }
        );
      }
    }

    const newPatient = await db
      .insert(patients)
      .values({
        firstname,
        lastname,
        gender,
        dob,
        maidenName: maidenName || null,
        countryCode,
        phone,
        insuranceType,
        hmoId: hmoId ? parseInt(hmoId) : null,
        policyNumber: policyNumber || null,
      })
      .returning();

    return NextResponse.json(newPatient[0], { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
