import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplyOrders, supplyOrderItems, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Deplete stock for a single order item (loose-first, then break cases).
 */
async function depleteItemStock(productId: number, qty: number) {
  const [prod] = await db
    .select({
      id: products.id,
      casesInStock: products.casesInStock,
      unitsPerCase: products.unitsPerCase,
      looseUnitsInStock: products.looseUnitsInStock,
    })
    .from(products)
    .where(eq(products.id, productId));

  if (!prod) return;

  let remaining = qty;
  let newLoose = prod.looseUnitsInStock;
  let newCases = prod.casesInStock;

  // Step 1 — drain loose units first
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

// ─── PATCH /api/inventory/orders/[id]/items/[itemId] ─────────────────────────
// Delivers a single line item. If all items in the order become delivered,
// the parent order is also flipped to "delivered".
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: idStr, itemId: itemIdStr } = await params;
    const orderId = parseInt(idStr);
    const itemId = parseInt(itemIdStr);

    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Validate parent order exists and is approved
    const [order] = await db
      .select({ id: supplyOrders.id, status: supplyOrders.status })
      .from(supplyOrders)
      .where(eq(supplyOrders.id, orderId));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "approved") {
      return NextResponse.json(
        { error: "Only accepted orders can have items delivered." },
        { status: 400 }
      );
    }

    // Validate the item belongs to this order and is still pending
    const [item] = await db
      .select({
        id: supplyOrderItems.id,
        productId: supplyOrderItems.productId,
        quantityRequested: supplyOrderItems.quantityRequested,
        status: supplyOrderItems.status,
      })
      .from(supplyOrderItems)
      .where(
        and(
          eq(supplyOrderItems.id, itemId),
          eq(supplyOrderItems.orderId, orderId)
        )
      );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.status === "delivered") {
      return NextResponse.json(
        { error: "Item has already been delivered." },
        { status: 400 }
      );
    }

    // Deplete stock for this item
    if (item.productId) {
      await depleteItemStock(item.productId, item.quantityRequested);
    }

    // Mark this item as delivered
    await db
      .update(supplyOrderItems)
      .set({ status: "delivered", deliveredAt: new Date() })
      .where(eq(supplyOrderItems.id, itemId));

    // Check if ALL items in the order are now delivered
    const remaining = await db
      .select({ id: supplyOrderItems.id })
      .from(supplyOrderItems)
      .where(
        and(
          eq(supplyOrderItems.orderId, orderId),
          eq(supplyOrderItems.status, "pending")
        )
      );

    // If nothing pending left, close the order
    if (remaining.length === 0) {
      await db
        .update(supplyOrders)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(supplyOrders.id, orderId));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/inventory/orders/[id]/items/[itemId]]", error);
    return NextResponse.json(
      { error: "Failed to deliver item" },
      { status: 500 }
    );
  }
}
