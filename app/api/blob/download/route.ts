import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestResults, requests } from "@/lib/db/schema";
import { requireAuth } from "@/lib/authz";

/**
 * GET /api/blob/download?url=<encoded_blob_url>&dl=1 (optional dl param forces download)
 *
 * Proxies private Vercel Blob content through the server so:
 *  - Images display inline in <img> tags
 *  - PDFs render inside <iframe> elements
 *  - Download links trigger a file save (when ?dl=1 is passed)
 *
 * Only serves files recorded as request results, and only to staff of the
 * owning facility or the patient the result belongs to. The URL is never
 * fetched otherwise, so the Blob token can't be sent to an arbitrary host.
 */
export async function GET(request: NextRequest) {
  const authz = await requireAuth();
  if (authz.error) return authz.error;
  const { orgId, patientId, isPlatformAdmin } = authz.ctx;

  const blobUrl = request.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Optional: ?dl=1 forces Content-Disposition: attachment (browser download)
  const forceDownload = request.nextUrl.searchParams.get("dl") === "1";

  let host: string;
  try {
    const parsed = new URL(blobUrl);
    if (parsed.protocol !== "https:") throw new Error("not https");
    host = parsed.hostname;
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (!host.endsWith(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const [file] = await db
    .select({
      fileName: requestResults.fileName,
      organisationId: requests.organisationId,
      patientId: requests.patientId,
    })
    .from(requestResults)
    .innerJoin(requests, eq(requestResults.requestId, requests.id))
    .where(eq(requestResults.filePath, blobUrl))
    .limit(1);

  // Same 404 whether the file doesn't exist or belongs to someone else.
  const allowed =
    file &&
    (isPlatformAdmin || file.organisationId === orgId) &&
    (patientId === null || file.patientId === patientId);
  if (!allowed) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    // Fetch the private blob directly using the read/write token
    const blobResponse = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!blobResponse.ok) {
      console.error("[blob/download] Blob fetch failed:", blobResponse.status, blobResponse.statusText);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const contentType =
      blobResponse.headers.get("content-type") || "application/octet-stream";

    // Buffer the entire response — more reliable than streaming for images/PDFs
    const buffer = await blobResponse.arrayBuffer();

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    };

    if (forceDownload) {
      const asciiName = file.fileName.replace(/[^\w.\- ]/g, "_");
      headers["Content-Disposition"] =
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`;
    }

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("[blob/download] Failed to proxy blob:", error);
    return NextResponse.json({ error: "Could not retrieve file" }, { status: 500 });
  }
}
