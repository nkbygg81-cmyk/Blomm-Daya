import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
* Delete a buyer account and all associated data.
* Orders are anonymized (not deleted) for accounting/legal purposes.
*/
export const deleteBuyerAccount = mutation({
args: {
token: v.string(),
},
returns: v.object({ success: v.boolean() }),
handler: async (ctx, args) => {
// Validate session
const session = await ctx.db
.query("buyerSessions")
.withIndex("by_token", (q: any) => q.eq("token", args.token))
.first();

if (!session || session.expiresAt < Date.now()) {
throw new Error("Invalid or expired session");
}

const buyerId = session.buyerId;
const buyer = await ctx.db.get(buyerId);
if (!buyer) {
throw new Error("Buyer not found");
}

// 1. Delete all sessions
const sessions = await ctx.db
.query("buyerSessions")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const s of sessions) {
await ctx.db.delete(s._id);
}

// 2. Delete OTPs
const otps = await ctx.db
.query("buyerOtps")
.withIndex("by_email", (q: any) => q.eq("email", buyer.email))
.collect();
for (const o of otps) {
await ctx.db.delete(o._id);
}

// 3. Delete buyer profile
const profiles = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const p of profiles) {
await ctx.db.delete(p._id);
}

// 4. Delete reminders
const reminders = await ctx.db
.query("reminders")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const r of reminders) {
await ctx.db.delete(r._id);
}

// 5. Delete favorites
const favorites = await ctx.db
.query("favorites")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const f of favorites) {
await ctx.db.delete(f._id);
}

// 6. Delete consultations and their messages
const consultations = await ctx.db
.query("consultations")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const c of consultations) {
const messages = await ctx.db
.query("consultationMessages")
.withIndex("by_consultationId", (q: any) => q.eq("consultationId", c._id))
.collect();
for (const m of messages) {
await ctx.db.delete(m._id);
}
await ctx.db.delete(c._id);
}

// 7. Delete florist reviews by this buyer
const reviews = await ctx.db
.query("floristReviews")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const r of reviews) {
await ctx.db.delete(r._id);
}

// 8. Delete complaints and their messages
const complaints = await ctx.db
.query("complaints")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const c of complaints) {
const messages = await ctx.db
.query("complaintMessages")
.withIndex("by_complaintId", (q: any) => q.eq("complaintId", c._id))
.collect();
for (const m of messages) {
await ctx.db.delete(m._id);
}
await ctx.db.delete(c._id);
}

// 9. Delete support messages
const supportMessages = await ctx.db
.query("supportMessages")
.withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
.collect();
for (const m of supportMessages) {
await ctx.db.delete(m._id);
}

// 10. Delete push tokens
const pushTokens = await ctx.db
.query("pushTokens")
.withIndex("by_userId", (q: any) => q.eq("userId", buyerId))
.collect();
for (const t of pushTokens) {
await ctx.db.delete(t._id);
}

// 11. Delete notification preferences
const notifPrefs = await ctx.db
.query("notificationPreferences")
.withIndex("by_userId", (q: any) => q.eq("userId", buyerId))
.collect();
for (const n of notifPrefs) {
await ctx.db.delete(n._id);
}

// 12. Delete notification history
const notifHistory = await ctx.db
.query("notificationHistory")
.withIndex("by_userId", (q: any) => q.eq("userId", buyerId))
.collect();
for (const n of notifHistory) {
await ctx.db.delete(n._id);
}

// 13. Anonymize orders (keep for accounting, remove personal data)
const orders = await ctx.db
.query("buyerOrders")
.withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", buyerId))
.collect();
for (const o of orders) {
await ctx.db.patch(o._id, {
customerName: "Deleted User",
customerPhone: "",
deliveryAddress: "Deleted",
note: "",
} as any);
}

// 14. Delete the buyer record
await ctx.db.delete(buyerId);

return { success: true };
},
});

/**
* Delete a florist account and all associated data.
* Orders are kept for accounting but florist reference remains.
*/
export const deleteFloristAccount = mutation({
args: {
floristId: v.id("florists"),
},
returns: v.object({ success: v.boolean() }),
handler: async (ctx, args) => {
const florist = await ctx.db.get(args.floristId);
if (!florist) {
throw new Error("Florist not found");
}

// 1. Delete all sessions
const sessions = await ctx.db
.query("floristSessions")
.withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
.collect();
for (const s of sessions) {
await ctx.db.delete(s._id);
}

// 2. Delete OTPs
if (florist.email) {
const otps = await ctx.db
.query("floristOtps")
.withIndex("by_email", (q: any) => q.eq("email", florist.email))
.collect();
for (const o of otps) {
await ctx.db.delete(o._id);
}
}

// 3. Delete portfolio photos (and their storage files)
const photos = await ctx.db
.query("portfolioPhotos")
.withIndex("by_florist", (q: any) => q.eq("floristId", args.floristId))
.collect();
for (const p of photos) {
if (p.imageStorageId) {
await ctx.storage.delete(p.imageStorageId);
}
await ctx.db.delete(p._id);
}

// 4. Delete consultations and their messages
const consultations = await ctx.db
.query("consultations")
.withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
.collect();
for (const c of consultations) {
const messages = await ctx.db
.query("consultationMessages")
.withIndex("by_consultationId", (q: any) => q.eq("consultationId", c._id))
.collect();
for (const m of messages) {
await ctx.db.delete(m._id);
}
await ctx.db.delete(c._id);
}

// 5. Delete complaints and their messages
const complaints = await ctx.db
.query("complaints")
.withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
.collect();
for (const c of complaints) {
const messages = await ctx.db
.query("complaintMessages")
.withIndex("by_complaintId", (q: any) => q.eq("complaintId", c._id))
.collect();
for (const m of messages) {
await ctx.db.delete(m._id);
}
await ctx.db.delete(c._id);
}

// 6. Delete support messages
const supportMessages = await ctx.db
.query("supportMessages")
.withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
.collect();
for (const m of supportMessages) {
await ctx.db.delete(m._id);
}

// 7. Delete push tokens
const pushTokens = await ctx.db
.query("pushTokens")
.withIndex("by_userId", (q: any) => q.eq("userId", args.floristId))
.collect();
for (const t of pushTokens) {
await ctx.db.delete(t._id);
}

// 8. Delete notification preferences
const notifPrefs = await ctx.db
.query("notificationPreferences")
.withIndex("by_userId", (q: any) => q.eq("userId", args.floristId))
.collect();
for (const n of notifPrefs) {
await ctx.db.delete(n._id);
}

// 9. Delete notification history
const notifHistory = await ctx.db
.query("notificationHistory")
.withIndex("by_userId", (q: any) => q.eq("userId", args.floristId))
.collect();
for (const n of notifHistory) {
await ctx.db.delete(n._id);
}

// 10. Delete the florist record
await ctx.db.delete(args.floristId);

return { success: true };
},
});
