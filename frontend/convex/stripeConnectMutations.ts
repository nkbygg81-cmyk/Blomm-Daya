import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// Internal helpers for node actions (stripeConnect.ts)
export const getFloristForStripe = internalQuery({
  args: { floristId: v.id("florists") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("florists"),
      email: v.union(v.string(), v.null()),
      businessName: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
      stripeConnectAccountId: v.union(v.string(), v.null()),
      stripePayoutsEnabled: v.union(v.boolean(), v.null()),
      platformFeePercent: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const f: any = await ctx.db.get(args.floristId);
    if (!f) return null;
    return {
      _id: f._id,
      email: typeof f.email === "string" ? f.email : null,
      businessName: typeof f.businessName === "string" ? f.businessName : null,
      name: typeof f.name === "string" ? f.name : null,
      stripeConnectAccountId:
        typeof f.stripeConnectAccountId === "string" ? f.stripeConnectAccountId : null,
      stripePayoutsEnabled:
        typeof f.stripePayoutsEnabled === "boolean" ? f.stripePayoutsEnabled : null,
      platformFeePercent:
        typeof f.platformFeePercent === "number" ? f.platformFeePercent : null,
    };
  },
});

export const setStripeConnectAccount = internalMutation({
  args: {
    floristId: v.id("florists"),
    accountId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected")
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.floristId, {
      stripeConnectAccountId: args.accountId,
      stripeAccountStatus: args.status,
      stripeAccountUpdatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updateOrderPayoutInfo = internalMutation({
  args: {
    orderId: v.id("buyerOrders"),
    stripeTransferId: v.string(),
    floristPayout: v.number(),
    platformFee: v.number(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripeTransferId: args.stripeTransferId,
      floristPayout: args.floristPayout,
      platformFee: args.platformFee,
      payoutStatus: "completed",
      payoutCompletedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
* Query florist payment status
*/
export const getFloristPaymentStatus = query({
args: {
floristId: v.id("florists"),
},
returns: v.object({
hasStripeAccount: v.boolean(),
accountStatus: v.union(
v.literal("pending"),
v.literal("verified"),
v.literal("rejected"),
v.null()
),
stripeConnectAccountId: v.union(v.string(), v.null()),
}),
handler: async (ctx, args) => {
const florist = await ctx.db.get(args.floristId);

if (!florist) {
return {
  hasStripeAccount: false,
  accountStatus: null,
  stripeConnectAccountId: null,
};
}

return {
hasStripeAccount: !!florist.stripeConnectAccountId,
accountStatus: florist.stripeAccountStatus || null,
stripeConnectAccountId: florist.stripeConnectAccountId || null,
};
},
});

/**
* Update florist Stripe account status (called by webhook)
*/
export const updateStripeAccountStatus = mutation({
args: {
accountId: v.string(),
status: v.union(
v.literal("pending"),
v.literal("verified"),
v.literal("rejected")
),
detailsSubmitted: v.boolean(),
chargesEnabled: v.boolean(),
payoutsEnabled: v.boolean(),
},
returns: v.object({
success: v.boolean(),
}),
handler: async (ctx, args) => {
const florist = await ctx.db
.query("florists")
.withIndex("by_stripeConnectAccountId", (q: any) =>
q.eq("stripeConnectAccountId", args.accountId)
)
.first();

if (!florist) {
throw new Error("Флорист з таким Stripe акаунтом не знайдено");
}

await ctx.db.patch(florist._id, {
stripeAccountStatus: args.status,
stripeDetailsSubmitted: args.detailsSubmitted,
stripeChargesEnabled: args.chargesEnabled,
stripePayoutsEnabled: args.payoutsEnabled,
stripeAccountUpdatedAt: Date.now(),
});

return { success: true };
},
});