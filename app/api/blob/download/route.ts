import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * GET /api/blob/download?url=<encoded_blob_url>&dl=1 (optional dl param forces download)
 *
 * Proxies private Vercel Blob content through the server so:
 *  - Images display inline in <img> tags
 *  - PDFs render inside <iframe> elements
 *  - Download links trigger a file save (when ?dl=1 is passed)
 *
 * Only authenticated users can access this route.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobUrl = request.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Optional: ?dl=1 forces Content-Disposition: attachment (browser download)
  const forceDownload = request.nextUrl.searchParams.get("dl") === "1";

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
      const fileName = decodeURIComponent(blobUrl.split("/").pop() ?? "file");
      headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
    }

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("[blob/download] Failed to proxy blob:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Could not retrieve file", detail: message },
      { status: 500 },
    );
  }
}
