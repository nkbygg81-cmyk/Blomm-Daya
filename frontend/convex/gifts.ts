import { v } from "convex/values";
import { query } from "./_generated/server";

export const listAvailable = query({
args: {},
handler: async (ctx) => {
const gifts = await ctx.db
.query("gifts")
.withIndex("by_available", (q) => q.eq("available", true))
.collect();

return gifts;
},
returns: v.any(),
});

export const listByCategory = query({
args: {
category: v.string(),
},
handler: async (ctx, { category }) => {
const gifts = await ctx.db
.query("gifts")
.withIndex("by_category", (q) => q.eq("category", category))
.filter((q) => q.eq(q.field("available"), true))
.collect();

return gifts;
},
returns: v.any(),
});
