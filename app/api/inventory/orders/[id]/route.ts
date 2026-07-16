import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  supplyOrders,
  supplyOrderItems,
  products,
  departments,
  users,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

/**
 * Deplete product stock when an order is delivered.
 * Strategy: drain loose units first, then break cases (leftover → loose).
 */
async function depleteProductStock(orderId: number): Promise<void> {
  const lineItems = await db
    .select({
      productId: supplyOrderItems.productId,
      quantityRequested: supplyOrderItems.quantityRequested,
    })
    .from(supplyOrderItems)
    .where(eq(supplyOrderItems.orderId, orderId));

  const validLines = lineItems.filter((l) => l.productId != null);
  if (validLines.length === 0) return;

  const productIds = validLines.map((l) => l.productId as number);
  const prodRows = await db
    .select({
      id: products.id,
      casesInStock: products.casesInStock,
      unitsPerCase: products.unitsPerCase,
      looseUnitsInStock: products.looseUnitsInStock,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));

  const updates = validLines.flatMap((line) => {
    const prod = prodMap.get(line.productId as number);
    if (!prod) return [];

    let remaining = line.quantityRequested;
    let newLoose  = prod.looseUnitsInStock;
    let newCases  = prod.casesInStock;

    if (newLoose >= remaining) {
      newLoose -= remaining;
      remaining = 0;
    } else {
      remaining -= newLoose;
      newLoose = 0;
    }

    if (remaining > 0 && newCases > 0) {
      const casesToBreak   = Math.min(Math.ceil(remaining / prod.unitsPerCase), newCases);
      const unitsFromCases = casesToBreak * prod.unitsPerCase;
      newCases -= casesToBreak;
      newLoose += unitsFromCases - Math.min(unitsFromCases, remaining);
    }

    return [db
      .update(products)
      .set({ casesInStock: Math.max(0, newCases), looseUnitsInStock: Math.max(0, newLoose), updatedAt: new Date() })
      .where(eq(products.id, prod.id))];
  });

  await Promise.all(updates);
}

const orderSelectShape = {
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
};

async function fetchOrder(id: number, orgId: number) {
  const [row] = await db
    .select(orderSelectShape)
    .from(supplyOrders)
    .leftJoin(departments, eq(supplyOrders.departmentId, departments.id))
    .leftJoin(users, eq(supplyOrders.requestedBy, users.id))
    .where(and(eq(supplyOrders.id, id), eq(supplyOrders.organisationId, orgId)));
  return row ?? null;
}

