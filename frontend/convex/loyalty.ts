import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const POINTS_PER_KR = 1; // 1 point per 1 kr spent

export const getBalance = query({
args: { buyerId: v.id("buyers") },
returns: v.object({
points: v.number(),
totalEarned: v.number(),
totalSpent: v.number(),
level: v.string(),
nextLevelPoints: v.number(),
}),
handler: async (ctx, args) => {
const balance = await ctx.db
.query("loyaltyPoints")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
.first();

const points = balance?.points ?? 0;
const totalEarned = balance?.totalEarned ?? 0;

let level = "Bronze";
let nextLevelPoints = 500;
if (totalEarned >= 2000) {
level = "Gold";
nextLevelPoints = 0;
} else if (totalEarned >= 500) {
level = "Silver";
nextLevelPoints = 2000 - totalEarned;
} else {
nextLevelPoints = 500 - totalEarned;
}

return {
points,
totalEarned,
totalSpent: balance?.totalSpent ?? 0,
level,
nextLevelPoints,
};
},
});

export const getHistory = query({
args: { buyerId: v.id("buyers") },
returns: v.array(v.object({
id: v.id("loyaltyTransactions"),
points: v.number(),
type: v.union(v.literal("earned"), v.literal("spent"), v.literal("bonus")),
description: v.string(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
const transactions = await ctx.db
.query("loyaltyTransactions")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
.order("desc")
.take(50);

return transactions.map((t: any) => ({
id: t._id,
points: t.points,
type: t.type,
description: t.description,
createdAt: t.createdAt,
}));
},
});

export const earnPoints = mutation({
args: {
buyerId: v.id("buyers"),
orderId: v.id("buyerOrders"),
orderTotal: v.number(),
},
returns: v.number(),
handler: async (ctx, args) => {
const pointsEarned = Math.floor(args.orderTotal * POINTS_PER_KR);
const now = Date.now();

// Get or create balance
const existing = await ctx.db
.query("loyaltyPoints")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
.first();

if (existing) {
await ctx.db.patch(existing._id, {
points: existing.points + pointsEarned,
totalEarned: existing.totalEarned + pointsEarned,
updatedAt: now,
});
} else {
await ctx.db.insert("loyaltyPoints", {
buyerId: args.buyerId,
points: pointsEarned,
totalEarned: pointsEarned,
totalSpent: 0,
updatedAt: now,
});
}

// Record transaction
await ctx.db.insert("loyaltyTransactions", {
buyerId: args.buyerId,
points: pointsEarned,
type: "earned",
description: `Замовлення на ${args.orderTotal} kr`,
orderId: args.orderId,
createdAt: now,
});

return pointsEarned;
},
});

export const spendPoints = mutation({
args: {
buyerId: v.id("buyers"),
points: v.number(),
description: v.string(),
},
returns: v.boolean(),
handler: async (ctx, args) => {
const balance = await ctx.db
.query("loyaltyPoints")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
.first();

if (!balance || balance.points < args.points) {
return false;
}

await ctx.db.patch(balance._id, {
points: balance.points - args.points,
totalSpent: balance.totalSpent + args.points,
updatedAt: Date.now(),
});

await ctx.db.insert("loyaltyTransactions", {
buyerId: args.buyerId,
points: -args.points,
type: "spent",
description: args.description,
createdAt: Date.now(),
});

return true;
},
});
