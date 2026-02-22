import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getForFlorist = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.array(v.object({
    id: v.id("floristReviews"),
    buyerId: v.id("buyers"),
    buyerName: v.union(v.string(), v.null()),
    rating: v.number(),
    deliveryRating: v.number(),
    qualityRating: v.number(),
    comment: v.union(v.string(), v.null()),
    photoUrls: v.array(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("floristReviews")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const buyer = await ctx.db.get(review.buyerId);
        return {
          id: review._id,
          buyerId: review.buyerId,
          buyerName: buyer?.name ?? null,
          rating: review.rating,
          deliveryRating: review.deliveryRating,
          qualityRating: review.qualityRating,
          comment: review.comment ?? null,
          photoUrls: (review as any).photoUrls ?? [],
          createdAt: review.createdAt,
        };
      })
    );

    return enriched;
  },
});

export const getStats = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    totalReviews: v.number(),
    avgRating: v.number(),
    avgDeliveryRating: v.number(),
    avgQualityRating: v.number(),
    ratingDistribution: v.object({
      fiveStar: v.number(),
      fourStar: v.number(),
      threeStar: v.number(),
      twoStar: v.number(),
      oneStar: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("floristReviews")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .collect();

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        avgRating: 0,
        avgDeliveryRating: 0,
        avgQualityRating: 0,
        ratingDistribution: {
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
      };
    }

    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    const avgDeliveryRating = reviews.reduce((acc, r) => acc + r.deliveryRating, 0) / reviews.length;
    const avgQualityRating = reviews.reduce((acc, r) => acc + r.qualityRating, 0) / reviews.length;

    const distribution = {
      fiveStar: reviews.filter((r) => r.rating === 5).length,
      fourStar: reviews.filter((r) => r.rating === 4).length,
      threeStar: reviews.filter((r) => r.rating === 3).length,
      twoStar: reviews.filter((r) => r.rating === 2).length,
      oneStar: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      totalReviews: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      avgDeliveryRating: Math.round(avgDeliveryRating * 10) / 10,
      avgQualityRating: Math.round(avgQualityRating * 10) / 10,
      ratingDistribution: distribution,
    };
  },
});

export const submitReview = mutation({
  args: {
    buyerId: v.id("buyers"),
    floristId: v.id("florists"),
    orderId: v.id("buyerOrders"),
    rating: v.number(),
    deliveryRating: v.number(),
    qualityRating: v.number(),
    comment: v.optional(v.string()),
    photoUrls: v.optional(v.array(v.string())),
  },
  returns: v.id("floristReviews"),
  handler: async (ctx, args) => {
    // Check if review already exists for this order
    const existing = await ctx.db
      .query("floristReviews")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existing) {
      throw new Error("Review already exists for this order");
    }

    return await ctx.db.insert("floristReviews", {
      buyerId: args.buyerId,
      floristId: args.floristId,
      orderId: args.orderId,
      rating: args.rating,
      deliveryRating: args.deliveryRating,
      qualityRating: args.qualityRating,
      comment: args.comment,
      photoUrls: args.photoUrls ?? [],
      createdAt: Date.now(),
    });
  },
});