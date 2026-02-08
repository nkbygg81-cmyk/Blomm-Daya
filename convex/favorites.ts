import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
args: {
buyerId: v.id("buyers"),
flowerId: v.string(),
},
returns: v.id("favorites"),
handler: async (ctx, args) => {
// Check if already favorited
const existing = await ctx.db
.query("favorites")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.filter((q) => q.eq(q.field("flowerId"), args.flowerId))
.first();

if (existing) {
return existing._id;
}

return await ctx.db.insert("favorites", {
buyerId: args.buyerId,
flowerId: args.flowerId,
createdAt: Date.now(),
});
},
});

export const remove = mutation({
args: {
buyerId: v.id("buyers"),
flowerId: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
const favorite = await ctx.db
.query("favorites")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.filter((q) => q.eq(q.field("flowerId"), args.flowerId))
.first();

if (favorite) {
await ctx.db.delete(favorite._id);
}
},
});

export const listForBuyer = query({
args: { buyerId: v.id("buyers") },
returns: v.array(v.object({
flowerId: v.string(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
const favorites = await ctx.db
.query("favorites")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.order("desc")
.collect();

return favorites.map(f => ({
flowerId: f.flowerId,
createdAt: f.createdAt,
}));
},
});

export const isFavorite = query({
args: {
buyerId: v.id("buyers"),
flowerId: v.string(),
},
returns: v.boolean(),
handler: async (ctx, args) => {
const favorite = await ctx.db
.query("favorites")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.filter((q) => q.eq(q.field("flowerId"), args.flowerId))
.first();

return !!favorite;
},
});
