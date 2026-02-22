import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active product bundles
export const getActiveBundles = query({
  args: {
    floristId: v.optional(v.id("florists")),
  },
  returns: v.array(v.object({
    _id: v.id("productBundles"),
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    descriptionSv: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    items: v.array(v.object({
      flowerId: v.string(),
      flowerName: v.string(),
      quantity: v.number(),
    })),
    originalPrice: v.number(),
    bundlePrice: v.number(),
    discountPercent: v.number(),
    currency: v.string(),
    floristId: v.optional(v.id("florists")),
  })),
  handler: async (ctx, args) => {
    let bundlesQuery = ctx.db.query("productBundles")
      .withIndex("by_active", (q) => q.eq("active", true));

    const bundles = await bundlesQuery.collect();

    // Filter by florist if specified
    const filteredBundles = args.floristId 
      ? bundles.filter((b) => b.floristId === args.floristId || !b.floristId)
      : bundles;

    return filteredBundles.map((b) => ({
      _id: b._id,
      name: b.name,
      nameUk: b.nameUk,
      nameSv: b.nameSv,
      description: b.description,
      descriptionUk: b.descriptionUk,
      descriptionSv: b.descriptionSv,
      imageUrl: b.imageUrl,
      items: b.items,
      originalPrice: b.originalPrice,
      bundlePrice: b.bundlePrice,
      discountPercent: b.discountPercent,
      currency: b.currency || "kr",
      floristId: b.floristId,
    }));
  },
});

// Get bundle by ID
export const getBundle = query({
  args: {
    bundleId: v.id("productBundles"),
  },
  returns: v.union(
    v.object({
      _id: v.id("productBundles"),
      name: v.string(),
      nameUk: v.optional(v.string()),
      nameSv: v.optional(v.string()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      items: v.array(v.object({
        flowerId: v.string(),
        flowerName: v.string(),
        quantity: v.number(),
      })),
      originalPrice: v.number(),
      bundlePrice: v.number(),
      discountPercent: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle || !bundle.active) return null;

    return {
      _id: bundle._id,
      name: bundle.name,
      nameUk: bundle.nameUk,
      nameSv: bundle.nameSv,
      description: bundle.description,
      imageUrl: bundle.imageUrl,
      items: bundle.items,
      originalPrice: bundle.originalPrice,
      bundlePrice: bundle.bundlePrice,
      discountPercent: bundle.discountPercent,
    };
  },
});

// Create a new bundle (florist or admin)
export const createBundle = mutation({
  args: {
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    descriptionSv: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    items: v.array(v.object({
      flowerId: v.string(),
      flowerName: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),
    discountPercent: v.number(),
    floristId: v.optional(v.id("florists")),
    currency: v.optional(v.string()),
  },
  returns: v.id("productBundles"),
  handler: async (ctx, args) => {
    // Calculate prices
    const originalPrice = args.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    const bundlePrice = Math.round(originalPrice * (1 - args.discountPercent / 100));

    return await ctx.db.insert("productBundles", {
      name: args.name,
      nameUk: args.nameUk,
      nameSv: args.nameSv,
      description: args.description,
      descriptionUk: args.descriptionUk,
      descriptionSv: args.descriptionSv,
      imageUrl: args.imageUrl,
      items: args.items.map((i) => ({
        flowerId: i.flowerId,
        flowerName: i.flowerName,
        quantity: i.quantity,
      })),
      originalPrice,
      bundlePrice,
      discountPercent: args.discountPercent,
      currency: args.currency || "kr",
      floristId: args.floristId,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update bundle
export const updateBundle = mutation({
  args: {
    bundleId: v.id("productBundles"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    const updates: any = { updatedAt: Date.now() };
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.nameUk !== undefined) updates.nameUk = args.nameUk;
    if (args.description !== undefined) updates.description = args.description;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.active !== undefined) updates.active = args.active;
    
    if (args.discountPercent !== undefined) {
      updates.discountPercent = args.discountPercent;
      updates.bundlePrice = Math.round(bundle.originalPrice * (1 - args.discountPercent / 100));
    }

    await ctx.db.patch(args.bundleId, updates);
    return null;
  },
});

// Delete bundle
export const deleteBundle = mutation({
  args: {
    bundleId: v.id("productBundles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.bundleId);
    return null;
  },
});

// Get featured bundles for homepage
export const getFeaturedBundles = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("productBundles"),
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    originalPrice: v.number(),
    bundlePrice: v.number(),
    discountPercent: v.number(),
    itemCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const bundles = await ctx.db
      .query("productBundles")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .take(args.limit || 5);

    return bundles.map((b) => ({
      _id: b._id,
      name: b.name,
      nameUk: b.nameUk,
      nameSv: b.nameSv,
      imageUrl: b.imageUrl,
      originalPrice: b.originalPrice,
      bundlePrice: b.bundlePrice,
      discountPercent: b.discountPercent,
      itemCount: b.items.length,
    }));
  },
});
