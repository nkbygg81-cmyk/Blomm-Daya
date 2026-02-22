import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Submit a photo review
export const submitPhotoReview = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    buyerDeviceId: v.string(),
    buyerName: v.optional(v.string()),
    floristId: v.id("florists"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    rating: v.number(),
  },
  returns: v.id("photoReviews"),
  handler: async (ctx, args) => {
    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if review already exists for this order
    const existing = await ctx.db
      .query("photoReviews")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .first();

    if (existing) {
      throw new Error("Review already submitted for this order");
    }

    return await ctx.db.insert("photoReviews", {
      orderId: args.orderId,
      buyerDeviceId: args.buyerDeviceId,
      buyerName: args.buyerName,
      floristId: args.floristId,
      imageUrl: args.imageUrl,
      caption: args.caption,
      rating: args.rating,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get approved photo reviews for a florist
export const getFloristPhotoReviews = query({
  args: {
    floristId: v.id("florists"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("photoReviews"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    rating: v.number(),
    buyerName: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("photoReviews")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .order("desc")
      .take(args.limit || 20);

    return reviews.map((r) => ({
      _id: r._id,
      imageUrl: r.imageUrl,
      caption: r.caption,
      rating: r.rating,
      buyerName: r.buyerName,
      createdAt: r.createdAt,
    }));
  },
});

// Get user's photo reviews
export const getMyPhotoReviews = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("photoReviews"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    rating: v.number(),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("photoReviews")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .order("desc")
      .collect();

    return reviews.map((r) => ({
      _id: r._id,
      imageUrl: r.imageUrl,
      caption: r.caption,
      rating: r.rating,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});

// Get pending photo reviews for admin moderation
export const getPendingPhotoReviews = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("photoReviews"),
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    rating: v.number(),
    buyerName: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const reviews = await ctx.db
      .query("photoReviews")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(50);

    return reviews.map((r) => ({
      _id: r._id,
      orderId: r.orderId,
      floristId: r.floristId,
      imageUrl: r.imageUrl,
      caption: r.caption,
      rating: r.rating,
      buyerName: r.buyerName,
      createdAt: r.createdAt,
    }));
  },
});

// Approve photo review
export const approvePhotoReview = mutation({
  args: {
    reviewId: v.id("photoReviews"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reviewId, {
      status: "approved",
      approvedAt: Date.now(),
    });
    return null;
  },
});

// Reject photo review
export const rejectPhotoReview = mutation({
  args: {
    reviewId: v.id("photoReviews"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reviewId, {
      status: "rejected",
    });
    return null;
  },
});

// Get photo review stats for florist
export const getPhotoReviewStats = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    totalReviews: v.number(),
    averageRating: v.number(),
    pendingCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const allReviews = await ctx.db
      .query("photoReviews")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .collect();

    const approvedReviews = allReviews.filter((r) => r.status === "approved");
    const pendingReviews = allReviews.filter((r) => r.status === "pending");

    const averageRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
      : 0;

    return {
      totalReviews: approvedReviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      pendingCount: pendingReviews.length,
    };
  },
});
