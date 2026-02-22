import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listForBuyer = query({
args: { buyerId: v.id("buyers") },
returns: v.array(v.object({
id: v.id("subscriptions"),
plan: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
flowerPreferences: v.union(v.string(), v.null()),
deliveryAddress: v.string(),
recipientName: v.string(),
budget: v.number(),
status: v.union(v.literal("active"), v.literal("paused"), v.literal("cancelled")),
nextDeliveryDate: v.string(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
const subs = await ctx.db
.query("subscriptions")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.order("desc")
.collect();

return subs.map((s) => ({
id: s._id,
plan: s.plan,
flowerPreferences: s.flowerPreferences ?? null,
deliveryAddress: s.deliveryAddress,
recipientName: s.recipientName,
budget: s.budget,
status: s.status,
nextDeliveryDate: s.nextDeliveryDate,
createdAt: s.createdAt,
}));
},
});

export const create = mutation({
args: {
buyerId: v.id("buyers"),
buyerDeviceId: v.string(),
plan: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
flowerPreferences: v.optional(v.string()),
deliveryAddress: v.string(),
recipientName: v.string(),
recipientPhone: v.string(),
budget: v.number(),
floristId: v.optional(v.id("florists")),
},
returns: v.id("subscriptions"),
handler: async (ctx, args) => {
const now = Date.now();
const nextDate = new Date();
if (args.plan === "weekly") nextDate.setDate(nextDate.getDate() + 7);
else if (args.plan === "biweekly") nextDate.setDate(nextDate.getDate() + 14);
else nextDate.setMonth(nextDate.getMonth() + 1);

return await ctx.db.insert("subscriptions", {
buyerId: args.buyerId,
buyerDeviceId: args.buyerDeviceId,
plan: args.plan,
flowerPreferences: args.flowerPreferences,
deliveryAddress: args.deliveryAddress,
recipientName: args.recipientName,
recipientPhone: args.recipientPhone,
budget: args.budget,
status: "active",
nextDeliveryDate: nextDate.toISOString().split("T")[0],
floristId: args.floristId,
createdAt: now,
updatedAt: now,
});
},
});

export const updateStatus = mutation({
args: {
subscriptionId: v.id("subscriptions"),
status: v.union(v.literal("active"), v.literal("paused"), v.literal("cancelled")),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.subscriptionId, {
status: args.status,
updatedAt: Date.now(),
});
return null;
},
});
