import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

// Check if an order was created for a given Stripe session (used by checkout to verify payment)
export const getOrderBySessionId = query({
  args: { sessionId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("buyerOrders")
      .withIndex("by_stripeSessionId", (q: any) => q.eq("stripeSessionId", args.sessionId))
      .first();
    return order ? { _id: order._id, status: order.status } : null;
  },
});

export const create = mutation({
  args: {
    buyerDeviceId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    note: v.optional(v.string()),
    items: v.array(
      v.object({
        flowerId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      }),
    ),
    gifts: v.optional(
      v.array(
        v.object({
          giftId: v.string(),
          name: v.string(),
          price: v.number(),
          imageUrl: v.optional(v.string()),
          qty: v.number(),
        }),
      ),
    ),
  },
  returns: v.id("buyerOrders"),
  handler: async (ctx, args) => {
    const gifts = args.gifts ?? [];
    const itemsTotal = args.items.reduce(
      (sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty,
      0,
    );
    const giftsTotal = gifts.reduce(
      (sum: number, gift: { price: number; qty: number }) => sum + gift.price * gift.qty,
      0,
    );
    const total = itemsTotal + giftsTotal;
    const now = Date.now();

    return await ctx.db.insert("buyerOrders", {
      buyerDeviceId: args.buyerDeviceId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      deliveryAddress: args.deliveryAddress,
      note: args.note,
      status: "pending",
      items: args.items,
      gifts: gifts.length ? gifts : undefined,
      total,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const quickOrder = mutation({
  args: {
    buyerDeviceId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    flowerId: v.string(),
    flowerName: v.string(),
    flowerPrice: v.number(),
    flowerImageUrl: v.optional(v.string()),
  },
  returns: v.id("buyerOrders"),
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("buyerOrders", {
      buyerDeviceId: args.buyerDeviceId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      deliveryAddress: args.deliveryAddress,
      status: "pending",
      items: [
        {
          flowerId: args.flowerId,
          name: args.flowerName,
          price: args.flowerPrice,
          imageUrl: args.flowerImageUrl,
          qty: 1,
        },
      ],
      total: args.flowerPrice,
      createdAt: now,
      updatedAt: now,
      paymentStatus: "cod", // Cash on delivery
    });
  },
});

export const createFromStripeWebhook = internalMutation({
  args: {
    sessionId: v.string(),
    buyerDeviceId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    deliveryAddress: v.string(),
    note: v.optional(v.string()),
    items: v.array(
      v.object({
        flowerId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      }),
    ),
    gifts: v.optional(
      v.array(
        v.object({
          giftId: v.string(),
          name: v.string(),
          price: v.number(),
          imageUrl: v.optional(v.string()),
          qty: v.number(),
        }),
      ),
    ),
    stripePaymentIntentId: v.string(),
    paymentMethodType: v.optional(v.string()),
    floristId: v.optional(v.id("florists")),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
  },
  returns: v.id("buyerOrders"),
  handler: async (ctx, args) => {
    // Check if order already exists for this session
    const existing = await ctx.db
      .query("buyerOrders")
      .withIndex("by_stripeSessionId", (q: any) => q.eq("stripeSessionId", args.sessionId))
      .first();

    if (existing) {
      return existing._id;
    }

    const gifts = args.gifts ?? [];
    const itemsTotal = args.items.reduce(
      (sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty,
      0,
    );
    const giftsTotal = gifts.reduce(
      (sum: number, gift: { price: number; qty: number }) => sum + gift.price * gift.qty,
      0,
    );
    const discount = args.promoDiscount && args.promoDiscount > 0 ? args.promoDiscount : 0;
    const deliveryFeeAmount = args.deliveryFee && args.deliveryFee > 0 ? args.deliveryFee : 0;
    const total = Math.max(0, itemsTotal + giftsTotal - discount + deliveryFeeAmount);
    const now = Date.now();

    const orderId = await ctx.db.insert("buyerOrders", {
      buyerDeviceId: args.buyerDeviceId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      deliveryType: args.deliveryType ?? "delivery",
      deliveryAddress: args.deliveryAddress,
      note: args.note,
      status: "pending",
      items: args.items,
      gifts: gifts.length ? gifts : undefined,
      total,
      deliveryFee: deliveryFeeAmount > 0 ? deliveryFeeAmount : undefined,
      createdAt: now,
      updatedAt: now,
      stripeSessionId: args.sessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      paymentStatus: "paid",
      paymentMethodType: args.paymentMethodType,
      floristId: args.floristId,
    });

    // Increment promo code usage if applicable
    if (args.promoCode) {
      const promo = await ctx.db
        .query("promoCodes")
        .withIndex("by_code", (q: any) => q.eq("code", args.promoCode))
        .first();
      if (promo) {
        await ctx.db.patch(promo._id, {
          currentUses: (promo.currentUses || 0) + 1,
        });
      }
    }

    // Send push notification to florist about new order
    if (args.floristId) {
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: String(args.floristId),
        userType: "florist",
        title: "Нове замовлення! 🎉",
        body: `${args.customerName} замовив на ${total} kr`,
        data: { orderId, type: "new_order" },
        type: "orders",
      });
    }

    return orderId;
  },
});

export const listForBuyer = query({
  args: { buyerDeviceId: v.string() },
  returns: v.array(
    v.object({
      id: v.id("buyerOrders"),
      customerName: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("delivered"),
        v.literal("cancelled"),
      ),
      total: v.number(),
      itemsCount: v.number(),
      createdAt: v.number(),
      paymentStatus: v.union(v.string(), v.null()),
      paymentMethodType: v.union(v.string(), v.null()),
      items: v.array(
        v.object({
          flowerId: v.string(),
          name: v.string(),
          price: v.number(),
          imageUrl: v.union(v.string(), v.null()),
          qty: v.number(),
        }),
      ),
      gifts: v.optional(
        v.array(
          v.object({
            giftId: v.string(),
            name: v.string(),
            price: v.number(),
            imageUrl: v.union(v.string(), v.null()),
            qty: v.number(),
          }),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("buyerOrders")
      .withIndex("by_buyerDeviceId_and_createdAt", (q: any) =>
        q.eq("buyerDeviceId", args.buyerDeviceId)
      )
      .order("desc")
      .take(50);

    return orders.map((o: any) => ({
      id: o._id,
      customerName: o.customerName,
      status: o.status,
      total: o.total,
      itemsCount: (o.items?.length ?? 0) + (o.gifts?.length ?? 0),
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus ?? null,
      paymentMethodType: o.paymentMethodType ?? null,
      items: (o.items ?? []).map((item: any) => ({
        flowerId: item.flowerId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl ?? null,
        qty: item.qty,
      })),
      gifts: o.gifts
        ? o.gifts.map((gift: any) => ({
            giftId: gift.giftId,
            name: gift.name,
            price: gift.price,
            imageUrl: gift.imageUrl ?? null,
            qty: gift.qty,
          }))
        : undefined,
    }));
  },
});

export const getById = query({
  args: { orderId: v.id("buyerOrders") },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("buyerOrders"),
      customerName: v.string(),
      customerPhone: v.string(),
      deliveryAddress: v.string(),
      note: v.union(v.null(), v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("delivered"),
        v.literal("cancelled"),
      ),
      items: v.array(
        v.object({
          flowerId: v.string(),
          name: v.string(),
          price: v.number(),
          imageUrl: v.union(v.null(), v.string()),
          qty: v.number(),
        }),
      ),
      total: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    return {
      id: order._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      note: order.note ?? null,
      status: order.status,
      items: order.items.map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl ?? null,
      })),
      total: order.total,
      createdAt: order.createdAt,
    };
  },
});

export const getRecentForFlorist = query({
  args: {
    floristId: v.id("florists"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    id: v.id("buyerOrders"),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryType: v.union(v.literal("delivery"), v.literal("pickup"), v.null()),
    status: v.string(),
    total: v.number(),
    itemsCount: v.number(),
    createdAt: v.number(),
    createdAtFormatted: v.string(),
  })),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("buyerOrders")
      .withIndex("by_floristId_and_createdAt", (q: any) => q.eq("floristId", args.floristId))
      .order("desc")
      .take(args.limit ?? 10);

    return orders.map((order: any) => {
      const date = new Date(order.createdAt);
      const formatted = date.toLocaleString("uk-UA", {
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: order._id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryType: order.deliveryType ?? null,
        status: order.status,
        total: order.total,
        itemsCount: (order.items?.length ?? 0) + ((order.gifts?.length) ?? 0),
        createdAt: order.createdAt,
        createdAtFormatted: formatted,
      };
    });
  },
});