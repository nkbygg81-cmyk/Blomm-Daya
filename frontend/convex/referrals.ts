import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a unique referral code
function createReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BL-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get referral data for a buyer
export const getMyReferralData = query({
  args: {
    buyerId: v.id("buyers"),
  },
  returns: v.object({
    referralCode: v.optional(v.string()),
    totalReferrals: v.number(),
    completedReferrals: v.number(),
    pendingReferrals: v.number(),
    totalEarned: v.number(),
    referrals: v.array(v.object({
      referredName: v.optional(v.string()),
      status: v.string(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      bonusAmount: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Find referral with this buyer as referrer
    const referralRecord = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.buyerId))
      .first();

    // Get all referrals made by this buyer
    const allReferrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.buyerId))
      .collect();

    const referralCode = referralRecord?.referralCode;

    // Count stats
    const completedReferrals = allReferrals.filter(r => r.status === "completed").length;
    const pendingReferrals = allReferrals.filter(r => r.status === "pending").length;
    const totalEarned = allReferrals
      .filter(r => r.status === "completed" && r.bonusPaid)
      .reduce((sum, r) => sum + r.bonusAmount, 0);

    // Get referred buyer names
    const referralsWithNames = await Promise.all(
      allReferrals.map(async (ref) => {
        let referredName: string | undefined;
        if (ref.referredId) {
          const referred = await ctx.db.get(ref.referredId) as any;
          referredName = referred?.name ?? referred?.email;
        }
        return {
          referredName,
          status: ref.status,
          createdAt: ref.createdAt,
          completedAt: ref.completedAt,
          bonusAmount: ref.bonusAmount,
        };
      })
    );

    return {
      referralCode,
      totalReferrals: allReferrals.length,
      completedReferrals,
      pendingReferrals,
      totalEarned,
      referrals: referralsWithNames,
    };
  },
});

// Generate a new referral code for a buyer
export const generateReferralCode = mutation({
  args: {
    buyerId: v.id("buyers"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if buyer already has a referral code
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.buyerId))
      .first();

    if (existingReferral?.referralCode) {
      return existingReferral.referralCode;
    }

    // Generate unique code
    let code = createReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("referrals")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
        .first();
      if (!existing) break;
      code = createReferralCode();
      attempts++;
    }

    // Create referral record
    await ctx.db.insert("referrals", {
      referrerId: args.buyerId,
      referralCode: code,
      status: "pending",
      bonusAmount: 50, // Default bonus
      bonusPaid: false,
      createdAt: Date.now(),
    });

    return code;
  },
});

// Apply a referral code (when a new user signs up)
export const applyReferralCode = mutation({
  args: {
    code: v.string(),
    newBuyerId: v.id("buyers"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    referrerBonus: v.optional(v.number()),
    newUserBonus: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Find the referral record by code
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.code.toUpperCase()))
      .first();

    if (!referral) {
      return {
        success: false,
        message: "Invalid referral code",
      };
    }

    // Check if the new buyer is not the same as the referrer
    if (referral.referrerId === args.newBuyerId) {
      return {
        success: false,
        message: "You cannot use your own referral code",
      };
    }

    // Check if this new buyer already used a referral code
    const existingUsage = await ctx.db
      .query("referrals")
      .filter((q) => q.eq(q.field("referredId"), args.newBuyerId))
      .first();

    if (existingUsage) {
      return {
        success: false,
        message: "You have already used a referral code",
      };
    }

    // Get referral settings
    const referrerBonusSetting = await ctx.db
      .query("platformSettings")
      .filter((q) => q.eq(q.field("key"), "referrer_bonus"))
      .first();
    const referredBonusSetting = await ctx.db
      .query("platformSettings")
      .filter((q) => q.eq(q.field("key"), "referred_bonus"))
      .first();

    const referrerBonus = typeof referrerBonusSetting?.value === "number" ? referrerBonusSetting.value : 50;
    const referredBonus = typeof referredBonusSetting?.value === "number" ? referredBonusSetting.value : 25;

    // Create new referral entry for this specific referral
    await ctx.db.insert("referrals", {
      referrerId: referral.referrerId,
      referredId: args.newBuyerId,
      referralCode: referral.referralCode,
      status: "pending",
      bonusAmount: referrerBonus,
      bonusPaid: false,
      createdAt: Date.now(),
    });

    // Add bonus to new user's loyalty points
    const newBuyer = await ctx.db.get(args.newBuyerId) as any;
    if (newBuyer) {
      await ctx.db.patch(args.newBuyerId, {
        loyaltyPoints: (newBuyer.loyaltyPoints ?? 0) + referredBonus,
      });
    }

    return {
      success: true,
      message: "Referral code applied successfully",
      referrerBonus,
      newUserBonus: referredBonus,
    };
  },
});

// Complete a referral (called when referred user makes first purchase)
export const completeReferral = mutation({
  args: {
    referredBuyerId: v.id("buyers"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Find pending referral for this buyer
    const referral = await ctx.db
      .query("referrals")
      .filter((q) => 
        q.and(
          q.eq(q.field("referredId"), args.referredBuyerId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (!referral) {
      return false;
    }

    // Update referral status
    await ctx.db.patch(referral._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Add bonus to referrer's loyalty points
    const referrer = await ctx.db.get(referral.referrerId) as any;
    if (referrer) {
      await ctx.db.patch(referral.referrerId, {
        loyaltyPoints: (referrer.loyaltyPoints ?? 0) + referral.bonusAmount,
      });

      // Mark bonus as paid
      await ctx.db.patch(referral._id, {
        bonusPaid: true,
      });
    }

    return true;
  },
});

// Get referral code by code string (for validation)
export const getReferralByCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      referrerName: v.optional(v.string()),
      bonus: v.number(),
    }),
    v.object({
      valid: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.code.toUpperCase()))
      .first();

    if (!referral) {
      return { valid: false as const };
    }

    const referrer = await ctx.db.get(referral.referrerId) as any;
    
    // Get bonus setting
    const bonusSetting = await ctx.db
      .query("platformSettings")
      .filter((q) => q.eq(q.field("key"), "referred_bonus"))
      .first();
    const bonus = typeof bonusSetting?.value === "number" ? bonusSetting.value : 25;

    return {
      valid: true as const,
      referrerName: referrer?.name,
      bonus,
    };
  },
});
