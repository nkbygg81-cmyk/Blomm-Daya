import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Get similar products based on flower attributes
export const getSimilarProducts = query({
  args: {
    flowerId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("flowers"),
    id: v.string(),
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    floristId: v.optional(v.id("florists")),
    floristName: v.optional(v.string()),
    category: v.optional(v.string()),
    similarityScore: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 6;
    
    // Get all flowers
    const allFlowers = await ctx.db
      .query("flowers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Find the source flower
    const sourceFlower = allFlowers.find((f) => f._id.toString() === args.flowerId);
    if (!sourceFlower) {
      return [];
    }

    // Calculate similarity scores
    const scoredFlowers = allFlowers
      .filter((f) => f._id.toString() !== args.flowerId) // Exclude source
      .map((flower) => {
        let score = 0;

        // Same category = +30 points
        if (flower.category === sourceFlower.category) {
          score += 30;
        }

        // Similar price range (within 30%) = +25 points
        const priceDiff = Math.abs((flower.price || 0) - (sourceFlower.price || 0));
        const priceRange = (sourceFlower.price || 100) * 0.3;
        if (priceDiff <= priceRange) {
          score += 25;
        } else if (priceDiff <= priceRange * 2) {
          score += 10;
        }

        // Same florist = +15 points (customer trusts this florist)
        if (flower.floristId && flower.floristId === sourceFlower.floristId) {
          score += 15;
        }

        // Both have images = +10 points (better UX)
        if (flower.imageUrl && sourceFlower.imageUrl) {
          score += 10;
        }

        // In stock bonus = +5 points
        if (flower.inStock !== false) {
          score += 5;
        }

        // Higher rating bonus
        if (flower.rating && flower.rating >= 4) {
          score += 10;
        }

        return {
          ...flower,
          similarityScore: score,
        };
      })
      .filter((f) => f.similarityScore > 0) // Only show related items
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    // Get florist names
    const floristIds = [...new Set(scoredFlowers.filter((f) => f.floristId).map((f) => f.floristId))];
    const florists = await Promise.all(
      floristIds.map((id) => ctx.db.get(id!))
    );
    const floristMap = new Map(florists.filter(Boolean).map((f) => [f!._id, f!.businessName]));

    return scoredFlowers.map((f) => ({
      _id: f._id,
      id: f._id.toString(),
      name: f.name,
      nameUk: f.nameUk,
      nameSv: f.nameSv,
      price: f.price || 0,
      currency: f.currency || "kr",
      imageUrl: f.imageUrl,
      floristId: f.floristId,
      floristName: f.floristId ? floristMap.get(f.floristId) : undefined,
      category: f.category,
      similarityScore: f.similarityScore,
    }));
  },
});

// Get recommendations for a user based on history
export const getPersonalizedRecommendations = query({
  args: {
    buyerDeviceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("flowers"),
    id: v.string(),
    name: v.string(),
    nameUk: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    reason: v.string(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 8;

    // Get user's order history
    const orders = await ctx.db
      .query("buyerOrders")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .order("desc")
      .take(10);

    // Get user's wishlist
    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    // Collect categories and price ranges from history
    const purchasedCategories: string[] = [];
    const purchasedPrices: number[] = [];
    const purchasedFlorists: string[] = [];
    const purchasedFlowerIds: string[] = [];

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        purchasedFlowerIds.push(item.flowerId);
        purchasedPrices.push(item.price);
      });
    });

    // Get all active flowers
    const allFlowers = await ctx.db
      .query("flowers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Add category info from purchased flowers
    allFlowers.forEach((f) => {
      if (purchasedFlowerIds.includes(f._id.toString()) && f.category) {
        purchasedCategories.push(f.category);
        if (f.floristId) {
          purchasedFlorists.push(f.floristId.toString());
        }
      }
    });

    // Calculate average price
    const avgPrice = purchasedPrices.length > 0
      ? purchasedPrices.reduce((a, b) => a + b, 0) / purchasedPrices.length
      : 500;

    // Score flowers
    const recommendations = allFlowers
      .filter((f) => !purchasedFlowerIds.includes(f._id.toString())) // Not already purchased
      .filter((f) => !wishlist.some((w) => w.flowerId === f._id.toString())) // Not in wishlist
      .map((flower) => {
        let score = 0;
        let reason = "Популярний вибір";

        // Preferred category
        if (flower.category && purchasedCategories.includes(flower.category)) {
          score += 40;
          reason = "На основі ваших покупок";
        }

        // Price in range (within 50% of average)
        const priceDiff = Math.abs((flower.price || 0) - avgPrice);
        if (priceDiff <= avgPrice * 0.5) {
          score += 20;
        }

        // From trusted florist
        if (flower.floristId && purchasedFlorists.includes(flower.floristId.toString())) {
          score += 25;
          reason = "Від улюбленого флориста";
        }

        // Good rating
        if (flower.rating && flower.rating >= 4.5) {
          score += 15;
          reason = "Високий рейтинг";
        }

        // New arrivals bonus
        if (flower.createdAt && Date.now() - flower.createdAt < 7 * 24 * 60 * 60 * 1000) {
          score += 10;
          reason = "Новинка";
        }

        return { flower, score, reason };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations.map((r) => ({
      _id: r.flower._id,
      id: r.flower._id.toString(),
      name: r.flower.name,
      nameUk: r.flower.nameUk,
      price: r.flower.price || 0,
      currency: r.flower.currency || "kr",
      imageUrl: r.flower.imageUrl,
      reason: r.reason,
    }));
  },
});

// Get trending products
export const getTrendingProducts = query({
  args: {
    limit: v.optional(v.number()),
    city: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("flowers"),
    id: v.string(),
    name: v.string(),
    nameUk: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    orderCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Get recent orders
    const recentOrders = await ctx.db
      .query("buyerOrders")
      .filter((q) => q.gt(q.field("createdAt"), oneWeekAgo))
      .collect();

    // Count flower occurrences
    const flowerCounts: Record<string, number> = {};
    recentOrders.forEach((order) => {
      order.items.forEach((item: any) => {
        flowerCounts[item.flowerId] = (flowerCounts[item.flowerId] || 0) + item.qty;
      });
    });

    // Get top flower IDs
    const topFlowerIds = Object.entries(flowerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    // Get flower details
    const allFlowers = await ctx.db
      .query("flowers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const trending = topFlowerIds
      .map((id) => {
        const flower = allFlowers.find((f) => f._id.toString() === id);
        if (!flower) return null;
        return {
          _id: flower._id,
          id: flower._id.toString(),
          name: flower.name,
          nameUk: flower.nameUk,
          price: flower.price || 0,
          currency: flower.currency || "kr",
          imageUrl: flower.imageUrl,
          orderCount: flowerCounts[id],
        };
      })
      .filter(Boolean) as any[];

    return trending;
  },
});
