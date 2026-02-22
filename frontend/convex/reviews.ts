import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
args: {
buyerId: v.id("buyers"),
orderId: v.id("buyerOrders"),
flowerId: v.string(),
rating: v.number(),
comment: v.optional(v.string()),
images: v.optional(v.array(v.string())),
},
returns: v.id("reviews"),
handler: async (ctx, args) => {
// Check if review already exists
const existing = await ctx.db
.query("reviews")
.withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
.filter((q) => q.eq(q.field("flowerId"), args.flowerId))
.first();

if (existing) {
throw new Error("Review already exists for this flower in this order");
}

return await ctx.db.insert("reviews", {
buyerId: args.buyerId,
orderId: args.orderId,
flowerId: args.flowerId,
rating: Math.min(5, Math.max(1, args.rating)),
comment: args.comment,
images: args.images,
createdAt: Date.now(),
});
},
});

export const listForFlower = query({
args: { 
flowerId: v.string(),
limit: v.optional(v.number()),
},
returns: v.array(v.object({
id: v.id("reviews"),
buyerName: v.union(v.string(), v.null()),
rating: v.number(),
comment: v.union(v.string(), v.null()),
images: v.union(v.array(v.string()), v.null()),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
const reviews = await ctx.db
.query("reviews")
.withIndex("by_flowerId", (q) => q.eq("flowerId", args.flowerId))
.order("desc")
.take(args.limit ?? 50);

const enriched = await Promise.all(
reviews.map(async (review) => {
const buyer = await ctx.db.get(review.buyerId);
return {
id: review._id,
buyerName: buyer?.name ?? null,
rating: review.rating,
comment: review.comment ?? null,
images: review.images ?? null,
createdAt: review.createdAt,
};
})
);

return enriched;
},
});

export const getAverageRating = query({
args: { flowerId: v.string() },
returns: v.object({
average: v.number(),
count: v.number(),
}),
handler: async (ctx, args) => {
const reviews = await ctx.db
.query("reviews")
.withIndex("by_flowerId", (q) => q.eq("flowerId", args.flowerId))
.collect();

if (reviews.length === 0) {
return { average: 0, count: 0 };
}

const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
return {
average: sum / reviews.length,
count: reviews.length,
};
},
});

export const canReview = query({
args: {
buyerId: v.id("buyers"),
orderId: v.id("buyerOrders"),
flowerId: v.string(),
},
returns: v.boolean(),
handler: async (ctx, args) => {
// Check if order exists and is delivered
const order = await ctx.db.get(args.orderId);
if (!order || order.status !== "delivered") {
return false;
}

// Check if review already exists
const existing = await ctx.db
.query("reviews")
.withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
.filter((q) => q.eq(q.field("flowerId"), args.flowerId))
.first();

return !existing;
},
});
