import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getProfile = query({
args: { buyerId: v.id("buyers") },
returns: v.union(
v.null(),
v.object({
savedAddresses: v.array(v.object({
id: v.string(),
label: v.string(),
address: v.string(),
recipientName: v.union(v.string(), v.null()),
recipientPhone: v.union(v.string(), v.null()),
isDefault: v.boolean(),
})),
preferences: v.union(
v.null(),
v.object({
favoriteColors: v.union(v.null(), v.array(v.string())),
favoriteOccasions: v.union(v.null(), v.array(v.string())),
})
),
})
),
handler: async (ctx, args) => {
const profile = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.first();

if (!profile) return null;

return {
savedAddresses: profile.savedAddresses.map(addr => ({
...addr,
recipientName: addr.recipientName ?? null,
recipientPhone: addr.recipientPhone ?? null,
})),
preferences: profile.preferences ? {
favoriteColors: profile.preferences.favoriteColors ?? null,
favoriteOccasions: profile.preferences.favoriteOccasions ?? null,
} : null,
};
},
});

export const addAddress = mutation({
args: {
buyerId: v.id("buyers"),
label: v.string(),
address: v.string(),
recipientName: v.optional(v.string()),
recipientPhone: v.optional(v.string()),
isDefault: v.boolean(),
},
returns: v.string(),
handler: async (ctx, args) => {
const profile = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.first();

const addressId = `addr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const newAddress = {
id: addressId,
label: args.label,
address: args.address,
recipientName: args.recipientName,
recipientPhone: args.recipientPhone,
isDefault: args.isDefault,
};

if (!profile) {
await ctx.db.insert("buyerProfiles", {
buyerId: args.buyerId,
savedAddresses: [newAddress],
createdAt: Date.now(),
updatedAt: Date.now(),
});
return addressId;
}

let addresses = [...profile.savedAddresses];

// If this is default, unset others
if (args.isDefault) {
addresses = addresses.map(a => ({ ...a, isDefault: false }));
}

addresses.push(newAddress);

await ctx.db.patch(profile._id, {
savedAddresses: addresses,
updatedAt: Date.now(),
});

return addressId;
},
});

export const updateAddress = mutation({
args: {
buyerId: v.id("buyers"),
addressId: v.string(),
label: v.optional(v.string()),
address: v.optional(v.string()),
recipientName: v.optional(v.string()),
recipientPhone: v.optional(v.string()),
isDefault: v.optional(v.boolean()),
},
returns: v.null(),
handler: async (ctx, args) => {
const profile = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.first();

if (!profile) return null;

let addresses = profile.savedAddresses.map(a => {
if (a.id === args.addressId) {
return {
...a,
label: args.label ?? a.label,
address: args.address ?? a.address,
recipientName: args.recipientName !== undefined ? args.recipientName : a.recipientName,
recipientPhone: args.recipientPhone !== undefined ? args.recipientPhone : a.recipientPhone,
isDefault: args.isDefault !== undefined ? args.isDefault : a.isDefault,
};
}
// If this address is set as default, unset others
if (args.isDefault && a.id !== args.addressId) {
return { ...a, isDefault: false };
}
return a;
});

await ctx.db.patch(profile._id, {
savedAddresses: addresses,
updatedAt: Date.now(),
});
},
});

export const deleteAddress = mutation({
args: {
buyerId: v.id("buyers"),
addressId: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
const profile = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.first();

if (!profile) return null;

const addresses = profile.savedAddresses.filter(a => a.id !== args.addressId);

await ctx.db.patch(profile._id, {
savedAddresses: addresses,
updatedAt: Date.now(),
});
},
});

export const updatePreferences = mutation({
args: {
buyerId: v.id("buyers"),
favoriteColors: v.optional(v.array(v.string())),
favoriteOccasions: v.optional(v.array(v.string())),
},
returns: v.null(),
handler: async (ctx, args) => {
const profile = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
.first();

const preferences = {
favoriteColors: args.favoriteColors,
favoriteOccasions: args.favoriteOccasions,
};

if (!profile) {
await ctx.db.insert("buyerProfiles", {
buyerId: args.buyerId,
savedAddresses: [],
preferences,
createdAt: Date.now(),
updatedAt: Date.now(),
});
return;
}

await ctx.db.patch(profile._id, {
preferences,
updatedAt: Date.now(),
});
},
});

export const updateBuyerInfo = mutation({
args: {
buyerId: v.id("buyers"),
name: v.optional(v.string()),
phone: v.optional(v.string()),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.buyerId, {
name: args.name,
phone: args.phone,
});
},
});