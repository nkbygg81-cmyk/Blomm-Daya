import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listForFlorist = query({
  args: { 
    floristId: v.id("florists"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
  },
  returns: v.array(v.object({
    id: v.id("buyerOrders"),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    total: v.number(),
    itemsCount: v.number(),
    createdAt: v.number(),
    paymentStatus: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, args) => {
    const orders = args.status
      ? await ctx.db
          .query("buyerOrders")
          .withIndex("by_floristId_and_status_and_createdAt", (q: any) =>
            q.eq("floristId", args.floristId).eq("status", args.status)
          )
          .order("desc")
          .take(100)
      : await ctx.db
          .query("buyerOrders")
          .withIndex("by_floristId_and_createdAt", (q: any) => q.eq("floristId", args.floristId))
          .order("desc")
          .take(100);

    return orders.map((o: any) => ({
      id: o._id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      status: o.status,
      total: o.total,
      itemsCount: o.items.length,
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus ?? null,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const getOrderDetails = query({
  args: { orderId: v.id("buyerOrders") },
  returns: v.union(v.null(), v.object({
    id: v.id("buyerOrders"),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    note: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    items: v.array(v.object({
      flowerId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.union(v.string(), v.null()),
      qty: v.number(),
    })),
    total: v.number(),
    createdAt: v.number(),
    paymentStatus: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    return {
      id: order._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryType: order.deliveryType ?? "delivery",
      note: order.note ?? null,
      status: order.status,
      items: order.items.map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl ?? null,
      })),
      total: order.total,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus ?? null,
    };
  },
});