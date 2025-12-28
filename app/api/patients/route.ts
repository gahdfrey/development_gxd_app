import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allPatients = await db
      .select()
      .from(patients)
      .orderBy(desc(patients.createdAt));

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
