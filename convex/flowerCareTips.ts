import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getForFlower = query({
args: { flowerName: v.string() },
returns: v.union(
v.null(),
v.object({
id: v.id("flowerCareTips"),
flowerName: v.string(),
tips: v.array(v.string()),
wateringSchedule: v.string(),
sunlight: v.string(),
lifespan: v.string(),
})
),
handler: async (ctx, args) => {
const normalized = args.flowerName.toLowerCase().trim();
const tips = await ctx.db
.query("flowerCareTips")
.withIndex("by_flowerName", (q: any) => q.eq("flowerName", normalized))
.first();

if (!tips) return null;

return {
id: tips._id,
flowerName: tips.flowerName,
tips: tips.tips,
wateringSchedule: tips.wateringSchedule,
sunlight: tips.sunlight,
lifespan: tips.lifespan,
};
},
});

export const save = mutation({
args: {
flowerName: v.string(),
tips: v.array(v.string()),
wateringSchedule: v.string(),
sunlight: v.string(),
lifespan: v.string(),
},
returns: v.id("flowerCareTips"),
handler: async (ctx, args) => {
const normalized = args.flowerName.toLowerCase().trim();

// Check if tips already exist for this flower
const existing = await ctx.db
.query("flowerCareTips")
.withIndex("by_flowerName", (q: any) => q.eq("flowerName", normalized))
.first();

if (existing) {
await ctx.db.patch(existing._id, {
tips: args.tips,
wateringSchedule: args.wateringSchedule,
sunlight: args.sunlight,
lifespan: args.lifespan,
});
return existing._id;
}

return await ctx.db.insert("flowerCareTips", {
flowerName: normalized,
tips: args.tips,
wateringSchedule: args.wateringSchedule,
sunlight: args.sunlight,
lifespan: args.lifespan,
createdAt: Date.now(),
});
},
});
