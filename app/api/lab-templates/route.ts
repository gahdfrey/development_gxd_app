import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { LAB_TEMPLATES, suggestTemplates } from "@/lib/lab/templates";

// GET /api/lab-templates?testName= — starter result-field templates, with
// the ones matching testName listed as suggestions.
export async function GET(request: NextRequest) {
  const authz = await requireAuth();
  if (authz.error) return authz.error;
  const testName = new URL(request.url).searchParams.get("testName") ?? "";
  return NextResponse.json({
    templates: LAB_TEMPLATES,
    suggested: testName ? suggestTemplates(testName).map((t) => t.key) : [],
  });
}