// ─── GET /api/inventory/orders/[id] ──────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });

    const order = await fetchOrder(id, orgId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

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
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });

    const body = await request.json();
    const newDeptStatus: string | undefined      = body.departmentStatus;
    const newSupplyStatus: string | undefined    = body.supplyStatus;
    const notes: string | null | undefined       = body.notes;
    const cancellationReason: string | undefined = body.cancellationReason;
    const items: { productId: number; quantityRequested: number }[] | undefined = body.items;

    const orgFilter = eq(supplyOrders.organisationId, orgId);

    // ── Department status update ───────────────────────────────────────────
    if (newDeptStatus !== undefined) {
      const DEPT_FROM: Record<string, string> = { accepted: "pending" };
      const requiredFrom = DEPT_FROM[newDeptStatus];
      if (!requiredFrom) {
        return NextResponse.json({ error: `'${newDeptStatus}' is not a valid department status.` }, { status: 400 });
      }

      const [updated] = await db
        .update(supplyOrders)
        .set({ departmentStatus: newDeptStatus, updatedAt: new Date() })
        .where(and(eq(supplyOrders.id, id), eq(supplyOrders.departmentStatus, requiredFrom), orgFilter))
        .returning({ id: supplyOrders.id });

      if (!updated) {
        const [exists] = await db.select({ id: supplyOrders.id }).from(supplyOrders).where(and(eq(supplyOrders.id, id), orgFilter));
        if (!exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        return NextResponse.json({ error: `Order is not in '${requiredFrom}' status.` }, { status: 400 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Supply status update ───────────────────────────────────────────────
    if (newSupplyStatus !== undefined) {
      const SUPPLY_FROM: Record<string, string> = {
        accepted:  "pending",
        delivered: "accepted",
        cancelled: "pending",
      };

      if (newSupplyStatus === "cancelled" && !cancellationReason?.trim()) {
        return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 });
      }

      if (newSupplyStatus === "cancelled") {
        const [updated] = await db
          .update(supplyOrders)
          .set({ supplyStatus: "cancelled", cancellationReason: (cancellationReason as string).trim(), updatedAt: new Date() })
          .where(and(eq(supplyOrders.id, id), inArray(supplyOrders.supplyStatus, ["pending", "accepted"]), orgFilter))
          .returning({ id: supplyOrders.id });

        if (!updated) {
          const [exists] = await db.select({ id: supplyOrders.id }).from(supplyOrders).where(and(eq(supplyOrders.id, id), orgFilter));
          if (!exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
          return NextResponse.json({ error: "Order cannot be cancelled in its current state." }, { status: 400 });
        }
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const requiredFrom = SUPPLY_FROM[newSupplyStatus];
      if (!requiredFrom) {
        return NextResponse.json({ error: `'${newSupplyStatus}' is not a valid supply status.` }, { status: 400 });
      }

      if (newSupplyStatus === "delivered") {
        const [current] = await db
          .select({ supplyStatus: supplyOrders.supplyStatus })
          .from(supplyOrders)
          .where(and(eq(supplyOrders.id, id), orgFilter));

        if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        if (current.supplyStatus !== "accepted") {
          return NextResponse.json({ error: "Order must be accepted before it can be delivered." }, { status: 400 });
        }

        await Promise.all([
          depleteProductStock(id),
          db.update(supplyOrders)
            .set({ supplyStatus: "delivered", updatedAt: new Date() })
            .where(and(eq(supplyOrders.id, id), orgFilter)),
        ]);

        return NextResponse.json({ success: true }, { status: 200 });
      }

      const [updated] = await db
        .update(supplyOrders)
        .set({ supplyStatus: newSupplyStatus, updatedAt: new Date() })
        .where(and(eq(supplyOrders.id, id), eq(supplyOrders.supplyStatus, requiredFrom), orgFilter))
        .returning({ id: supplyOrders.id });

      if (!updated) {
        const [exists] = await db.select({ id: supplyOrders.id }).from(supplyOrders).where(and(eq(supplyOrders.id, id), orgFilter));
        if (!exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        return NextResponse.json({ error: `Order is not in '${requiredFrom}' status.` }, { status: 400 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Edit items (pending orders only) ──────────────────────────────────
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
      }
      for (const item of items) {
        if (!item.productId || !item.quantityRequested || item.quantityRequested < 1) {
          return NextResponse.json({ error: "Each item must have productId and quantityRequested >= 1." }, { status: 400 });
        }
      }

      const [current] = await db
        .select({ supplyStatus: supplyOrders.supplyStatus })
        .from(supplyOrders)
        .where(and(eq(supplyOrders.id, id), orgFilter));

      if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (current.supplyStatus !== "pending") {
        return NextResponse.json({ error: "Items can only be edited before the order is accepted." }, { status: 400 });
      }

      const productIds = items.map((i) => i.productId);
      const stockRows = await db
        .select({
          id: products.id,
          name: products.name,
          totalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
        })
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.organisationId, orgId)));

      const stockMap = Object.fromEntries(stockRows.map((s) => [s.id, s]));
      const insufficient = items
        .filter((i) => { const s = stockMap[i.productId]; return !s || s.totalUnits < i.quantityRequested; })
        .map((i) => { const s = stockMap[i.productId]; return { name: s?.name ?? "Unknown product", available: s?.totalUnits ?? 0, requested: i.quantityRequested }; });

      if (insufficient.length > 0) {
        return NextResponse.json({ error: "insufficient_stock", items: insufficient }, { status: 400 });
      }

      await Promise.all([
        db.delete(supplyOrderItems).where(eq(supplyOrderItems.orderId, id))
          .then(() => db.insert(supplyOrderItems).values(
            items.map((i) => ({ orderId: id, productId: i.productId, quantityRequested: i.quantityRequested }))
          )),
        notes !== undefined
          ? db.update(supplyOrders)
              .set({ notes: notes ? notes.trim() || null : null, updatedAt: new Date() })
              .where(and(eq(supplyOrders.id, id), orgFilter))
          : Promise.resolve(),
      ]);

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Notes-only update ─────────────────────────────────────────────────
    if (notes !== undefined) {
      const [updated] = await db
        .update(supplyOrders)
        .set({ notes: notes ? notes.trim() || null : null, updatedAt: new Date() })
        .where(and(eq(supplyOrders.id, id), eq(supplyOrders.supplyStatus, "pending"), orgFilter))
        .returning({ id: supplyOrders.id });

      if (!updated) {
        const [exists] = await db.select({ id: supplyOrders.id }).from(supplyOrders).where(and(eq(supplyOrders.id, id), orgFilter));
        if (!exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        return NextResponse.json({ error: "Notes can only be edited before the order is accepted." }, { status: 400 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/inventory/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to update supply order" }, { status: 500 });
  }
}

// ─── DELETE /api/inventory/orders/[id] ───────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });

    const [order] = await db
      .select({ id: supplyOrders.id, supplyStatus: supplyOrders.supplyStatus })
      .from(supplyOrders)
      .where(and(eq(supplyOrders.id, id), eq(supplyOrders.organisationId, orgId)));

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.supplyStatus !== "pending") {
      return NextResponse.json({ error: "Orders can only be deleted before they are accepted." }, { status: 400 });
    }

    await db.delete(supplyOrderItems).where(eq(supplyOrderItems.orderId, id));
    await db.delete(supplyOrders).where(eq(supplyOrders.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/inventory/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to delete supply order" }, { status: 500 });
  }
}
