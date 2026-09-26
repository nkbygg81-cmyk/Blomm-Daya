import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("delivering"),
  v.literal("delivered"),
  v.literal("cancelled")
);

export const listForFlorist = query({
  args: {
    floristId: v.id("florists"),
    status: v.optional(orderStatusValidator),
    view: v.optional(v.union(v.literal("ongoing"), v.literal("today"))),
    dayStart: v.optional(v.number()),
    dayEnd: v.optional(v.number()),
    deliveryDate: v.optional(v.string()),
  },
  returns: v.array(v.object({
    id: v.id("buyerOrders"),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    status: orderStatusValidator,
    total: v.number(),
    itemsCount: v.number(),
    createdAt: v.number(),
    paymentStatus: v.union(v.string(), v.null()),
    cancellationReason: v.union(v.string(), v.null()),
    cancelledBy: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, args) => {
    let orders = args.status
      ? await ctx.db
          .query("buyerOrders")
          .withIndex("by_floristId_and_status_and_createdAt", (q: any) =>
            q.eq("floristId", args.floristId).eq("status", args.status)
          )
          .order("desc")
          .take(200)
      : await ctx.db
          .query("buyerOrders")
          .withIndex("by_floristId_and_createdAt", (q: any) => q.eq("floristId", args.floristId))
          .order("desc")
          .take(200);

    orders = orders.filter((o: any) => o.hiddenForFlorist !== true);

    const hasFailedPayment = (o: any) =>
      ["failed", "unpaid", "expired", "cancelled", "canceled"].includes(
        String(o.paymentStatus ?? "").toLowerCase()
      );

    if (args.view === "ongoing") {
      orders = orders.filter(
        (o: any) =>
          o.status !== "delivered" &&
          o.status !== "cancelled" &&
          !hasFailedPayment(o)
      );
    } else if (args.status && args.status !== "cancelled") {
      orders = orders.filter((o: any) => !hasFailedPayment(o));
    }

    if (args.view === "today") {
      if (args.deliveryDate) {
        const bookings = await ctx.db
          .query("deliverySlotBookings")
          .withIndex("by_date", (q: any) => q.eq("date", args.deliveryDate!))
          .collect();

        if (bookings.length > 0) {
          const todayOrderIds = new Set(bookings.map((b: any) => String(b.orderId)));
          orders = orders.filter((o: any) => todayOrderIds.has(String(o._id)));
        } else if (args.dayStart != null && args.dayEnd != null) {
          // Backward-compatible fallback for orders made before delivery slots were introduced.
          orders = orders.filter(
            (o: any) => o.createdAt >= args.dayStart! && o.createdAt < args.dayEnd!
          );
        }
      }
    }

    return orders.map((o: any) => ({
      id: o._id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      deliveryType: o.deliveryType ?? "delivery",
      status: o.status as
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivering"
        | "delivered"
        | "cancelled",
      total: o.total,
      itemsCount: o.items.length,
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus ?? null,
      cancellationReason: o.cancellationReason ?? null,
      cancelledBy: o.cancelledBy ?? null,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    status: orderStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.floristId !== args.floristId) {
      throw new Error("Not authorized for this order");
    }

    const now = Date.now();
    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "cancelled") {
      patch.cancelledBy = "florist";
      patch.cancellationReason = "cancelled_by_florist";
      patch.cancelledAt = now;
    }

    await ctx.db.patch(args.orderId, patch);

    await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      status: args.status,
      note: args.status === "cancelled" ? "cancelled_by_florist" : undefined,
      createdBy: args.floristId,
      timestamp: now,
    });

    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: "Замовлення підтверджено ✅",
        body: "Флорист підтвердив ваше замовлення",
      },
      preparing: {
        title: "Букет готується 💐",
        body: "Флорист готує ваш букет",
      },
      delivering: {
        title: "В дорозі 🚗",
        body: "Ваше замовлення вже в дорозі",
      },
      delivered: {
        title: "Доставлено 🎉",
        body: "Ваше замовлення успішно доставлено",
      },
      cancelled: {
        title: "Замовлення скасовано",
        body: "Флорист скасував замовлення",
      },
    };

    const message = statusMessages[args.status];
    if (message && order.buyerDeviceId) {
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: order.buyerDeviceId,
        userType: "buyer",
        title: message.title,
        body: message.body,
        data: { orderId: args.orderId, type: "order_status" },
        type: "orders",
      });
    }

    return null;
  },
});

export const hideOrderForFlorist = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.floristId !== args.floristId) {
      throw new Error("Not authorized for this order");
    }

    const paymentStatus = String(order.paymentStatus ?? "").toLowerCase();
    const failedPayment = ["failed", "unpaid", "expired", "cancelled", "canceled"].includes(paymentStatus);
    if (order.status !== "cancelled" && !failedPayment) {
      throw new Error("Only cancelled or failed-payment orders can be hidden");
    }

    await ctx.db.patch(args.orderId, {
      hiddenForFlorist: true,
      hiddenForFloristAt: Date.now(),
    });
    return null;
  },
});

export const clearCancelledForFlorist = mutation({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("buyerOrders")
      .withIndex("by_floristId_and_status_and_createdAt", (q: any) =>
        q.eq("floristId", args.floristId).eq("status", "cancelled")
      )
      .collect();

    let hidden = 0;
    for (const order of orders) {
      if (order.hiddenForFlorist === true) continue;
      await ctx.db.patch(order._id, {
        hiddenForFlorist: true,
        hiddenForFloristAt: Date.now(),
      });
      hidden += 1;
    }
    return hidden;
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
    status: orderStatusValidator,
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
    cancellationReason: v.union(v.string(), v.null()),
    cancelledBy: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId) as any;
    if (!order) return null;

    return {
      id: order._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryType: order.deliveryType ?? "delivery",
      note: order.note ?? null,
      status: order.status as
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivering"
        | "delivered"
        | "cancelled",
      items: order.items.map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl ?? null,
      })),
      total: order.total,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus ?? null,
      cancellationReason: order.cancellationReason ?? null,
      cancelledBy: order.cancelledBy ?? null,
    };
  },
});
