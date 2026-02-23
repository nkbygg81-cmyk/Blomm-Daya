import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Badge definitions
export const BADGES = {
  first_order: {
    id: "first_order",
    name: "Перше замовлення",
    description: "Зробіть перше замовлення",
    icon: "ribbon",
    requirement: 1,
    type: "orders",
  },
  loyal_5: {
    id: "loyal_5",
    name: "5 замовлень",
    description: "Зробіть 5 замовлень",
    icon: "star",
    requirement: 5,
    type: "orders",
  },
  loyal_10: {
    id: "loyal_10",
    name: "10 замовлень",
    description: "Зробіть 10 замовлень",
    icon: "trophy",
    requirement: 10,
    type: "orders",
  },
  big_spender: {
    id: "big_spender",
    name: "VIP клієнт",
    description: "Витратьте більше 5000 kr",
    icon: "diamond",
    requirement: 5000,
    type: "spending",
  },
  reviewer: {
    id: "reviewer",
    name: "Відгукодавець",
    description: "Залиште 3 відгуки",
    icon: "chatbox",
    requirement: 3,
    type: "reviews",
  },
  referrer: {
    id: "referrer",
    name: "Рекомендатор",
    description: "Запросіть 3 друзів",
    icon: "people",
    requirement: 3,
    type: "referrals",
  },
  early_bird: {
    id: "early_bird",
    name: "Ранній птах",
    description: "Замовте до 8:00 ранку",
    icon: "sunny",
    requirement: 1,
    type: "special",
  },
  night_owl: {
    id: "night_owl",
    name: "Нічна сова",
    description: "Замовте після 22:00",
    icon: "moon",
    requirement: 1,
    type: "special",
  },
} as const;

// Get all badges available
export const getAllBadges = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    requirement: v.number(),
    type: v.string(),
  })),
  handler: async () => {
    return Object.values(BADGES);
  },
});

// Get user badges
export const getUserBadges = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.array(v.object({
    badgeId: v.string(),
    earnedAt: v.number(),
    badge: v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
    }),
  })),
  handler: async (ctx, args) => {
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    return userBadges.map((ub) => {
      const badge = BADGES[ub.badgeId as keyof typeof BADGES];
      return {
        badgeId: ub.badgeId,
        earnedAt: ub.earnedAt,
        badge: badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
        } : {
          id: ub.badgeId,
          name: "Unknown Badge",
          description: "",
          icon: "help",
        },
      };
    });
  },
});

// Get user progress towards badges
export const getUserProgress = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.object({
    ordersCount: v.number(),
    totalSpent: v.number(),
    reviewsCount: v.number(),
    referralsCount: v.number(),
    earnedBadges: v.array(v.string()),
    level: v.number(),
    xp: v.number(),
    nextLevelXp: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get orders count
    const orders = await ctx.db
      .query("buyerOrders")
      .filter((q) => q.eq(q.field("buyerDeviceId"), args.buyerDeviceId))
      .collect();
    
    const completedOrders = orders.filter((o) => 
      o.status === "delivered" || o.status === "completed"
    );

    // Calculate total spent
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Get reviews count
    const reviews = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("buyerDeviceId"), args.buyerDeviceId))
      .collect();

    // Get referrals count
    const referrals = await ctx.db
      .query("referrals")
      .filter((q) => q.eq(q.field("referrerId"), args.buyerDeviceId))
      .collect();
    
    const successfulReferrals = referrals.filter((r) => r.status === "completed");

    // Get earned badges
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();

    // Calculate XP and level
    const xp = (completedOrders.length * 100) + (Math.floor(totalSpent / 100) * 10) + (reviews.length * 50);
    const level = Math.floor(xp / 500) + 1;
    const currentLevelXp = xp % 500;
    const nextLevelXp = 500;

    return {
      ordersCount: completedOrders.length,
      totalSpent,
      reviewsCount: reviews.length,
      referralsCount: successfulReferrals.length,
      earnedBadges: userBadges.map((b) => b.badgeId),
      level,
      xp: currentLevelXp,
      nextLevelXp,
    };
  },
});

// Award badge to user
export const awardBadge = mutation({
  args: {
    buyerDeviceId: v.string(),
    badgeId: v.string(),
  },
  returns: v.union(v.id("userBadges"), v.null()),
  handler: async (ctx, args) => {
    // Check if user already has this badge
    const existing = await ctx.db
      .query("userBadges")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (existing) return null;

    return await ctx.db.insert("userBadges", {
      buyerDeviceId: args.buyerDeviceId,
      badgeId: args.badgeId,
      earnedAt: Date.now(),
    });
  },
});

