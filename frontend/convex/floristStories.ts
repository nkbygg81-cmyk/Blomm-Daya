import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listActive = query({
args: {},
returns: v.array(v.object({
id: v.id("floristStories"),
floristId: v.id("florists"),
floristName: v.union(v.string(), v.null()),
floristCity: v.union(v.string(), v.null()),
imageUrl: v.string(),
caption: v.union(v.string(), v.null()),
createdAt: v.number(),
})),
handler: async (ctx) => {
const now = Date.now();
const stories = await ctx.db
.query("floristStories")
.withIndex("by_expiresAt")
.order("desc")
.take(50);

const active = stories.filter((s: any) => s.expiresAt > now);

const enriched = await Promise.all(
active.map(async (s: any) => {
const florist = await ctx.db.get(s.floristId);
return {
id: s._id,
floristId: s.floristId,
floristName: florist?.businessName ?? florist?.name ?? null,
floristCity: florist?.city ?? null,
imageUrl: s.imageUrl,
caption: s.caption ?? null,
createdAt: s.createdAt,
};
})
);

return enriched;
},
});

export const listForFlorist = query({
args: { floristId: v.id("florists") },
returns: v.array(v.object({
id: v.id("floristStories"),
imageUrl: v.string(),
caption: v.union(v.string(), v.null()),
createdAt: v.number(),
expiresAt: v.number(),
})),
handler: async (ctx, args) => {
const stories = await ctx.db
.query("floristStories")
.withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
.order("desc")
.take(20);

return stories.map((s: any) => ({
id: s._id,
imageUrl: s.imageUrl,
caption: s.caption ?? null,
createdAt: s.createdAt,
expiresAt: s.expiresAt,
}));
},
});

export const create = mutation({
args: {
floristId: v.id("florists"),
imageUrl: v.string(),
caption: v.optional(v.string()),
},
returns: v.id("floristStories"),
handler: async (ctx, args) => {
const now = Date.now();
const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

return await ctx.db.insert("floristStories", {
floristId: args.floristId,
imageUrl: args.imageUrl,
caption: args.caption,
createdAt: now,
expiresAt,
});
},
});

export const remove = mutation({
args: { storyId: v.id("floristStories") },
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.delete(args.storyId);
return null;
},
});
