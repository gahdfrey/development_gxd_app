import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { requestResults, requests, notifications, patients, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// POST /api/requests/[id]/result — upload a result file for a request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const requestId = parseInt(idParam);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    // Verify the request exists and is paid
    const [existingRequest] = await db
      .select({ id: requests.id, paymentStatus: requests.paymentStatus })
      .from(requests)
      .where(eq(requests.id, requestId));

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existingRequest.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Cannot upload result for an unpaid request" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const message = (formData.get("message") as string | null) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, image, or Word document." },
        { status: 400 },
      );
    }

    // Max 20 MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must not exceed 20 MB" },
        { status: 400 },
      );
    }

    // Upload file to Vercel Blob (works in serverless / production)
    const safeOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobName = `results/${requestId}-${Date.now()}-${safeOriginal}`;

    console.log("[upload] BLOB_READ_WRITE_TOKEN present:", !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log("[upload] uploading blob:", blobName, "type:", file.type, "size:", file.size);

    const blob = await put(blobName, file, {
      access: "private",
      contentType: file.type,
    });

    console.log("[upload] blob upload successful:", blob.url);

    const relativePath = blob.url;

    const uploadedById = (session.user as any).id;

    const [result] = await db
      .insert(requestResults)
      .values({
        requestId,
        fileName: file.name,
        filePath: relativePath,
        fileType: file.type,
        message: message || null,
        uploadedBy: parseInt(uploadedById),
      })
      .returning();

    // Mark request status as completed
    await db
      .update(requests)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(requests.id, requestId));

    // Create notification for the doctor who raised this request
    try {
      const [requestDetail] = await db
        .select({
          requestedBy: requests.requestedBy,
          patientFirstname: patients.firstname,
          patientLastname: patients.lastname,
          departmentName: departments.name,
        })
        .from(requests)
        .leftJoin(patients, eq(requests.patientId, patients.id))
        .leftJoin(departments, eq(requests.departmentId, departments.id))
        .where(eq(requests.id, requestId));

      if (requestDetail) {
        await db.insert(notifications).values({
          userId: requestDetail.requestedBy,
          requestId,
          patientFirstname: requestDetail.patientFirstname,
          patientLastname: requestDetail.patientLastname,
          departmentName: requestDetail.departmentName,
          message: message || null,
          isRead: false,
        });
      }
    } catch (notifErr) {
      // Non-fatal: log but don't fail the upload
      console.error("Failed to create notification:", notifErr);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[upload] Error uploading result:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to upload result", detail: message },
      { status: 500 },
    );
  }
}

// GET /api/requests/[id]/result — list results for a request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const requestId = parseInt(idParam);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const results = await db
      .select()
      .from(requestResults)
      .where(eq(requestResults.requestId, requestId));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 },
    );
  }
}