// Check and award badges after order completion
export const checkAndAwardBadges = internalMutation({
  args: {
    buyerDeviceId: v.string(),
    orderId: v.id("buyerOrders"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const awardedBadges: string[] = [];

    // Get current user progress
    const orders = await ctx.db
      .query("buyerOrders")
      .filter((q) => 
        q.and(
          q.eq(q.field("buyerDeviceId"), args.buyerDeviceId),
          q.or(
            q.eq(q.field("status"), "delivered"),
            q.eq(q.field("status"), "completed")
          )
        )
      )
      .collect();

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const ordersCount = orders.length;

    // Get existing badges
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .collect();
    
    const earnedIds = new Set(userBadges.map((b) => b.badgeId));

    // Check first order badge
    if (ordersCount >= 1 && !earnedIds.has("first_order")) {
      await ctx.db.insert("userBadges", {
        buyerDeviceId: args.buyerDeviceId,
        badgeId: "first_order",
        earnedAt: Date.now(),
      });
      awardedBadges.push("first_order");
    }

    // Check 5 orders badge
    if (ordersCount >= 5 && !earnedIds.has("loyal_5")) {
      await ctx.db.insert("userBadges", {
        buyerDeviceId: args.buyerDeviceId,
        badgeId: "loyal_5",
        earnedAt: Date.now(),
      });
      awardedBadges.push("loyal_5");
    }

    // Check 10 orders badge
    if (ordersCount >= 10 && !earnedIds.has("loyal_10")) {
      await ctx.db.insert("userBadges", {
        buyerDeviceId: args.buyerDeviceId,
        badgeId: "loyal_10",
        earnedAt: Date.now(),
      });
      awardedBadges.push("loyal_10");
    }

    // Check big spender badge
    if (totalSpent >= 5000 && !earnedIds.has("big_spender")) {
      await ctx.db.insert("userBadges", {
        buyerDeviceId: args.buyerDeviceId,
        badgeId: "big_spender",
        earnedAt: Date.now(),
      });
      awardedBadges.push("big_spender");
    }

    // Check time-based badges
    const order = await ctx.db.get(args.orderId);
    if (order) {
      const orderDate = new Date(order.createdAt);
      const hour = orderDate.getHours();

      // Early bird (before 8 AM)
      if (hour < 8 && !earnedIds.has("early_bird")) {
        await ctx.db.insert("userBadges", {
          buyerDeviceId: args.buyerDeviceId,
          badgeId: "early_bird",
          earnedAt: Date.now(),
        });
        awardedBadges.push("early_bird");
      }

      // Night owl (after 10 PM)
      if (hour >= 22 && !earnedIds.has("night_owl")) {
        await ctx.db.insert("userBadges", {
          buyerDeviceId: args.buyerDeviceId,
          badgeId: "night_owl",
          earnedAt: Date.now(),
        });
        awardedBadges.push("night_owl");
      }
    }

    return awardedBadges;
  },
});

// Get leaderboard (top users by XP)
export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    rank: v.number(),
    buyerDeviceId: v.string(),
    level: v.number(),
    xp: v.number(),
    badgesCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get all orders grouped by buyer
    const allOrders = await ctx.db.query("buyerOrders").collect();
    
    // Calculate XP for each buyer
    const buyerStats: Map<string, { xp: number; ordersCount: number }> = new Map();
    
    for (const order of allOrders) {
      if (order.status === "delivered" || order.status === "completed") {
        const existing = buyerStats.get(order.buyerDeviceId) || { xp: 0, ordersCount: 0 };
        existing.ordersCount += 1;
        existing.xp += 100 + Math.floor((order.total || 0) / 100) * 10;
        buyerStats.set(order.buyerDeviceId, existing);
      }
    }

    // Get badges count for each buyer
    const allBadges = await ctx.db.query("userBadges").collect();
    const badgesCount: Map<string, number> = new Map();
    for (const badge of allBadges) {
      badgesCount.set(badge.buyerDeviceId, (badgesCount.get(badge.buyerDeviceId) || 0) + 1);
    }

    // Sort by XP and return top users
    const sorted = Array.from(buyerStats.entries())
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, limit);

    return sorted.map(([buyerId, stats], index) => ({
      rank: index + 1,
      buyerDeviceId: buyerId,
      level: Math.floor(stats.xp / 500) + 1,
      xp: stats.xp,
      badgesCount: badgesCount.get(buyerId) || 0,
    }));
  },
});
