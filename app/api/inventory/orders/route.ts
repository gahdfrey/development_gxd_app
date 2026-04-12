import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  supplyOrders,
  supplyOrderItems,
  products,
  departments,
  users,
} from "@/lib/db/schema";
import { eq, and, inArray, ilike, sql } from "drizzle-orm";
import { auth } from "@/auth";

// ─── GET /api/inventory/orders ────────────────────────────────────────────────
// Query params:
//   ?departmentId=1
//   ?department=laboratory
//   ?departmentStatus=pending|accepted          ← dept page filter
//   ?supplyStatus=pending|accepted|delivered|cancelled  ← supply page filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId    = searchParams.get("departmentId");
    const departmentName  = searchParams.get("department");
    const departmentStatus = searchParams.get("departmentStatus");
    const supplyStatus    = searchParams.get("supplyStatus");

    const conditions = [];
    if (departmentId)     conditions.push(eq(supplyOrders.departmentId, parseInt(departmentId)));
    if (departmentName)   conditions.push(ilike(departments.name, departmentName));
    if (departmentStatus) conditions.push(eq(supplyOrders.departmentStatus, departmentStatus));
    if (supplyStatus)     conditions.push(eq(supplyOrders.supplyStatus, supplyStatus));

    const orders = await db
      .select({
        id: supplyOrders.id,
        departmentOrderId: supplyOrders.departmentOrderId,
        departmentStatus: supplyOrders.departmentStatus,
        supplyStatus: supplyOrders.supplyStatus,
        notes: supplyOrders.notes,
        cancellationReason: supplyOrders.cancellationReason,
        createdAt: supplyOrders.createdAt,
        updatedAt: supplyOrders.updatedAt,
        departmentId: supplyOrders.departmentId,
        departmentName: departments.name,
        requestedBy: supplyOrders.requestedBy,
        requestedByFirstname: users.firstname,
        requestedByLastname: users.lastname,
      })
      .from(supplyOrders)
      .leftJoin(departments, eq(supplyOrders.departmentId, departments.id))
      .leftJoin(users, eq(supplyOrders.requestedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${supplyOrders.createdAt} DESC`);

    if (orders.length === 0) return NextResponse.json([], { status: 200 });

    const orderIds = orders.map((o) => o.id);
    const lineItems = await db
      .select({
        orderId: supplyOrderItems.orderId,
        id: supplyOrderItems.id,
        productId: supplyOrderItems.productId,
        quantityRequested: supplyOrderItems.quantityRequested,
        itemStatus: supplyOrderItems.status,
        deliveredAt: supplyOrderItems.deliveredAt,
        itemName: products.name,
        itemTotalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
      })
      .from(supplyOrderItems)
      .leftJoin(products, eq(supplyOrderItems.productId, products.id))
      .where(inArray(supplyOrderItems.orderId, orderIds));

    const itemsByOrder = lineItems.reduce<Record<number, typeof lineItems>>(
      (acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      },
      {}
    );

    const result = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] }));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching supply orders:", error);
    return NextResponse.json({ error: "Failed to fetch supply orders" }, { status: 500 });
  }
}

// ─── POST /api/inventory/orders ───────────────────────────────────────────────
// Creates one supplyOrder per product (each gets its own id).
// All orders from the same requisition share a departmentOrderId.
// Body: { departmentId, notes?, items: [{ productId, quantityRequested }] }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { departmentId, notes, items } = body;

    if (!departmentId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "departmentId and at least one item are required" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId || !item.quantityRequested || item.quantityRequested < 1) {
        return NextResponse.json(
          { error: "Each item must have productId and quantityRequested >= 1" },
          { status: 400 }
        );
      }
    }

    const [currentUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Stock check
    const productIds = items.map((i: { productId: number }) => i.productId);
    const stockRows = await db
      .select({
        id: products.id,
        name: products.name,
        totalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const stockMap = Object.fromEntries(stockRows.map((s) => [s.id, s]));

    const insufficient = items
      .filter((item: { productId: number; quantityRequested: number }) => {
        const stock = stockMap[item.productId];
        return !stock || stock.totalUnits < item.quantityRequested;
      })
      .map((item: { productId: number; quantityRequested: number }) => {
        const stock = stockMap[item.productId];
        return { name: stock?.name ?? "Unknown product", available: stock?.totalUnits ?? 0, requested: item.quantityRequested };
      });

    if (insufficient.length > 0) {
      return NextResponse.json({ error: "insufficient_stock", items: insufficient }, { status: 400 });
    }

    // Create one order per product, all sharing the same departmentOrderId
    const createdOrders: typeof supplyOrders.$inferSelect[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as { productId: number; quantityRequested: number };
      const departmentOrderId = createdOrders.length > 0 ? createdOrders[0].id : null;

      const [order] = await db
        .insert(supplyOrders)
        .values({
          departmentId,
          requestedBy: currentUser.id,
          notes: notes?.trim() || null,
          status: "pending",
          departmentStatus: "pending",
          supplyStatus: "pending",
          departmentOrderId,
        })
        .returning();

      if (i === 0) {
        await db
          .update(supplyOrders)
          .set({ departmentOrderId: order.id })
          .where(eq(supplyOrders.id, order.id));
        order.departmentOrderId = order.id;
      }

      await db.insert(supplyOrderItems).values({
        orderId: order.id,
        productId: item.productId,
        quantityRequested: item.quantityRequested,
      });

      createdOrders.push(order);
    }

    return NextResponse.json(
      { departmentOrderId: createdOrders[0].id, orders: createdOrders.map((o) => o.id), count: createdOrders.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating supply order:", error);
    return NextResponse.json({ error: "Failed to create supply order" }, { status: 500 });
  }
}
