import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organisations } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!(session?.user as any)?.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgs = await db.select().from(organisations).orderBy(asc(organisations.id));
    return NextResponse.json(orgs, { status: 200 });
  } catch (error) {
    console.error("Error fetching organisations:", error);
    return NextResponse.json({ error: "Failed to fetch organisations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!(session?.user as any)?.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, email, phone, address } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Organisation name is required" }, { status: 400 });
    }
    if (!slug?.trim() || !/^[a-z0-9-]+$/.test(slug.trim())) {
      return NextResponse.json(
        { error: "Slug is required and must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const [org] = await db
      .insert(organisations)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      })
      .returning();

    return NextResponse.json(org, { status: 201 });
  } catch (error: any) {
    console.error("Error creating organisation:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "An organisation with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create organisation" }, { status: 500 });
  }
}
