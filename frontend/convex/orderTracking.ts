import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const addStatusUpdate = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    status: v.string(),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("florists")),
  },
  returns: v.id("orderStatusHistory"),
  handler: async (ctx, args) => {
    // Update order status
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Add to history
    const historyId = await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      status: args.status,
      note: args.note,
      createdBy: args.createdBy,
      timestamp: Date.now(),
    });

    // Send notification to buyer
    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: "Замовлення підтверджено ✅",
        body: `Замовлення #${args.orderId.slice(-6).toUpperCase()} підтверджено флористом`,
      },
      preparing: {
        title: "Букет готується 💐",
        body: "Флорист готує ваш букет",
      },
      delivering: {
        title: "В дорозі 🚗",
        body: "Ваше замовлення вже в дорозі!",
      },
      delivered: {
        title: "Доставлено 🎉",
        body: "Ваше замовлення успішно доставлено. Дякуємо!",
      },
    };

    const message = statusMessages[args.status];
    if (message && order.buyerDeviceId) {
      // Schedule notification sending (will be handled by action)
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: order.buyerDeviceId,
        userType: "buyer",
        title: message.title,
        body: message.body,
        data: { orderId: args.orderId, type: "order_status" },
        type: "orders",
      });
    }

    return historyId;
  },
});

export const getOrderHistory = query({
  args: { orderId: v.id("buyerOrders") },
  returns: v.array(v.object({
    id: v.id("orderStatusHistory"),
    status: v.string(),
    note: v.union(v.string(), v.null()),
    createdByName: v.union(v.string(), v.null()),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const enriched = await Promise.all(
      history.map(async (h) => {
        let createdByName = null;
        if (h.createdBy) {
          const florist = await ctx.db.get(h.createdBy);
          createdByName = florist?.businessName ?? null;
        }

        return {
          id: h._id,
          status: h.status,
          note: h.note ?? null,
          createdByName,
          timestamp: h.timestamp,
        };
      })
    );

    return enriched.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const getOrderTracking = query({
  args: { orderId: v.id("buyerOrders") },
  returns: v.union(v.null(), v.object({
    order: v.object({
      id: v.id("buyerOrders"),
      status: v.string(),
      customerName: v.string(),
      deliveryAddress: v.string(),
      total: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    history: v.array(v.object({
      status: v.string(),
      note: v.union(v.string(), v.null()),
      timestamp: v.number(),
    })),
    photos: v.array(v.object({
      photoUrl: v.string(),
      caption: v.union(v.string(), v.null()),
      uploadedAt: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const photos = await ctx.db
      .query("orderPhotos")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      order: {
        id: order._id,
        status: order.status,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      history: history
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(h => ({
          status: h.status,
          note: h.note ?? null,
          timestamp: h.timestamp,
        })),
      photos: photos.map(p => ({
        photoUrl: p.photoUrl,
        caption: p.caption ?? null,
        uploadedAt: p.uploadedAt,
      })),
    };
  },
});