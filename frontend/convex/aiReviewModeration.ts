import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Banned words for auto-rejection
const BANNED_WORDS_UK = [
  "спам", "шахрай", "обман", "фейк", "брехня",
  // Add more as needed
];

const BANNED_WORDS_EN = [
  "spam", "scam", "fraud", "fake", "lie",
];

// Auto-moderate review text
function autoModerateText(text: string): { passed: boolean; reason?: string } {
  const textLower = text.toLowerCase();
  
  // Check for banned words
  for (const word of [...BANNED_WORDS_UK, ...BANNED_WORDS_EN]) {
    if (textLower.includes(word)) {
      return { passed: false, reason: `Contains banned word: ${word}` };
    }
  }

  // Check for excessive caps (spam indicator)
  const capsRatio = (text.match(/[A-ZА-ЯІЇЄ]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 20) {
    return { passed: false, reason: "Excessive use of capital letters" };
  }

  // Check for repeated characters (spam indicator)
  if (/(.)\1{4,}/.test(text)) {
    return { passed: false, reason: "Repeated characters detected" };
  }

  // Check for URLs (potential spam)
  if (/(https?:\/\/|www\.)/i.test(text)) {
    return { passed: false, reason: "URLs not allowed in reviews" };
  }

  // Check for phone numbers (privacy)
  if (/\+?\d{10,}/.test(text.replace(/\s/g, ""))) {
    return { passed: false, reason: "Phone numbers not allowed" };
  }

  // Check minimum length
  if (text.length < 10) {
    return { passed: false, reason: "Review too short" };
  }

  return { passed: true };
}

// Auto-moderate a review
export const autoModerateReview = mutation({
  args: {
    reviewId: v.union(v.id("floristReviews"), v.id("reviews")),
    reviewType: v.union(v.literal("florist"), v.literal("flower")),
  },
  returns: v.object({
    passed: v.boolean(),
    reason: v.optional(v.string()),
    score: v.number(),
  }),
  handler: async (ctx, args) => {
    let review: any;
    
    if (args.reviewType === "florist") {
      review = await ctx.db.get(args.reviewId as any);
    } else {
      review = await ctx.db.get(args.reviewId as any);
    }

    if (!review) {
      return { passed: false, reason: "Review not found", score: 0 };
    }

    const text = review.comment || review.text || "";
    const moderationResult = autoModerateText(text);

    // Calculate trust score (0-100)
    let score = 50; // Base score

    // Positive factors
    if (text.length >= 50) score += 10; // Detailed review
    if (review.rating >= 3 && review.rating <= 5) score += 10; // Normal rating
    if (!moderationResult.reason) score += 20; // Clean content

    // Negative factors
    if (review.rating === 1 && text.length < 30) score -= 20; // Short angry review
    if (moderationResult.reason) score -= 30; // Has issues

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Save moderation result
    await ctx.db.insert("reviewModerations", {
      reviewId: args.reviewId.toString(),
      reviewType: args.reviewType,
      passed: moderationResult.passed,
      reason: moderationResult.reason,
      score,
      autoModerated: true,
      moderatedAt: Date.now(),
    });

    return {
      passed: moderationResult.passed,
      reason: moderationResult.reason,
      score,
    };
  },
});

// Get pending reviews for manual moderation
export const getPendingReviews = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.string(),
    reviewType: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    autoScore: v.optional(v.number()),
    flagReason: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get florist reviews that failed auto-moderation
    const moderations = await ctx.db
      .query("reviewModerations")
      .filter((q) => q.eq(q.field("passed"), false))
      .order("desc")
      .take(limit);

    const results = [];
    
    for (const mod of moderations) {
      if (mod.reviewType === "florist") {
        const review = await ctx.db.get(mod.reviewId as any);
        if (review) {
          results.push({
            _id: mod.reviewId,
            reviewType: mod.reviewType,
            rating: (review as any).rating || 0,
            comment: (review as any).comment,
            createdAt: (review as any).createdAt || mod.moderatedAt,
            autoScore: mod.score,
            flagReason: mod.reason,
          });
        }
      }
    }

    return results;
  },
});

// Manual approve review
export const manualApproveReview = mutation({
  args: {
    reviewId: v.string(),
    reviewType: v.string(),
    moderatorNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update moderation record
    const moderation = await ctx.db
      .query("reviewModerations")
      .filter((q) => q.eq(q.field("reviewId"), args.reviewId))
      .first();

    if (moderation) {
      await ctx.db.patch(moderation._id, {
        passed: true,
        manuallyReviewed: true,
        moderatorNote: args.moderatorNote,
        manualReviewedAt: Date.now(),
      });
    }

    return null;
  },
});

// Manual reject review
export const manualRejectReview = mutation({
  args: {
    reviewId: v.string(),
    reviewType: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update moderation record
    const moderation = await ctx.db
      .query("reviewModerations")
      .filter((q) => q.eq(q.field("reviewId"), args.reviewId))
      .first();

    if (moderation) {
      await ctx.db.patch(moderation._id, {
        passed: false,
        manuallyReviewed: true,
        reason: args.reason,
        manualReviewedAt: Date.now(),
      });
    }

    // Delete the review
    if (args.reviewType === "florist") {
      await ctx.db.delete(args.reviewId as any);
    } else {
      await ctx.db.delete(args.reviewId as any);
    }

    return null;
  },
});

// Get moderation stats
export const getModerationStats = query({
  args: {},
  returns: v.object({
    totalModerated: v.number(),
    autoPassed: v.number(),
    autoRejected: v.number(),
    manuallyReviewed: v.number(),
    averageScore: v.number(),
  }),
  handler: async (ctx) => {
    const allModerations = await ctx.db.query("reviewModerations").collect();

    const autoPassed = allModerations.filter((m) => m.passed && !m.manuallyReviewed).length;
    const autoRejected = allModerations.filter((m) => !m.passed && !m.manuallyReviewed).length;
    const manuallyReviewed = allModerations.filter((m) => m.manuallyReviewed).length;
    const totalScore = allModerations.reduce((sum, m) => sum + (m.score || 0), 0);

    return {
      totalModerated: allModerations.length,
      autoPassed,
      autoRejected,
      manuallyReviewed,
      averageScore: allModerations.length > 0 ? Math.round(totalScore / allModerations.length) : 0,
    };
  },
});
