import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Save cart state for abandoned cart tracking
export const saveCartState = mutation({
  args: {
    buyerDeviceId: v.string(),
    items: v.array(v.object({
      flowerId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    })),
    total: v.number(),
  },
  returns: v.id("abandonedCarts"),
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      // If cart is empty, delete any existing abandoned cart
      const existing = await ctx.db
        .query("abandonedCarts")
        .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
        .first();
      
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return existing?._id ?? ("" as any);
    }

    // Check for existing abandoned cart
    const existing = await ctx.db
      .query("abandonedCarts")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();

    if (existing) {
      // Update existing cart
      await ctx.db.patch(existing._id, {
        items: args.items,
        total: args.total,
        updatedAt: Date.now(),
        reminderSent: false, // Reset reminder when cart is updated
      });
      return existing._id;
    }

    // Create new abandoned cart record
    return await ctx.db.insert("abandonedCarts", {
      buyerDeviceId: args.buyerDeviceId,
      items: args.items,
      total: args.total,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reminderSent: false,
      converted: false,
    });
  },
});

// Mark cart as converted (order placed)
export const markCartConverted = mutation({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("abandonedCarts")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();

    if (cart) {
      await ctx.db.patch(cart._id, {
        converted: true,
        convertedAt: Date.now(),
      });
    }
    return null;
  },
});

// Get abandoned cart for recovery
export const getAbandonedCart = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("abandonedCarts"),
      items: v.array(v.object({
        flowerId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      })),
      total: v.number(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("abandonedCarts")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("converted"), false))
      .first();

    if (!cart) return null;

    return {
      _id: cart._id,
      items: cart.items,
      total: cart.total,
      createdAt: cart.createdAt,
    };
  },
});

// Get carts for reminder sending (internal use)
export const getCartsForReminder = query({
  args: {
    olderThanHours: v.number(),
  },
  returns: v.array(v.object({
    _id: v.id("abandonedCarts"),
    buyerDeviceId: v.string(),
    items: v.array(v.any()),
    total: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanHours * 60 * 60 * 1000);
    
    const carts = await ctx.db
      .query("abandonedCarts")
      .filter((q) => 
        q.and(
          q.eq(q.field("converted"), false),
          q.eq(q.field("reminderSent"), false),
          q.lt(q.field("updatedAt"), cutoffTime)
        )
      )
      .take(100);

    return carts.map((c) => ({
      _id: c._id,
      buyerDeviceId: c.buyerDeviceId,
      items: c.items,
      total: c.total,
      createdAt: c.createdAt,
    }));
  },
});

// Mark reminder as sent
export const markReminderSent = mutation({
  args: {
    cartId: v.id("abandonedCarts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cartId, {
      reminderSent: true,
      reminderSentAt: Date.now(),
    });
    return null;
  },
});

// Get abandoned cart stats for admin
export const getAbandonedCartStats = query({
  args: {},
  returns: v.object({
    totalAbandoned: v.number(),
    totalValue: v.number(),
    converted: v.number(),
    conversionRate: v.number(),
    pendingReminders: v.number(),
  }),
  handler: async (ctx) => {
    const allCarts = await ctx.db.query("abandonedCarts").collect();
    
    const abandoned = allCarts.filter((c) => !c.converted);
    const converted = allCarts.filter((c) => c.converted);
    const pendingReminders = allCarts.filter((c) => !c.converted && !c.reminderSent);
    
    const totalValue = abandoned.reduce((sum, c) => sum + c.total, 0);
    const conversionRate = allCarts.length > 0 
      ? (converted.length / allCarts.length) * 100 
      : 0;

    return {
      totalAbandoned: abandoned.length,
      totalValue: Math.round(totalValue),
      converted: converted.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      pendingReminders: pendingReminders.length,
    };
  },
});

// Delete old abandoned carts (cleanup)
export const cleanupOldCarts = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const oldCarts = await ctx.db
      .query("abandonedCarts")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    for (const cart of oldCarts) {
      await ctx.db.delete(cart._id);
    }

    return oldCarts.length;
  },
});
