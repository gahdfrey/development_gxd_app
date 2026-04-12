import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  supplyOrders,
  supplyOrderItems,
  products,
  departments,
  users,
} from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ["approved", "cancelled"],
  approved:  ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * Deplete product stock when an order is marked as delivered.
 *
 * Strategy (loose units first, then break cases):
 *   1. Subtract from loose units.
 *   2. If more units needed, open whole cases (ceiling division).
 *      Leftover units from opened cases are added back as loose.
 *
 * Example — Product: 5 cases × 10 upc + 3 loose (53 total), Order: 15 units
 *   Step 1: 3 loose → remaining = 12, loose = 0
 *   Step 2: ⌈12/10⌉ = 2 cases → 20 units, used 12, back 8 as loose
 *   Result: 3 cases + 8 loose = 38 total ✓ (53 – 15 = 38)
 */
async function depleteProductStock(orderId: number): Promise<void> {
  const lineItems = await db
    .select()
    .from(supplyOrderItems)
    .where(eq(supplyOrderItems.orderId, orderId));

  for (const line of lineItems) {
    if (!line.productId) continue;

    const [prod] = await db
      .select({
        id: products.id,
        casesInStock: products.casesInStock,
        unitsPerCase: products.unitsPerCase,
        looseUnitsInStock: products.looseUnitsInStock,
      })
      .from(products)
      .where(eq(products.id, line.productId));

    if (!prod) continue;

    let remaining = line.quantityRequested;
    let newLoose = prod.looseUnitsInStock;
    let newCases = prod.casesInStock;

    // Step 1 — drain loose units
    if (newLoose >= remaining) {
      newLoose -= remaining;
      remaining = 0;
    } else {
      remaining -= newLoose;
      newLoose = 0;
    }

    // Step 2 — break cases if still needed
    if (remaining > 0 && newCases > 0) {
      const casesNeeded = Math.ceil(remaining / prod.unitsPerCase);
      const casesToBreak = Math.min(casesNeeded, newCases);
      const unitsFromCases = casesToBreak * prod.unitsPerCase;
      newCases -= casesToBreak;
      const consumed = Math.min(unitsFromCases, remaining);
      newLoose += unitsFromCases - consumed;
    }

    await db
      .update(products)
      .set({
        casesInStock: Math.max(0, newCases),
        looseUnitsInStock: Math.max(0, newLoose),
        updatedAt: new Date(),
      })
      .where(eq(products.id, prod.id));
  }
}

