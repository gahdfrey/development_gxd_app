import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@vercel/blob";
import { auth } from "@/auth";

/**
 * GET /api/blob/download?url=<encoded_blob_url>
 *
 * Generates a short-lived signed URL for a private Vercel Blob and redirects
 * the browser to it. Only authenticated users can access this route.
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

  try {
    const signedUrl = await getDownloadUrl(blobUrl);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("[blob/download] Failed to generate signed URL:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Could not retrieve file", detail: message }, { status: 500 });
  }
}
