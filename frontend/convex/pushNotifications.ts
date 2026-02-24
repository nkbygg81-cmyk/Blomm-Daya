import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Types of push notifications
export const NOTIFICATION_TYPES = {
  ABANDONED_CART: "abandoned_cart",
  ORDER_STATUS: "order_status",
  DELIVERY_UPDATE: "delivery_update",
  PROMO_ALERT: "promo_alert",
  REMINDER: "reminder",
  REVIEW_REQUEST: "review_request",
} as const;

// Register push token for a device
export const registerPushToken = mutation({
  args: {
    buyerDeviceId: v.string(),
    pushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
  },
  returns: v.id("pushTokens"),
  handler: async (ctx, args) => {
    // Check if token already exists
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pushToken: args.pushToken,
        platform: args.platform,
        updatedAt: Date.now(),
        isActive: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushTokens", {
      userId: args.buyerDeviceId,
      userType: "buyer" as const,
      token: args.pushToken,
      platform: args.platform,
      enabled: true,
      buyerDeviceId: args.buyerDeviceId,
      pushToken: args.pushToken,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Unregister push token
export const unregisterPushToken = mutation({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();

    if (token) {
      await ctx.db.patch(token._id, { isActive: false });
    }
    return null;
  },
});

// Queue a push notification
export const queueNotification = mutation({
  args: {
    buyerDeviceId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    scheduledFor: v.optional(v.number()),
  },
  returns: v.id("pushNotificationQueue"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("pushNotificationQueue", {
      buyerDeviceId: args.buyerDeviceId,
      type: args.type,
      title: args.title,
      body: args.body,
      data: args.data,
      scheduledFor: args.scheduledFor || Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Process abandoned cart reminders
export const processAbandonedCartReminders = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Get abandoned carts that haven't received reminders
    const abandonedCarts = await ctx.db
      .query("abandonedCarts")
      .filter((q) =>
        q.and(
          q.eq(q.field("converted"), false),
          q.eq(q.field("reminderSent"), false),
          q.lt(q.field("updatedAt"), oneHourAgo),
          q.gt(q.field("updatedAt"), oneDayAgo)
        )
      )
      .take(50);

    let sentCount = 0;

    for (const cart of abandonedCarts) {
      // Get push token for this device
      const token = await ctx.db
        .query("pushTokens")
        .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", cart.buyerDeviceId))
        .first();

      if (token && token.isActive) {
        // Queue notification
        const itemCount = cart.items.length;
        const firstItem = cart.items[0];

        await ctx.db.insert("pushNotificationQueue", {
          buyerDeviceId: cart.buyerDeviceId,
          type: NOTIFICATION_TYPES.ABANDONED_CART,
          title: "Ви забули про букет! 💐",
          body: itemCount === 1
            ? `${firstItem.name} чекає на вас у кошику`
            : `${itemCount} букетів чекають на вас у кошику`,
          data: {
            cartId: cart._id,
            itemCount,
            total: cart.total,
          },
          scheduledFor: Date.now(),
          status: "pending",
          createdAt: Date.now(),
        });

        // Mark cart as reminder sent
        await ctx.db.patch(cart._id, {
          reminderSent: true,
          reminderSentAt: Date.now(),
        });

        sentCount++;
      }
    }

    return sentCount;
  },
});

// Process order status notifications
export const sendOrderStatusNotification = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    status: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    // Get push token
    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", order.buyerDeviceId))
      .first();

    if (!token || !token.isActive) return null;

    // Status messages
    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: "Замовлення підтверджено ✅",
        body: "Флорист почав готувати ваш букет",
      },
      preparing: {
        title: "Букет готується 🌸",
        body: "Флорист працює над вашим замовленням",
      },
      ready: {
        title: "Букет готовий! 💐",
        body: "Ваше замовлення готове до відправки",
      },
      delivering: {
        title: "Кур'єр в дорозі 🚗",
        body: "Ваш букет вже їде до вас",
      },
      delivered: {
        title: "Доставлено! 🎉",
        body: "Ваш букет доставлено. Дякуємо за замовлення!",
      },
    };

    const message = statusMessages[args.status] || {
      title: "Оновлення замовлення",
      body: args.note || `Статус: ${args.status}`,
    };

    await ctx.db.insert("pushNotificationQueue", {
      buyerDeviceId: order.buyerDeviceId,
      type: NOTIFICATION_TYPES.ORDER_STATUS,
      title: message.title,
      body: message.body,
      data: {
        orderId: args.orderId,
        status: args.status,
      },
      scheduledFor: Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });

    return null;
  },
});

// Send delivery ETA update
export const sendDeliveryETANotification = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    etaMinutes: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", order.buyerDeviceId))
      .first();

    if (!token || !token.isActive) return null;

    await ctx.db.insert("pushNotificationQueue", {
      buyerDeviceId: order.buyerDeviceId,
      type: NOTIFICATION_TYPES.DELIVERY_UPDATE,
      title: "Кур'єр майже біля вас! 📍",
      body: `Очікуваний час прибуття: ${args.etaMinutes} хвилин`,
      data: {
        orderId: args.orderId,
        etaMinutes: args.etaMinutes,
      },
      scheduledFor: Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });

    return null;
  },
});

// Get pending notifications for processing
export const getPendingNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("pushNotificationQueue"),
    buyerDeviceId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    pushToken: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("pushNotificationQueue")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), Date.now())
        )
      )
      .take(args.limit || 100);

    // Get push tokens
    const results = [];
    for (const notif of notifications) {
      const token = await ctx.db
        .query("pushTokens")
        .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", notif.buyerDeviceId))
        .first();

      results.push({
        _id: notif._id,
        buyerDeviceId: notif.buyerDeviceId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        data: notif.data,
        pushToken: token?.pushToken,
      });
    }

    return results;
  },
});

// Mark notification as sent
export const markNotificationSent = mutation({
  args: {
    notificationId: v.id("pushNotificationQueue"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: args.success ? "sent" : "failed",
      sentAt: args.success ? Date.now() : undefined,
      error: args.error,
    });
    return null;
  },
});

// Get notification stats
export const getNotificationStats = query({
  args: {},
  returns: v.object({
    totalSent: v.number(),
    totalPending: v.number(),
    totalFailed: v.number(),
    byType: v.any(),
  }),
  handler: async (ctx) => {
    const allNotifications = await ctx.db.query("pushNotificationQueue").collect();

    const sent = allNotifications.filter((n) => n.status === "sent");
    const pending = allNotifications.filter((n) => n.status === "pending");
    const failed = allNotifications.filter((n) => n.status === "failed");

    // Count by type
    const byType: Record<string, number> = {};
    sent.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      totalSent: sent.length,
      totalPending: pending.length,
      totalFailed: failed.length,
      byType,
    };
  },
});