// ─── GET /api/inventory/orders/[id] ──────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const [order] = await db
      .select({
        id: supplyOrders.id,
        departmentOrderId: supplyOrders.departmentOrderId,
        status: supplyOrders.status,
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
      .where(eq(supplyOrders.id, id));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const lineItems = await db
      .select({
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
      .where(eq(supplyOrderItems.orderId, id));

    return NextResponse.json({ ...order, items: lineItems }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/inventory/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch supply order" }, { status: 500 });
  }
}

// ─── PATCH /api/inventory/orders/[id] ────────────────────────────────────────
// Body: { status?: string, notes?: string, cancellationReason?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json();
    const newStatus: string | undefined = body.status;
    const notes: string | null | undefined = body.notes;
    const cancellationReason: string | undefined = body.cancellationReason;
    const items: { productId: number; quantityRequested: number }[] | undefined = body.items;

    // Fetch current order
    const [order] = await db
      .select({
        id: supplyOrders.id,
        status: supplyOrders.status,
      })
      .from(supplyOrders)
      .where(eq(supplyOrders.id, id));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Full item replacement (edit pending order) ─────────────────────────
    if (items !== undefined) {
      if (order.status !== "pending") {
        return NextResponse.json(
          { error: "Items can only be edited on pending orders." },
          { status: 400 }
        );
      }
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "At least one item is required." },
          { status: 400 }
        );
      }
      for (const item of items) {
        if (!item.productId || !item.quantityRequested || item.quantityRequested < 1) {
          return NextResponse.json(
            { error: "Each item must have productId and quantityRequested >= 1." },
            { status: 400 }
          );
        }
      }

      // Stock check
      const productIds = items.map((i) => i.productId);
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
        .filter((i) => {
          const s = stockMap[i.productId];
          return !s || s.totalUnits < i.quantityRequested;
        })
        .map((i) => {
          const s = stockMap[i.productId];
          return { name: s?.name ?? "Unknown product", available: s?.totalUnits ?? 0, requested: i.quantityRequested };
        });

      if (insufficient.length > 0) {
        return NextResponse.json(
          { error: "insufficient_stock", items: insufficient },
          { status: 400 }
        );
      }

      // Replace line items atomically
      await db.delete(supplyOrderItems).where(eq(supplyOrderItems.orderId, id));
      await db.insert(supplyOrderItems).values(
        items.map((i) => ({
          orderId: id,
          productId: i.productId,
          quantityRequested: i.quantityRequested,
        }))
      );

      // Also apply notes update if provided
      if (notes !== undefined) {
        await db
          .update(supplyOrders)
          .set({ notes: notes ? notes.trim() || null : null, updatedAt: new Date() })
          .where(eq(supplyOrders.id, id));
      }

      // Return updated order with context
      const [updated] = await db
        .select({
          id: supplyOrders.id,
          departmentOrderId: supplyOrders.departmentOrderId,
          status: supplyOrders.status,
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
        .where(eq(supplyOrders.id, id));

      return NextResponse.json(updated, { status: 200 });
    }

    // ── Status transition ──────────────────────────────────────────────────
    if (newStatus !== undefined) {
      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition order from '${order.status}' to '${newStatus}'`,
          },
          { status: 400 }
        );
      }

      if (newStatus === "cancelled" && !cancellationReason?.trim()) {
        return NextResponse.json(
          { error: "A cancellation reason is required." },
          { status: 400 }
        );
      }

      if (newStatus === "delivered") {
        await depleteProductStock(id);
      }
    }

    // ── Build typed update sets ────────────────────────────────────────────
    // We call update() separately based on what needs changing so we never
    // pass untyped Record<string,unknown> to Drizzle's set().

    if (newStatus === "cancelled") {
      await db
        .update(supplyOrders)
        .set({
          status: "cancelled",
          cancellationReason: (cancellationReason as string).trim(),
          updatedAt: new Date(),
        })
        .where(eq(supplyOrders.id, id));
    } else if (newStatus === "approved") {
      await db
        .update(supplyOrders)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(supplyOrders.id, id));
    } else if (newStatus === "delivered") {
      await db
        .update(supplyOrders)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(supplyOrders.id, id));
    } else if (notes !== undefined) {
      // notes-only edit (pending orders)
      if (order.status !== "pending") {
        return NextResponse.json(
          { error: "Notes can only be edited on pending orders." },
          { status: 400 }
        );
      }
      await db
        .update(supplyOrders)
        .set({ notes: notes ? notes.trim() || null : null, updatedAt: new Date() })
        .where(eq(supplyOrders.id, id));
    }

    // Return the updated order with department + user context
    const [updated] = await db
      .select({
        id: supplyOrders.id,
        departmentOrderId: supplyOrders.departmentOrderId,
        status: supplyOrders.status,
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
      .where(eq(supplyOrders.id, id));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/inventory/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to update supply order" }, { status: 500 });
  }
}

// ─── DELETE /api/inventory/orders/[id] ───────────────────────────────────────
// Only allowed when status is pending or cancelled
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const [order] = await db
      .select({ id: supplyOrders.id, status: supplyOrders.status })
      .from(supplyOrders)
      .where(eq(supplyOrders.id, id));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!["pending", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { error: "Only pending or cancelled orders can be deleted." },
        { status: 400 }
      );
    }

    // Delete line items first (FK constraint), then the order
    await db.delete(supplyOrderItems).where(eq(supplyOrderItems.orderId, id));
    await db.delete(supplyOrders).where(eq(supplyOrders.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/inventory/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to delete supply order" }, { status: 500 });
  }
}
