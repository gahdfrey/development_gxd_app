import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, requests } from "@/lib/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;

    // Unread count
    const unreadResult = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const unreadCount = Number(unreadResult[0]?.value ?? 0);

    // Notification list joined with requests to get patientId
    const baseQuery = db
      .select({
        id: notifications.id,
        requestId: notifications.requestId,
        patientId: requests.patientId,
        patientFirstname: notifications.patientFirstname,
        patientLastname: notifications.patientLastname,
        departmentName: notifications.departmentName,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(requests, eq(notifications.requestId, requests.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    const list = limit ? await baseQuery.limit(limit) : await baseQuery;

    return NextResponse.json({ unreadCount, notifications: list });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
