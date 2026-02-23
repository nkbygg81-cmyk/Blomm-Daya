import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get public gallery photos
export const getPublicGallery = query({
  args: {
    floristId: v.optional(v.id("florists")),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("customerGallery"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    floristId: v.optional(v.id("florists")),
    floristName: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let photos = await ctx.db
      .query("customerGallery")
      .withIndex("by_approved", (q) => q.eq("approved", true))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(limit);

    if (args.floristId) {
      photos = photos.filter((p) => p.floristId === args.floristId);
    }

    // Get florist names
    const floristIds = [...new Set(photos.map((p) => p.floristId).filter(Boolean))];
    const florists = await Promise.all(
      floristIds.map((id) => ctx.db.get(id!))
    );
    const floristMap = new Map(
      florists.filter(Boolean).map((f) => [f!._id, f!.businessName])
    );

    return photos.map((p) => ({
      _id: p._id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      floristId: p.floristId,
      floristName: p.floristId ? floristMap.get(p.floristId) : undefined,
      createdAt: p.createdAt,
    }));
  },
});

// Get user's own gallery photos
export const getMyPhotos = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("customerGallery"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    isPublic: v.boolean(),
    approved: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerGallery")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .order("desc")
      .collect();
  },
});

// Upload photo to gallery
export const uploadPhoto = mutation({
  args: {
    buyerDeviceId: v.string(),
    orderId: v.optional(v.id("buyerOrders")),
    floristId: v.optional(v.id("florists")),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  returns: v.id("customerGallery"),
  handler: async (ctx, args) => {
    // Get floristId from order if not provided
    let floristId = args.floristId;
    if (!floristId && args.orderId) {
      const order = await ctx.db.get(args.orderId);
      floristId = order?.floristId;
    }

    return await ctx.db.insert("customerGallery", {
      buyerDeviceId: args.buyerDeviceId,
      orderId: args.orderId,
      floristId,
      imageUrl: args.imageUrl,
      caption: args.caption,
      isPublic: args.isPublic,
      approved: false, // Requires moderation
      createdAt: Date.now(),
    });
  },
});

// Update photo (caption, visibility)
export const updatePhoto = mutation({
  args: {
    photoId: v.id("customerGallery"),
    caption: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { photoId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(photoId, filteredUpdates);
    }
    return null;
  },
});

// Delete photo
export const deletePhoto = mutation({
  args: {
    photoId: v.id("customerGallery"),
    buyerDeviceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.buyerDeviceId !== args.buyerDeviceId) {
      return false;
    }
    
    await ctx.db.delete(args.photoId);
    return true;
  },
});

// Admin: Approve photo
export const approvePhoto = mutation({
  args: {
    photoId: v.id("customerGallery"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, { approved: true });
    return null;
  },
});

// Admin: Reject photo
export const rejectPhoto = mutation({
  args: {
    photoId: v.id("customerGallery"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, { approved: false });
    return null;
  },
});

// Admin: Get pending photos
export const getPendingPhotos = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("customerGallery"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    buyerDeviceId: v.string(),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("customerGallery")
      .filter((q) => 
        q.and(
          q.eq(q.field("approved"), false),
          q.eq(q.field("isPublic"), true)
        )
      )
      .order("desc")
      .take(100);
  },
});

// Get gallery stats
export const getGalleryStats = query({
  args: {},
  returns: v.object({
    totalPhotos: v.number(),
    pendingPhotos: v.number(),
    approvedPhotos: v.number(),
    publicPhotos: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("customerGallery").collect();
    
    return {
      totalPhotos: all.length,
      pendingPhotos: all.filter((p) => !p.approved && p.isPublic).length,
      approvedPhotos: all.filter((p) => p.approved).length,
      publicPhotos: all.filter((p) => p.isPublic && p.approved).length,
    };
  },
});
