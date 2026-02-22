import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const uploadPhoto = mutation({
args: {
orderId: v.id("buyerOrders"),
floristId: v.id("florists"),
photoUrl: v.string(),
caption: v.optional(v.string()),
},
returns: v.id("orderPhotos"),
handler: async (ctx, args) => {
return await ctx.db.insert("orderPhotos", {
orderId: args.orderId,
floristId: args.floristId,
photoUrl: args.photoUrl,
caption: args.caption,
uploadedAt: Date.now(),
});
},
});

export const listForOrder = query({
args: { orderId: v.id("buyerOrders") },
returns: v.array(v.object({
id: v.id("orderPhotos"),
photoUrl: v.string(),
caption: v.union(v.string(), v.null()),
floristName: v.union(v.string(), v.null()),
uploadedAt: v.number(),
})),
handler: async (ctx, args) => {
const photos = await ctx.db
.query("orderPhotos")
.withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
.collect();

const enriched = await Promise.all(
photos.map(async (photo) => {
const florist = await ctx.db.get(photo.floristId);
return {
id: photo._id,
photoUrl: photo.photoUrl,
caption: photo.caption ?? null,
floristName: florist?.businessName ?? null,
uploadedAt: photo.uploadedAt,
};
})
);

return enriched.sort((a, b) => b.uploadedAt - a.uploadedAt);
},
});

export const deletePhoto = mutation({
args: { photoId: v.id("orderPhotos") },
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.delete(args.photoId);
},
});
