import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 }
      );
    }

    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient[0]);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 }
      );
    }

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

    const updatedPatient = await db
      .update(patients)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();

    if (updatedPatient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPatient[0]);
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 }
      );
    }

    const deletedPatient = await db
      .delete(patients)
      .where(eq(patients.id, id))
      .returning();

    if (deletedPatient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Patient deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting patient:", error);

    // Check for foreign key constraint violation
    if (error?.cause?.code === "23503") {
      return NextResponse.json(
        {
          error:
            "Cannot delete patient with existing appointments. Please delete all appointments for this patient first.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
