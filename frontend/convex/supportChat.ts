import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendMessage = mutation({
args: {
buyerId: v.id("buyers"),
orderId: v.optional(v.id("buyerOrders")),
floristId: v.optional(v.id("florists")),
senderType: v.union(v.literal("buyer"), v.literal("florist"), v.literal("support")),
message: v.string(),
imageUrl: v.optional(v.string()),
},
returns: v.id("supportMessages"),
handler: async (ctx, args) => {
const senderId = args.senderType === "buyer" 
? `buyer:${args.buyerId}`
: args.floristId 
? `florist:${args.floristId}`
: "support:system";

return await ctx.db.insert("supportMessages", {
buyerId: args.buyerId,
orderId: args.orderId,
floristId: args.floristId,
senderId,
senderType: args.senderType,
message: args.message,
imageUrl: args.imageUrl,
read: false,
createdAt: Date.now(),
});
},
});

export const listForBuyer = query({
args: { 
buyerId: v.id("buyers"),
orderId: v.optional(v.id("buyerOrders")),
},
returns: v.array(v.object({
id: v.id("supportMessages"),
senderType: v.union(v.literal("buyer"), v.literal("florist"), v.literal("support")),
senderName: v.union(v.string(), v.null()),
message: v.string(),
imageUrl: v.union(v.string(), v.null()),
read: v.boolean(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
let query = ctx.db
.query("supportMessages")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId));

const messages = await query.collect();

// Filter by orderId if provided
const filtered = args.orderId 
? messages.filter(m => m.orderId === args.orderId)
: messages;

const enriched = await Promise.all(
filtered.map(async (msg) => {
let senderName = null;
if (msg.senderType === "buyer") {
const buyer = await ctx.db.get(args.buyerId);
senderName = buyer?.name ?? "Buyer";
} else if (msg.senderType === "florist" && msg.floristId) {
const florist = await ctx.db.get(msg.floristId);
senderName = (florist as any)?.businessName ?? "Florist";
} else {
senderName = "Support";
}

return {
id: msg._id,
senderType: msg.senderType,
senderName,
message: msg.message,
imageUrl: msg.imageUrl ?? null,
read: msg.read,
createdAt: msg.createdAt,
};
})
);

return enriched.sort((a, b) => a.createdAt - b.createdAt);
},
});

export const listForFlorist = query({
args: { 
floristId: v.id("florists"),
orderId: v.optional(v.id("buyerOrders")),
},
returns: v.array(v.object({
id: v.id("supportMessages"),
buyerId: v.id("buyers"),
buyerName: v.union(v.string(), v.null()),
senderType: v.union(v.literal("buyer"), v.literal("florist"), v.literal("support")),
message: v.string(),
imageUrl: v.union(v.string(), v.null()),
read: v.boolean(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
let query = ctx.db
.query("supportMessages")
.withIndex("by_floristId", (q) => q.eq("floristId", args.floristId));

const messages = await query.collect();

// Filter by orderId if provided
const filtered = args.orderId 
? messages.filter(m => m.orderId === args.orderId)
: messages;

const enriched = await Promise.all(
filtered.map(async (msg) => {
const buyer = await ctx.db.get(msg.buyerId);

return {
id: msg._id,
buyerId: msg.buyerId,
buyerName: buyer?.name ?? "Buyer",
senderType: msg.senderType,
message: msg.message,
imageUrl: msg.imageUrl ?? null,
read: msg.read,
createdAt: msg.createdAt,
};
})
);

return enriched.sort((a, b) => a.createdAt - b.createdAt);
},
});

export const markAsRead = mutation({
args: { messageId: v.id("supportMessages") },
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.messageId, { read: true });
},
});

export const getUnreadCount = query({
args: { 
buyerId: v.id("buyers"),
},
returns: v.number(),
handler: async (ctx, args) => {
const messages = await ctx.db
.query("supportMessages")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.filter((q) => q.eq(q.field("read"), false))
.filter((q) => q.neq(q.field("senderType"), "buyer"))
.collect();

return messages.length;
},
});