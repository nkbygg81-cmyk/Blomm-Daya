import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get wishlist for a buyer
export const getWishlist = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("wishlist"),
    flowerId: v.string(),
    flowerName: v.string(),
    flowerPrice: v.number(),
    flowerImage: v.optional(v.string()),
    floristName: v.optional(v.string()),
    addedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    return items.map((item) => ({
      _id: item._id,
      flowerId: item.flowerId,
      flowerName: item.flowerName,
      flowerPrice: item.flowerPrice,
      flowerImage: item.flowerImage,
      floristName: item.floristName,
      addedAt: item.addedAt,
    }));
  },
});

// Check if item is in wishlist
export const isInWishlist = query({
  args: {
    buyerDeviceId: v.string(),
    flowerId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("flowerId"), args.flowerId))
      .first();

    return item !== null;
  },
});

// Add to wishlist
export const addToWishlist = mutation({
  args: {
    buyerDeviceId: v.string(),
    flowerId: v.string(),
    flowerName: v.string(),
    flowerPrice: v.number(),
    flowerImage: v.optional(v.string()),
    floristName: v.optional(v.string()),
  },
  returns: v.id("wishlist"),
  handler: async (ctx, args) => {
    // Check if already in wishlist
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("flowerId"), args.flowerId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("wishlist", {
      buyerDeviceId: args.buyerDeviceId,
      flowerId: args.flowerId,
      flowerName: args.flowerName,
      flowerPrice: args.flowerPrice,
      flowerImage: args.flowerImage,
      floristName: args.floristName,
      addedAt: Date.now(),
    });
  },
});

// Remove from wishlist
export const removeFromWishlist = mutation({
  args: {
    buyerDeviceId: v.string(),
    flowerId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("flowerId"), args.flowerId))
      .first();

    if (item) {
      await ctx.db.delete(item._id);
      return true;
    }
    return false;
  },
});

// Toggle wishlist (add if not exists, remove if exists)
export const toggleWishlist = mutation({
  args: {
    buyerDeviceId: v.string(),
    flowerId: v.string(),
    flowerName: v.string(),
    flowerPrice: v.number(),
    flowerImage: v.optional(v.string()),
    floristName: v.optional(v.string()),
  },
  returns: v.object({
    added: v.boolean(),
    itemId: v.optional(v.id("wishlist")),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("flowerId"), args.flowerId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { added: false, itemId: undefined };
    }

    const itemId = await ctx.db.insert("wishlist", {
      buyerDeviceId: args.buyerDeviceId,
      flowerId: args.flowerId,
      flowerName: args.flowerName,
      flowerPrice: args.flowerPrice,
      flowerImage: args.flowerImage,
      floristName: args.floristName,
      addedAt: Date.now(),
    });

    return { added: true, itemId };
  },
});

// Clear entire wishlist
export const clearWishlist = mutation({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return items.length;
  },
});

// Get wishlist count
export const getWishlistCount = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    return items.length;
  },
});
