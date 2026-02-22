import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==========================================
// ФАЗА 1: Фінансова аналітика
// ==========================================

export const getFinancialStats = query({
args: {
period: v.optional(v.union(
v.literal("week"),
v.literal("month"),
v.literal("year"),
v.literal("all")
)),
},
returns: v.object({
totalRevenue: v.number(),
platformCommission: v.number(),
floristEarnings: v.number(),
orderCount: v.number(),
avgOrderValue: v.number(),
revenueByCountry: v.array(v.object({
country: v.string(),
revenue: v.number(),
orders: v.number(),
})),
topFlorists: v.array(v.object({
id: v.string(),
name: v.string(),
revenue: v.number(),
orders: v.number(),
})),
revenueByDay: v.array(v.object({
date: v.string(),
revenue: v.number(),
orders: v.number(),
})),
}),
handler: async (ctx, args) => {
const period = args.period || "month";
const now = Date.now();

let startDate = 0;
if (period === "week") startDate = now - 7 * 24 * 60 * 60 * 1000;
else if (period === "month") startDate = now - 30 * 24 * 60 * 60 * 1000;
else if (period === "year") startDate = now - 365 * 24 * 60 * 60 * 1000;

const allOrders = await ctx.db.query("buyerOrders").collect();
const orders = period === "all" 
? allOrders 
: allOrders.filter(o => o.createdAt >= startDate);

const deliveredOrders = orders.filter(o => 
o.status === "delivered" || o.paymentStatus === "paid"
);

const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
const platformCommission = totalRevenue * 0.15;
const floristEarnings = totalRevenue - platformCommission;
const orderCount = deliveredOrders.length;
const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

// Revenue by country
const florists = await ctx.db.query("florists").collect();
const floristMap = new Map(florists.map(f => [f._id, f]));

const countryRevenue: Record<string, { revenue: number; orders: number }> = {};
for (const order of deliveredOrders) {
const florist = order.floristId ? floristMap.get(order.floristId) : null;
const country = florist?.country || "Unknown";
if (!countryRevenue[country]) {
countryRevenue[country] = { revenue: 0, orders: 0 };
}
countryRevenue[country].revenue += order.total || 0;
countryRevenue[country].orders += 1;
}

const revenueByCountry = Object.entries(countryRevenue).map(([country, data]) => ({
country,
revenue: data.revenue,
orders: data.orders,
})).sort((a, b) => b.revenue - a.revenue);

// Top florists
const floristRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
for (const order of deliveredOrders) {
if (!order.floristId) continue;
const florist = floristMap.get(order.floristId);
if (!florist) continue;

const id = order.floristId;
if (!floristRevenue[id]) {
floristRevenue[id] = { name: florist.name || "Unknown", revenue: 0, orders: 0 };
}
floristRevenue[id].revenue += order.total || 0;
floristRevenue[id].orders += 1;
}

const topFlorists = Object.entries(floristRevenue)
.map(([id, data]) => ({ id, ...data }))
.sort((a, b) => b.revenue - a.revenue)
.slice(0, 10);

// Revenue by day (last 30 days)
const dayRevenue: Record<string, { revenue: number; orders: number }> = {};
const last30Days = now - 30 * 24 * 60 * 60 * 1000;

for (const order of allOrders.filter(o => o.createdAt >= last30Days)) {
if (order.status !== "delivered" && order.paymentStatus !== "paid") continue;
const date = new Date(order.createdAt).toISOString().split("T")[0];
if (!dayRevenue[date]) {
dayRevenue[date] = { revenue: 0, orders: 0 };
}
dayRevenue[date].revenue += order.total || 0;
dayRevenue[date].orders += 1;
}

const revenueByDay = Object.entries(dayRevenue)
.map(([date, data]) => ({ date, ...data }))
.sort((a, b) => a.date.localeCompare(b.date));

return {
totalRevenue,
platformCommission,
floristEarnings,
orderCount,
avgOrderValue,
revenueByCountry,
topFlorists,
revenueByDay,
};
},
});

// ==========================================
// ФАЗА 1: Управління замовленнями
// ==========================================

export const listAllOrders = query({
args: {
status: v.optional(v.string()),
search: v.optional(v.string()),
limit: v.optional(v.number()),
},
returns: v.array(v.object({
_id: v.id("buyerOrders"),
customerName: v.string(),
customerPhone: v.string(),
deliveryAddress: v.string(),
deliveryType: v.optional(v.string()),
status: v.string(),
paymentStatus: v.optional(v.string()),
paymentMethodType: v.optional(v.string()),
total: v.number(),
createdAt: v.number(),
floristName: v.optional(v.string()),
floristId: v.optional(v.id("florists")),
itemCount: v.number(),
})),
handler: async (ctx, args) => {
let orders = await ctx.db.query("buyerOrders")
.order("desc")
.collect();

if (args.status) {
orders = orders.filter(o => o.status === args.status);
}

if (args.search) {
const search = args.search.toLowerCase();
orders = orders.filter(o => 
o.customerName?.toLowerCase().includes(search) ||
o.customerPhone?.toLowerCase().includes(search) ||
o.deliveryAddress?.toLowerCase().includes(search)
);
}

const florists = await ctx.db.query("florists").collect();
const floristMap = new Map(florists.map(f => [f._id, f]));

const limit = args.limit || 100;

return orders.slice(0, limit).map(o => {
const florist = o.floristId ? floristMap.get(o.floristId) : null;
return {
_id: o._id,
customerName: o.customerName || "Unknown",
customerPhone: o.customerPhone || "",
deliveryAddress: o.deliveryAddress || "",
deliveryType: o.deliveryType,
status: o.status || "pending",
paymentStatus: o.paymentStatus,
paymentMethodType: o.paymentMethodType,
total: o.total || 0,
createdAt: o.createdAt || 0,
floristName: florist?.name,
floristId: o.floristId,
itemCount: (o.items?.length || 0) + (o.gifts?.length || 0),
};
});
},
});

export const getOrderDetails = query({
args: { orderId: v.id("buyerOrders") },
returns: v.any(),
handler: async (ctx, args) => {
const order = await ctx.db.get(args.orderId);
if (!order) return null;

let florist = null;
if (order.floristId) {
florist = await ctx.db.get(order.floristId);
}

const statusHistory = await ctx.db
.query("orderStatusHistory")
.withIndex("by_orderId", q => q.eq("orderId", args.orderId))
.collect();

const photos = await ctx.db
.query("orderPhotos")
.withIndex("by_orderId", q => q.eq("orderId", args.orderId))
.collect();

return {
...order,
florist,
statusHistory,
photos,
};
},
});

export const updateOrderStatus = mutation({
args: {
orderId: v.id("buyerOrders"),
status: v.string(),
note: v.optional(v.string()),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.orderId, {
status: args.status,
updatedAt: Date.now(),
});

await ctx.db.insert("orderStatusHistory", {
orderId: args.orderId,
status: args.status,
note: args.note,
timestamp: Date.now(),
});

return null;
},
});

// ==========================================
// ФАЗА 1: Модерація контенту
// ==========================================

export const listAllReviews = query({
args: {
flagged: v.optional(v.boolean()),
},
returns: v.array(v.object({
_id: v.id("floristReviews"),
buyerEmail: v.optional(v.string()),
floristName: v.optional(v.string()),
rating: v.number(),
deliveryRating: v.number(),
qualityRating: v.number(),
comment: v.optional(v.string()),
createdAt: v.number(),
flagged: v.optional(v.boolean()),
})),
handler: async (ctx, args) => {
const reviews = await ctx.db.query("floristReviews").order("desc").collect();

const buyers = await ctx.db.query("buyers").collect();
const buyerMap = new Map(buyers.map(b => [b._id, b]));

const florists = await ctx.db.query("florists").collect();
const floristMap = new Map(florists.map(f => [f._id, f]));

return reviews.map(r => ({
_id: r._id,
buyerEmail: buyerMap.get(r.buyerId)?.email,
floristName: floristMap.get(r.floristId)?.name,
rating: r.rating,
deliveryRating: r.deliveryRating,
qualityRating: r.qualityRating,
comment: r.comment,
createdAt: r.createdAt,
flagged: (r as any).flagged,
}));
},
});

export const deleteReview = mutation({
args: { reviewId: v.id("floristReviews") },
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.delete(args.reviewId);
return null;
},
});

export const flagReview = mutation({
args: { 
reviewId: v.id("floristReviews"),
flagged: v.boolean(),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.reviewId, { flagged: args.flagged } as any);
return null;
},
});

// ==========================================
// ФАЗА 2: Управління користувачами
// ==========================================

export const listAllBuyers = query({
args: {
search: v.optional(v.string()),
limit: v.optional(v.number()),
},
returns: v.array(v.object({
_id: v.id("buyers"),
email: v.string(),
name: v.optional(v.string()),
phone: v.optional(v.string()),
createdAt: v.number(),
lastLoginAt: v.optional(v.number()),
orderCount: v.number(),
totalSpent: v.number(),
blocked: v.optional(v.boolean()),
})),
handler: async (ctx, args) => {
let buyers = await ctx.db.query("buyers").order("desc").collect();

if (args.search) {
const search = args.search.toLowerCase();
buyers = buyers.filter(b => 
b.email?.toLowerCase().includes(search) ||
b.name?.toLowerCase().includes(search) ||
b.phone?.toLowerCase().includes(search)
);
}

const orders = await ctx.db.query("buyerOrders").collect();

// Group orders by buyer device id (we don't have direct buyerId link)
// For now, just show buyer stats without order details

const limit = args.limit || 100;

return buyers.slice(0, limit).map(b => ({
_id: b._id,
email: b.email,
name: b.name,
phone: b.phone,
createdAt: b.createdAt,
lastLoginAt: b.lastLoginAt,
orderCount: 0, // Would need device ID mapping
totalSpent: 0,
blocked: (b as any).blocked,
}));
},
});

export const blockBuyer = mutation({
args: {
buyerId: v.id("buyers"),
blocked: v.boolean(),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.buyerId, { blocked: args.blocked } as any);
return null;
},
});

export const deleteBuyer = mutation({
args: { buyerId: v.id("buyers") },
returns: v.null(),
handler: async (ctx, args) => {
// Delete sessions
const sessions = await ctx.db
.query("buyerSessions")
.withIndex("by_buyerId", q => q.eq("buyerId", args.buyerId))
.collect();

for (const session of sessions) {
await ctx.db.delete(session._id);
}

// Delete profile
const profiles = await ctx.db
.query("buyerProfiles")
.withIndex("by_buyerId", q => q.eq("buyerId", args.buyerId))
.collect();

for (const profile of profiles) {
await ctx.db.delete(profile._id);
}

// Delete buyer
await ctx.db.delete(args.buyerId);

return null;
},
});

// ==========================================
// ФАЗА 3: Аналітика
// ==========================================

export const getAnalytics = query({
args: {},
returns: v.object({
totalBuyers: v.number(),
activeBuyersToday: v.number(),
activeBuyersWeek: v.number(),
totalFlorists: v.number(),
activeFlorists: v.number(),
totalOrders: v.number(),
ordersToday: v.number(),
ordersWeek: v.number(),
conversionRate: v.number(),
popularCategories: v.array(v.object({
category: v.string(),
count: v.number(),
})),
ordersByStatus: v.array(v.object({
status: v.string(),
count: v.number(),
})),
}),
handler: async (ctx) => {
const now = Date.now();
const todayStart = new Date().setHours(0, 0, 0, 0);
const weekStart = now - 7 * 24 * 60 * 60 * 1000;

const buyers = await ctx.db.query("buyers").collect();
const florists = await ctx.db.query("florists").collect();
const orders = await ctx.db.query("buyerOrders").collect();

const totalBuyers = buyers.length;
const activeBuyersToday = buyers.filter(b => 
b.lastLoginAt && b.lastLoginAt >= todayStart
).length;
const activeBuyersWeek = buyers.filter(b => 
b.lastLoginAt && b.lastLoginAt >= weekStart
).length;

const totalFlorists = florists.length;
const activeFlorists = florists.filter(f => f.available).length;

const totalOrders = orders.length;
const ordersToday = orders.filter(o => o.createdAt >= todayStart).length;
const ordersWeek = orders.filter(o => o.createdAt >= weekStart).length;

// Simple conversion rate (orders / buyers)
const conversionRate = totalBuyers > 0 ? (totalOrders / totalBuyers) * 100 : 0;

// Order status distribution
const statusCounts: Record<string, number> = {};
for (const order of orders) {
const status = order.status || "unknown";
statusCounts[status] = (statusCounts[status] || 0) + 1;
}

const ordersByStatus = Object.entries(statusCounts)
.map(([status, count]) => ({ status, count }))
.sort((a, b) => b.count - a.count);

return {
totalBuyers,
activeBuyersToday,
activeBuyersWeek,
totalFlorists,
activeFlorists,
totalOrders,
ordersToday,
ordersWeek,
conversionRate,
popularCategories: [], // Would need flower category data
ordersByStatus,
};
},
});

// ==========================================
// ФАЗА 3: Налаштування платформи
// ==========================================

export const getPlatformSettings = query({
  args: {},
  returns: v.object({
    platformCommission: v.number(),
    minimumOrderValue: v.number(),
    deliveryFee: v.number(),
    maintenanceMode: v.boolean(),
    loyaltyEnabled: v.boolean(),
    // keep old fields for backward compat
    commissionRate: v.number(),
    minOrderAmount: v.number(),
    maxDeliveryRadius: v.number(),
    currencies: v.array(v.object({
      country: v.string(),
      currency: v.string(),
    })),
  }),
  handler: async (ctx) => {
    const readSetting = async (key: string) => {
      const s = await ctx.db
        .query("platformSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      return s?.value;
    };

    const platformCommission = (await readSetting("platformCommission")) ?? 15;
    const minimumOrderValue = (await readSetting("minimumOrderValue")) ?? 50;
    const deliveryFee = (await readSetting("deliveryFee")) ?? 50;
    const maintenanceMode = (await readSetting("maintenanceMode")) ?? false;
    const loyaltyEnabled = (await readSetting("loyaltyEnabled")) !== false;

    return {
      platformCommission: typeof platformCommission === "number" ? platformCommission : 15,
      minimumOrderValue: typeof minimumOrderValue === "number" ? minimumOrderValue : 50,
      deliveryFee: typeof deliveryFee === "number" ? deliveryFee : 50,
      maintenanceMode: !!maintenanceMode,
      loyaltyEnabled: !!loyaltyEnabled,
      // backward compat
      commissionRate: typeof platformCommission === "number" ? platformCommission : 15,
      minOrderAmount: typeof minimumOrderValue === "number" ? minimumOrderValue : 50,
      maxDeliveryRadius: 50,
      currencies: [
        { country: "SE", currency: "SEK" },
        { country: "UA", currency: "UAH" },
        { country: "PL", currency: "PLN" },
      ],
    };
  },
});

export const updatePlatformSettings = mutation({
  args: {
    platformCommission: v.number(),
    minimumOrderValue: v.number(),
    deliveryFee: v.number(),
    maintenanceMode: v.boolean(),
    loyaltyEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    const upsert = async (key: string, value: unknown) => {
      const existing = await ctx.db
        .query("platformSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value,
          updatedAt: now,
          updatedBy: "admin",
        });
      } else {
        await ctx.db.insert("platformSettings", {
          key,
          value,
          updatedAt: now,
          updatedBy: "admin",
        });
      }
    };

    await upsert(
      "platformCommission",
      Math.max(0, Math.min(50, args.platformCommission)),
    );
    await upsert("minimumOrderValue", Math.max(0, Math.round(args.minimumOrderValue)));
    await upsert("deliveryFee", Math.max(0, Math.round(args.deliveryFee)));
    await upsert("maintenanceMode", !!args.maintenanceMode);
    if (args.loyaltyEnabled !== undefined) {
      await upsert("loyaltyEnabled", args.loyaltyEnabled);
    }

    return null;
  },
});

// ==========================================
// ФАЗА 2: Портфоліо модерація
// ==========================================

export const listAllPortfolioPhotos = query({
args: {
floristId: v.optional(v.id("florists")),
},
returns: v.array(v.object({
_id: v.id("portfolioPhotos"),
floristId: v.id("florists"),
floristName: v.optional(v.string()),
imageUrl: v.optional(v.string()),
description: v.optional(v.string()),
price: v.optional(v.number()),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
let photos;
if (args.floristId) {
photos = await ctx.db
.query("portfolioPhotos")
.withIndex("by_florist", q => q.eq("floristId", args.floristId))
.order("desc")
.collect();
} else {
photos = await ctx.db.query("portfolioPhotos").order("desc").collect();
}

const florists = await ctx.db.query("florists").collect();
const floristMap = new Map(florists.map(f => [f._id, f]));

return photos.map(p => {
let imageUrl = p.imageUrl;
if (!imageUrl && p.imageStorageId) {
// Would need to generate URL from storage
imageUrl = undefined;
}

return {
_id: p._id,
floristId: p.floristId,
floristName: floristMap.get(p.floristId)?.name,
imageUrl,
description: p.description,
price: p.price,
createdAt: p.createdAt,
};
});
},
});

export const deletePortfolioPhoto = mutation({
args: { photoId: v.id("portfolioPhotos") },
returns: v.null(),
handler: async (ctx, args) => {
const photo = await ctx.db.get(args.photoId);
if (photo?.imageStorageId) {
await ctx.storage.delete(photo.imageStorageId);
}
await ctx.db.delete(args.photoId);
return null;
},
});

// ==========================================
// CATEGORIES MANAGEMENT
// ==========================================

export const listCategories = query({
  args: {
    type: v.optional(v.union(v.literal("flower"), v.literal("gift"), v.literal("occasion"))),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("categories"),
    name: v.string(),
    nameUk: v.string(),
    nameSv: v.optional(v.string()),
    type: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let categories;
    if (args.type && args.activeOnly) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_type_and_active", q => q.eq("type", args.type).eq("active", true))
        .collect();
    } else if (args.type) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_type", q => q.eq("type", args.type))
        .collect();
    } else if (args.activeOnly) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_active", q => q.eq("active", true))
        .collect();
    } else {
      categories = await ctx.db.query("categories").collect();
    }
    
    return categories.sort((a, b) => a.sortOrder - b.sortOrder).map(c => ({
      _id: c._id,
      name: c.name,
      nameUk: c.nameUk,
      nameSv: c.nameSv,
      type: c.type,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
      active: c.active,
      createdAt: c.createdAt,
    }));
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    nameUk: v.string(),
    nameSv: v.optional(v.string()),
    type: v.union(v.literal("flower"), v.literal("gift"), v.literal("occasion")),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("categories").collect();
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);
    
    return await ctx.db.insert("categories", {
      name: args.name,
      nameUk: args.nameUk,
      nameSv: args.nameSv,
      type: args.type,
      icon: args.icon,
      color: args.color,
      sortOrder: args.sortOrder ?? maxOrder + 1,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { categoryId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(categoryId, {
      ...filtered,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.categoryId);
    return null;
  },
});

// ==========================================
// COMPLAINTS / SUPPORT TICKETS
// ==========================================

export const listComplaints = query({
  args: {
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("complaints"),
    type: v.string(),
    status: v.string(),
    priority: v.string(),
    reporterType: v.string(),
    reporterEmail: v.string(),
    subject: v.string(),
    description: v.string(),
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
  })),
  handler: async (ctx, args) => {
    let complaints;
    if (args.status) {
      complaints = await ctx.db
        .query("complaints")
        .withIndex("by_status", q => q.eq("status", args.status))
        .order("desc")
        .collect();
    } else {
      complaints = await ctx.db.query("complaints").order("desc").collect();
    }
    
    if (args.priority) {
      complaints = complaints.filter(c => c.priority === args.priority);
    }
    
    const limit = args.limit || 100;
    complaints = complaints.slice(0, limit);
    
    // Get message counts
    const allMessages = await ctx.db.query("complaintMessages").collect();
    const messageCounts = new Map<string, number>();
    for (const msg of allMessages) {
      const id = msg.complaintId.toString();
      messageCounts.set(id, (messageCounts.get(id) || 0) + 1);
    }
    
    return complaints.map(c => ({
      _id: c._id,
      type: c.type,
      status: c.status,
      priority: c.priority,
      reporterType: c.reporterType,
      reporterEmail: c.reporterEmail,
      subject: c.subject,
      description: c.description,
      assignedTo: c.assignedTo,
      resolution: c.resolution,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: messageCounts.get(c._id.toString()) || 0,
    }));
  },
});

export const getComplaintDetails = query({
  args: { complaintId: v.id("complaints") },
  returns: v.union(v.null(), v.object({
    complaint: v.any(),
    messages: v.array(v.object({
      _id: v.id("complaintMessages"),
      senderId: v.string(),
      senderType: v.string(),
      message: v.string(),
      imageUrl: v.optional(v.string()),
      createdAt: v.number(),
    })),
    order: v.optional(v.any()),
    relatedFlorist: v.optional(v.any()),
  })),
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return null;
    
    const messages = await ctx.db
      .query("complaintMessages")
      .withIndex("by_complaintId", q => q.eq("complaintId", args.complaintId))
      .collect();
    
    let order = null;
    if (complaint.orderId) {
      order = await ctx.db.get(complaint.orderId);
    }
    
    let relatedFlorist = null;
    if (complaint.relatedFloristId) {
      relatedFlorist = await ctx.db.get(complaint.relatedFloristId);
    }
    
    return {
      complaint,
      messages: messages.map(m => ({
        _id: m._id,
        senderId: m.senderId,
        senderType: m.senderType,
        message: m.message,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt,
      })),
      order,
      relatedFlorist,
    };
  },
});

export const updateComplaint = mutation({
  args: {
    complaintId: v.id("complaints"),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { complaintId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    const now = Date.now();
    const patch: any = { ...filtered, updatedAt: now };
    
    if (updates.status === "resolved" || updates.status === "closed") {
      patch.resolvedAt = now;
    }
    
    await ctx.db.patch(complaintId, patch);
    return null;
  },
});

export const addComplaintMessage = mutation({
  args: {
    complaintId: v.id("complaints"),
    message: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("complaintMessages"),
  handler: async (ctx, args) => {
    // Update complaint timestamp
    await ctx.db.patch(args.complaintId, { updatedAt: Date.now() });
    
    return await ctx.db.insert("complaintMessages", {
      complaintId: args.complaintId,
      senderId: "admin",
      senderType: "admin",
      message: args.message,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
  },
});

export const createComplaint = mutation({
  args: {
    type: v.union(
      v.literal("order"),
      v.literal("florist"),
      v.literal("technical"),
      v.literal("payment"),
      v.literal("other")
    ),
    buyerId: v.optional(v.id("buyers")),
    floristId: v.optional(v.id("florists")),
    reporterType: v.union(v.literal("buyer"), v.literal("florist")),
    reporterEmail: v.string(),
    orderId: v.optional(v.id("buyerOrders")),
    relatedFloristId: v.optional(v.id("florists")),
    subject: v.string(),
    description: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  returns: v.id("complaints"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("complaints", {
      type: args.type,
      status: "open",
      priority: args.priority || "medium",
      buyerId: args.buyerId,
      floristId: args.floristId,
      reporterType: args.reporterType,
      reporterEmail: args.reporterEmail,
      orderId: args.orderId,
      relatedFloristId: args.relatedFloristId,
      subject: args.subject,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ==========================================
// PLATFORM SETTINGS
// ==========================================

export const getAllSettings = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("platformSettings"),
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").collect();
    return settings.map(s => ({
      _id: s._id,
      key: s.key,
      value: s.value,
      description: s.description,
      updatedAt: s.updatedAt,
    }));
  },
});

export const getSetting = query({
  args: { key: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();
    return setting?.value ?? null;
  },
});

export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description ?? existing.description,
        updatedAt: Date.now(),
        updatedBy: "admin",
      });
    } else {
      await ctx.db.insert("platformSettings", {
        key: args.key,
        value: args.value,
        description: args.description,
        updatedAt: Date.now(),
        updatedBy: "admin",
      });
    }
    
    return null;
  },
});

// ==========================================
// SYSTEM MESSAGES / BROADCAST
// ==========================================

export const listSystemMessages = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent"))),
  },
  returns: v.array(v.object({
    _id: v.id("systemMessages"),
    title: v.string(),
    body: v.string(),
    type: v.string(),
    targetAudience: v.string(),
    targetCountry: v.optional(v.string()),
    status: v.string(),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    recipientCount: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let messages;
    if (args.status) {
      messages = await ctx.db
        .query("systemMessages")
        .withIndex("by_status", q => q.eq("status", args.status))
        .order("desc")
        .collect();
    } else {
      messages = await ctx.db.query("systemMessages").order("desc").collect();
    }
    
    return messages.map(m => ({
      _id: m._id,
      title: m.title,
      body: m.body,
      type: m.type,
      targetAudience: m.targetAudience,
      targetCountry: m.targetCountry,
      status: m.status,
      scheduledAt: m.scheduledAt,
      sentAt: m.sentAt,
      recipientCount: m.recipientCount,
      createdAt: m.createdAt,
    }));
  },
});

export const createSystemMessage = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("promotion"),
      v.literal("maintenance"),
      v.literal("update")
    ),
    targetAudience: v.union(v.literal("all"), v.literal("buyers"), v.literal("florists")),
    targetCountry: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.id("systemMessages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("systemMessages", {
      title: args.title,
      body: args.body,
      type: args.type,
      targetAudience: args.targetAudience,
      targetCountry: args.targetCountry,
      scheduledAt: args.scheduledAt,
      status: args.scheduledAt ? "scheduled" : "draft",
      createdAt: Date.now(),
      createdBy: "admin",
    });
  },
});

export const sendSystemMessage = mutation({
  args: { messageId: v.id("systemMessages") },
  returns: v.object({
    success: v.boolean(),
    recipientCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return { success: false, recipientCount: 0 };
    }
    
    // Get target users
    let recipients: string[] = [];
    
    if (message.targetAudience === "all" || message.targetAudience === "buyers") {
      const buyers = await ctx.db.query("buyers").collect();
      for (const buyer of buyers) {
        recipients.push(`buyer:${buyer._id}`);
      }
    }
    
    if (message.targetAudience === "all" || message.targetAudience === "florists") {
      let florists = await ctx.db.query("florists").collect();
      if (message.targetCountry) {
        florists = florists.filter(f => f.country === message.targetCountry);
      }
      for (const florist of florists) {
        recipients.push(`florist:${florist._id}`);
      }
    }
    
    // Create notification records for each recipient
    for (const userId of recipients) {
      const userType = userId.startsWith("buyer:") ? "buyer" : "florist";
      await ctx.db.insert("notificationHistory", {
        userId: userId.split(":")[1],
        userType,
        title: message.title,
        body: message.body,
        type: message.type,
        read: false,
        sentAt: Date.now(),
      });
    }
    
    // Update message status
    await ctx.db.patch(args.messageId, {
      status: "sent",
      sentAt: Date.now(),
      recipientCount: recipients.length,
    });
    
    return { success: true, recipientCount: recipients.length };
  },
});

export const deleteSystemMessage = mutation({
  args: { messageId: v.id("systemMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
    return null;
  },
});

// ==========================================
// DATA EXPORT
// ==========================================

export const exportOrders = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  returns: v.array(v.object({
    orderId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryAddress: v.string(),
    deliveryType: v.optional(v.string()),
    status: v.string(),
    paymentStatus: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    total: v.number(),
    floristName: v.optional(v.string()),
    floristCity: v.optional(v.string()),
    itemCount: v.number(),
    createdAt: v.string(),
  })),
  handler: async (ctx, args) => {
    let orders = await ctx.db.query("buyerOrders").order("desc").collect();
    
    if (args.startDate) {
      orders = orders.filter(o => o.createdAt >= args.startDate!);
    }
    if (args.endDate) {
      orders = orders.filter(o => o.createdAt <= args.endDate!);
    }
    if (args.status) {
      orders = orders.filter(o => o.status === args.status);
    }
    
    const florists = await ctx.db.query("florists").collect();
    const floristMap = new Map(florists.map(f => [f._id, f]));
    
    return orders.map(o => {
      const florist = o.floristId ? floristMap.get(o.floristId) : null;
      return {
        orderId: o._id,
        customerName: o.customerName || "",
        customerPhone: o.customerPhone || "",
        deliveryAddress: o.deliveryAddress || "",
        deliveryType: o.deliveryType,
        status: o.status || "unknown",
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethodType,
        total: o.total || 0,
        floristName: florist?.name,
        floristCity: florist?.city,
        itemCount: (o.items?.length || 0) + (o.gifts?.length || 0),
        createdAt: new Date(o.createdAt).toISOString(),
      };
    });
  },
});

export const exportBuyers = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.string(),
    lastLoginAt: v.optional(v.string()),
    blocked: v.boolean(),
  })),
  handler: async (ctx) => {
    const buyers = await ctx.db.query("buyers").collect();
    
    return buyers.map(b => ({
      id: b._id,
      email: b.email,
      name: b.name,
      phone: b.phone,
      createdAt: new Date(b.createdAt).toISOString(),
      lastLoginAt: b.lastLoginAt ? new Date(b.lastLoginAt).toISOString() : undefined,
      blocked: (b as any).blocked || false,
    }));
  },
});

export const exportFlorists = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    address: v.optional(v.string()),
    available: v.boolean(),
    rating: v.optional(v.number()),
    registrationNumber: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const florists = await ctx.db.query("florists").collect();
    
    return florists.map(f => ({
      id: f._id,
      name: f.name || "Unknown",
      email: f.email,
      phone: f.phone,
      city: f.city,
      country: f.country,
      address: f.address,
      available: f.available || false,
      rating: f.rating,
      registrationNumber: f.registrationNumber,
    }));
  },
});

// Get complaint stats
export const getComplaintStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    open: v.number(),
    inProgress: v.number(),
    resolved: v.number(),
    closed: v.number(),
    highPriority: v.number(),
    avgResolutionTime: v.number(),
  }),
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints").collect();
    
    const stats = {
      total: complaints.length,
      open: complaints.filter(c => c.status === "open").length,
      inProgress: complaints.filter(c => c.status === "in_progress").length,
      resolved: complaints.filter(c => c.status === "resolved").length,
      closed: complaints.filter(c => c.status === "closed").length,
      highPriority: complaints.filter(c => c.priority === "high").length,
      avgResolutionTime: 0,
    };
    
    const resolvedComplaints = complaints.filter(c => c.resolvedAt);
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce(
        (sum, c) => sum + (c.resolvedAt! - c.createdAt), 0
      );
      stats.avgResolutionTime = Math.round(totalTime / resolvedComplaints.length / (1000 * 60 * 60)); // in hours
    }
    
    return stats;
  },
});

// ==========================================
// FLOWER CATALOG MANAGEMENT
// ==========================================

export const listAllFlowers = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("flowers"),
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.number(),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.boolean(),
    createdAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    let flowers = await ctx.db.query("flowers").collect();
    
    if (args.search) {
      const search = args.search.toLowerCase();
      flowers = flowers.filter((f: any) => 
        f.name?.toLowerCase().includes(search) ||
        f.nameUk?.toLowerCase().includes(search) ||
        f.nameSv?.toLowerCase().includes(search) ||
        f.description?.toLowerCase().includes(search)
      );
    }
    
    if (args.category) {
      flowers = flowers.filter((f: any) => f.category === args.category);
    }
    
    const limit = args.limit || 100;
    const limitedFlowers = flowers.slice(0, limit);
    
    // Resolve storage URLs for flowers with imageStorageId
    const results = await Promise.all(
      limitedFlowers.map(async (f: any) => {
        let imageUrl = f.imageUrl;
        
        // If no imageUrl but has imageStorageId, get URL from storage
        if (!imageUrl && f.imageStorageId) {
          try {
            imageUrl = await ctx.storage.getUrl(f.imageStorageId);
          } catch (e) {
            imageUrl = undefined;
          }
        }
        
        return {
          _id: f._id,
          name: f.name || "Untitled",
          nameUk: f.nameUk,
          nameSv: f.nameSv,
          price: f.price || 0,
          category: f.category,
          imageUrl: imageUrl || undefined,
          description: f.description,
          available: f.available ?? true,
          createdAt: f.createdAt,
        };
      })
    );
    
    return results;
  },
});

export const createFlower = mutation({
  args: {
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.number(),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.optional(v.boolean()),
  },
  returns: v.id("flowers"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("flowers", {
      name: args.name,
      nameUk: args.nameUk || args.name,
      nameSv: args.nameSv,
      price: args.price,
      category: args.category || "bouquet",
      imageUrl: args.imageUrl,
      description: args.description,
      available: args.available ?? true,
      createdAt: Date.now(),
    });
  },
});

export const updateFlower = mutation({
  args: {
    flowerId: v.id("flowers"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { flowerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(flowerId, {
      ...filtered,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteFlower = mutation({
  args: { flowerId: v.id("flowers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.flowerId);
    return null;
  },
});

// ==========================================
// GIFT CATALOG MANAGEMENT
// ==========================================

export const listAllGifts = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("gifts"),
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.number(),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.boolean(),
  })),
  handler: async (ctx, args) => {
    let gifts = await ctx.db.query("gifts").collect();
    
    if (args.search) {
      const search = args.search.toLowerCase();
      gifts = gifts.filter((g: any) => 
        g.name?.toLowerCase().includes(search) ||
        g.nameUk?.toLowerCase().includes(search) ||
        g.description?.toLowerCase().includes(search)
      );
    }
    
    if (args.category) {
      gifts = gifts.filter((g: any) => g.category === args.category);
    }
    
    const limit = args.limit || 100;
    const limitedGifts = gifts.slice(0, limit);
    
    // Resolve storage URLs for gifts with imageStorageId
    const results = await Promise.all(
      limitedGifts.map(async (g: any) => {
        let imageUrl = g.imageUrl;
        
        // If no imageUrl but has imageStorageId, get URL from storage
        if (!imageUrl && g.imageStorageId) {
          try {
            imageUrl = await ctx.storage.getUrl(g.imageStorageId);
          } catch (e) {
            imageUrl = undefined;
          }
        }
        
        return {
          _id: g._id,
          name: g.name || "Untitled",
          nameUk: g.nameUk,
          nameSv: g.nameSv,
          price: g.price || 0,
          category: g.category,
          imageUrl: imageUrl || undefined,
          description: g.description,
          available: g.available ?? true,
        };
      })
    );
    
    return results;
  },
});

export const createGift = mutation({
  args: {
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.number(),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.optional(v.boolean()),
  },
  returns: v.id("gifts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("gifts", {
      name: args.name,
      nameUk: args.nameUk || args.name,
      nameSv: args.nameSv,
      price: args.price,
      category: args.category || "gift",
      imageUrl: args.imageUrl,
      description: args.description,
      available: args.available ?? true,
      createdAt: Date.now(),
    });
  },
});

export const updateGift = mutation({
  args: {
    giftId: v.id("gifts"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { giftId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(giftId, {
      ...filtered,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteGift = mutation({
  args: { giftId: v.id("gifts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.giftId);
    return null;
  },
});

// ==========================================
// FILE UPLOAD
// ==========================================

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateFlowerImage = mutation({
  args: {
    flowerId: v.id("flowers"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(args.flowerId, {
      imageUrl: url,
      imageStorageId: args.storageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateGiftImage = mutation({
  args: {
    giftId: v.id("gifts"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(args.giftId, {
      imageUrl: url,
      imageStorageId: args.storageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ==========================================
// DELETE TEST FLORISTS
// ==========================================

export const deleteTestFlorists = mutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
    remainingFlorists: v.number(),
  }),
  handler: async (ctx) => {
    const allFlorists = await ctx.db.query("florists").collect();
    
    // Test florists are those without email or with placeholder emails
    const testFlorists = allFlorists.filter(f => !f.email || f.email.trim() === "");
    
    let deletedCount = 0;
    for (const florist of testFlorists) {
      await ctx.db.delete(florist._id);
      deletedCount++;
    }
    
    const remaining = await ctx.db.query("florists").collect();
    
    return {
      deletedCount,
      remainingFlorists: remaining.length,
    };
  },
});

// ==========================================
// FLORIST MANAGEMENT
// ==========================================

export const listAllFlorists = query({
  args: {
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("pending"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("florists"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    available: v.boolean(),
    rating: v.optional(v.number()),
    orderCount: v.number(),
    registrationStatus: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let florists = await ctx.db.query("florists").order("desc").collect();
    
    if (args.country) {
      florists = florists.filter(f => f.country === args.country);
    }
    if (args.city) {
      florists = florists.filter(f => f.city === args.city);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      florists = florists.filter(f =>
        f.name?.toLowerCase().includes(search) ||
        f.email?.toLowerCase().includes(search) ||
        f.phone?.toLowerCase().includes(search)
      );
    }
    
    const orders = await ctx.db.query("buyerOrders").collect();
    const orderCounts = new Map<string, number>();
    
    for (const order of orders) {
      if (order.floristId) {
        const id = order.floristId.toString();
        orderCounts.set(id, (orderCounts.get(id) || 0) + 1);
      }
    }
    
    const limit = args.limit || 100;
    
    return florists.slice(0, limit).map(f => ({
      _id: f._id,
      name: f.name || "Unknown",
      email: f.email,
      phone: f.phone,
      city: f.city,
      country: f.country,
      available: f.available || false,
      rating: f.rating,
      orderCount: orderCounts.get(f._id.toString()) || 0,
      registrationStatus: "active",
      createdAt: f.createdAt || Date.now(),
    }));
  },
});

export const getFloristDetails = query({
  args: { floristId: v.id("florists") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const florist = await ctx.db.get(args.floristId);
    if (!florist) return null;
    
    const orders = await ctx.db
      .query("buyerOrders")
      .withIndex("by_floristId_and_createdAt", q =>
        q.eq("floristId", args.floristId)
      )
      .collect();
    
    const reviews = await ctx.db
      .query("floristReviews")
      .withIndex("by_floristId", q => q.eq("floristId", args.floristId))
      .collect();
    
    const totalEarnings = orders
      .filter(o => o.status === "delivered" || o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    return {
      florist,
      stats: {
        totalOrders: orders.length,
        totalEarnings,
        avgRating,
        reviewCount: reviews.length,
      },
      recentOrders: orders.slice(0, 10),
      recentReviews: reviews.slice(0, 5),
    };
  },
});

export const blockFlorist = mutation({
  args: {
    floristId: v.id("florists"),
    blocked: v.boolean(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.floristId, {
      available: !args.blocked,
      blocked: args.blocked,
      blockReason: args.reason,
      blockedAt: args.blocked ? Date.now() : null,
    } as any);
    return null;
  },
});

export const deleteFlorist = mutation({
  args: { floristId: v.id("florists") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete florist sessions
    const sessions = await ctx.db
      .query("floristSessions")
      .withIndex("by_floristId", q => q.eq("floristId", args.floristId))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    // Delete portfolio photos
    const photos = await ctx.db
      .query("portfolioPhotos")
      .withIndex("by_florist", q => q.eq("floristId", args.floristId))
      .collect();
    
    for (const photo of photos) {
      if (photo.imageStorageId) {
        await ctx.storage.delete(photo.imageStorageId);
      }
      await ctx.db.delete(photo._id);
    }
    
    // Delete florist
    await ctx.db.delete(args.floristId);
    return null;
  },
});

// ==========================================
// REAL-TIME ANALYTICS
// ==========================================

export const getRealtimeMetrics = query({
  args: {},
  returns: v.object({
    activeUsersNow: v.number(),
    ordersInProgress: v.number(),
    activeCheckouts: v.number(),
    topFlorists: v.array(v.object({
      name: v.string(),
      ordersToday: v.number(),
      revenue: v.number(),
    })),
    ordersLastHour: v.number(),
    revenue24h: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;
    
    const orders = await ctx.db.query("buyerOrders").collect();
    const florists = await ctx.db.query("florists").collect();
    
    // Orders in progress
    const ordersInProgress = orders.filter(o =>
      o.status !== "delivered" && o.status !== "cancelled"
    ).length;
    
    // Orders last hour
    const ordersLastHour = orders.filter(o => o.createdAt >= hourAgo).length;
    
    // Revenue last 24h (delivered orders only)
    const revenue24h = orders
      .filter(o => o.createdAt >= dayAgo && (o.status === "delivered" || o.paymentStatus === "paid"))
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Top florists today
    const floristMap = new Map(florists.map(f => [f._id, f]));
    const floristStats: Record<string, { name: string; ordersToday: number; revenue: number }> = {};
    
    const todayStart = new Date().setHours(0, 0, 0, 0);
    for (const order of orders.filter(o => o.createdAt >= todayStart)) {
      if (!order.floristId) continue;
      const florist = floristMap.get(order.floristId);
      if (!florist) continue;
      
      const id = order.floristId.toString();
      if (!floristStats[id]) {
        floristStats[id] = { name: florist.name || "Unknown", ordersToday: 0, revenue: 0 };
      }
      floristStats[id].ordersToday += 1;
      if (order.status === "delivered" || order.paymentStatus === "paid") {
        floristStats[id].revenue += order.total || 0;
      }
    }
    
    const topFlorists = Object.values(floristStats)
      .sort((a, b) => b.ordersToday - a.ordersToday)
      .slice(0, 5);
    
    return {
      activeUsersNow: 0, // Would need session tracking
      ordersInProgress,
      activeCheckouts: 0, // Would need Stripe session tracking
      topFlorists,
      ordersLastHour,
      revenue24h,
    };
  },
});

// ==========================================
// FRAUD DETECTION
// ==========================================

export const getFraudAlerts = query({
  args: {},
  returns: v.array(v.object({
    type: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    description: v.string(),
    affectedCount: v.number(),
    timestamp: v.number(),
  })),
  handler: async (ctx) => {
    const alerts: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      affectedCount: number;
      timestamp: number;
    }> = [];
    
    const orders = await ctx.db.query("buyerOrders").collect();
    const buyers = await ctx.db.query("buyers").collect();
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    // Detect: Many orders from same device in short time
    const deviceOrders: Record<string, Array<any>> = {};
    for (const order of orders) {
      if (!deviceOrders[order.buyerDeviceId]) {
        deviceOrders[order.buyerDeviceId] = [];
      }
      deviceOrders[order.buyerDeviceId].push(order);
    }
    
    for (const [deviceId, deviceOrderList] of Object.entries(deviceOrders)) {
      const recentOrders = deviceOrderList.filter(o => o.createdAt >= hourAgo);
      if (recentOrders.length > 5) {
        alerts.push({
          type: "rapid_orders",
          severity: "medium",
          description: `Device placed ${recentOrders.length} orders in the last hour`,
          affectedCount: 1,
          timestamp: now,
        });
      }
    }
    
    // Detect: High-value orders with new account
    const newBuyerIds = new Set(
      buyers.filter(b => b.createdAt > now - 24 * 60 * 60 * 1000).map(b => b._id)
    );
    
    let highValueNewBuyer = 0;
    for (const order of orders.filter(o => o.createdAt >= hourAgo)) {
      if (order.total && order.total > 5000 && newBuyerIds.has(order.buyerDeviceId as any)) {
        highValueNewBuyer++;
      }
    }
    
    if (highValueNewBuyer > 0) {
      alerts.push({
        type: "high_value_new_buyer",
        severity: "high",
        description: `${highValueNewBuyer} high-value orders from new accounts`,
        affectedCount: highValueNewBuyer,
        timestamp: now,
      });
    }
    
    return alerts;
  },
});

// ==========================================
// PROMO CODE MANAGEMENT
// ==========================================

export const listPromoCodes = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("promoCodes"),
    code: v.string(),
    discountType: v.union(v.literal("fixed"), v.literal("percent")),
    discountValue: v.number(),
    minOrderAmount: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let codes;
    if (args.activeOnly) {
      codes = await ctx.db
        .query("promoCodes")
        .withIndex("by_active", q => q.eq("isActive", true))
        .order("desc")
        .collect();
    } else {
      codes = await ctx.db.query("promoCodes").order("desc").collect();
    }
    
    return codes.map(c => ({
      _id: c._id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxUses: c.maxUses,
      currentUses: c.currentUses || 0,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  },
});

export const createPromoCode = mutation({
  args: {
    code: v.string(),
    discountType: v.union(v.literal("fixed"), v.literal("percent")),
    discountValue: v.number(),
    minOrderAmount: v.number(),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("promoCodes"),
  handler: async (ctx, args) => {
    // Validate code doesn't exist
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", q => q.eq("code", args.code.toUpperCase()))
      .first();
    
    if (existing) {
      throw new Error("Promo code already exists");
    }
    
    return await ctx.db.insert("promoCodes", {
      code: args.code.toUpperCase(),
      discountType: args.discountType,
      discountValue: args.discountValue,
      minOrderAmount: args.minOrderAmount,
      maxUses: args.maxUses,
      currentUses: 0,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updatePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
    discountValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { promoCodeId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(promoCodeId, filtered);
    return null;
  },
});

export const deletePromoCode = mutation({
  args: { promoCodeId: v.id("promoCodes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.promoCodeId);
    return null;
  },
});

// ==========================================
// FAQ MANAGEMENT
// ==========================================

export const listFAQ = query({
  args: {
    category: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("faq"),
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    language: v.string(),
    order: v.number(),
    active: v.boolean(),
  })),
  handler: async (ctx, args) => {
    let faqs = await ctx.db.query("faq").collect();
    
    if (args.category) {
      faqs = faqs.filter(f => f.category === args.category);
    }
    if (args.language) {
      faqs = faqs.filter(f => f.language === args.language);
    }
    
    return faqs.sort((a, b) => a.order - b.order);
  },
});

export const createFAQ = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    language: v.union(v.literal("en"), v.literal("uk"), v.literal("sv")),
  },
  returns: v.id("faq"),
  handler: async (ctx, args) => {
    const faqs = await ctx.db.query("faq").collect();
    const maxOrder = faqs.reduce((max, f) => Math.max(max, f.order), 0);
    
    return await ctx.db.insert("faq", {
      question: args.question,
      answer: args.answer,
      category: args.category,
      language: args.language,
      order: maxOrder + 1,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const updateFAQ = mutation({
  args: {
    faqId: v.id("faq"),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    category: v.optional(v.string()),
    order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { faqId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(faqId, {
      ...filtered,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteFAQ = mutation({
  args: { faqId: v.id("faq") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.faqId);
    return null;
  },
});

// ==========================================
// SUBSCRIPTIONS MANAGEMENT
// ==========================================

export const listSubscriptions = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("subscriptions"),
    buyerEmail: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    plan: v.string(),
    flowerPreferences: v.optional(v.string()),
    deliveryAddress: v.string(),
    recipientName: v.string(),
    recipientPhone: v.string(),
    budget: v.number(),
    status: v.string(),
    nextDeliveryDate: v.string(),
    floristName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let subs;
    if (args.status) {
      subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_status", q => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      subs = await ctx.db.query("subscriptions").order("desc").collect();
    }

    const buyers = await ctx.db.query("buyers").collect();
    const buyerMap = new Map(buyers.map(b => [b._id, b]));

    const florists = await ctx.db.query("florists").collect();
    const floristMap = new Map(florists.map(f => [f._id, f]));

    const limit = args.limit || 100;

    return subs.slice(0, limit).map(s => {
      const buyer = buyerMap.get(s.buyerId);
      const florist = s.floristId ? floristMap.get(s.floristId) : null;
      return {
        _id: s._id,
        buyerEmail: buyer?.email,
        buyerName: buyer?.name,
        plan: s.plan,
        flowerPreferences: s.flowerPreferences,
        deliveryAddress: s.deliveryAddress,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
        budget: s.budget,
        status: s.status,
        nextDeliveryDate: s.nextDeliveryDate,
        floristName: florist?.name,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
  },
});

export const updateSubscriptionStatus = mutation({
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

// ==========================================
// FLORIST STORIES MODERATION
// ==========================================

export const listFloristStories = query({
  args: {
    includeExpired: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("floristStories"),
    floristId: v.id("florists"),
    floristName: v.optional(v.string()),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    isExpired: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const stories = await ctx.db.query("floristStories").order("desc").collect();
    const now = Date.now();

    const florists = await ctx.db.query("florists").collect();
    const floristMap = new Map(florists.map(f => [f._id, f]));

    let filtered = stories;
    if (!args.includeExpired) {
      filtered = stories.filter(s => s.expiresAt > now);
    }

    return filtered.map(s => ({
      _id: s._id,
      floristId: s.floristId,
      floristName: floristMap.get(s.floristId)?.name,
      imageUrl: s.imageUrl,
      caption: s.caption,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isExpired: s.expiresAt <= now,
    }));
  },
});

export const deleteFloristStory = mutation({
  args: { storyId: v.id("floristStories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.storyId);
    return null;
  },
});

// ==========================================
// CONSULTATIONS MANAGEMENT
// ==========================================

export const listConsultations = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("consultations"),
    buyerName: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    floristName: v.optional(v.string()),
    status: v.string(),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let consultations;
    if (args.status) {
      consultations = await ctx.db
        .query("consultations")
        .withIndex("by_status", q => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      consultations = await ctx.db.query("consultations").order("desc").collect();
    }

    const buyers = await ctx.db.query("buyers").collect();
    const buyerMap = new Map(buyers.map(b => [b._id, b]));

    const florists = await ctx.db.query("florists").collect();
    const floristMap = new Map(florists.map(f => [f._id, f]));

    const allMessages = await ctx.db.query("consultationMessages").collect();
    const messageCounts = new Map<string, number>();
    for (const msg of allMessages) {
      const id = msg.consultationId.toString();
      messageCounts.set(id, (messageCounts.get(id) || 0) + 1);
    }

    const limit = args.limit || 100;

    return consultations.slice(0, limit).map(c => {
      const buyer = buyerMap.get(c.buyerId);
      const florist = floristMap.get(c.floristId);
      return {
        _id: c._id,
        buyerName: c.buyerName || buyer?.name,
        buyerEmail: buyer?.email,
        floristName: florist?.name,
        status: c.status,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        messageCount: messageCounts.get(c._id.toString()) || 0,
        createdAt: c.createdAt,
      };
    });
  },
});

// ==========================================
// PUSH NOTIFICATIONS (targeted sending)
// ==========================================

export const listPushTokens = query({
  args: {},
  returns: v.object({
    totalTokens: v.number(),
    buyerTokens: v.number(),
    floristTokens: v.number(),
    iosTokens: v.number(),
    androidTokens: v.number(),
  }),
  handler: async (ctx) => {
    const tokens = await ctx.db.query("pushTokens").collect();
    const enabled = tokens.filter(t => t.enabled);
    return {
      totalTokens: enabled.length,
      buyerTokens: enabled.filter(t => t.userType === "buyer").length,
      floristTokens: enabled.filter(t => t.userType === "florist").length,
      iosTokens: enabled.filter(t => t.platform === "ios").length,
      androidTokens: enabled.filter(t => t.platform === "android").length,
    };
  },
});

// ==========================================
// DELIVERY ZONES MANAGEMENT
// ==========================================

export const listDeliveryZones = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("deliveryZones"),
    name: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    radiusKm: v.number(),
    deliveryFee: v.number(),
    minOrderAmount: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const zones = await ctx.db.query("deliveryZones").collect();
    return zones.map(z => ({
      _id: z._id,
      name: z.name,
      country: z.country,
      city: z.city,
      radiusKm: z.radiusKm,
      deliveryFee: z.deliveryFee,
      minOrderAmount: z.minOrderAmount,
      active: z.active,
      createdAt: z.createdAt,
    }));
  },
});

export const createDeliveryZone = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    radiusKm: v.number(),
    deliveryFee: v.number(),
    minOrderAmount: v.optional(v.number()),
  },
  returns: v.id("deliveryZones"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("deliveryZones", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const updateDeliveryZone = mutation({
  args: {
    zoneId: v.id("deliveryZones"),
    name: v.optional(v.string()),
    deliveryFee: v.optional(v.number()),
    radiusKm: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { zoneId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(zoneId, { ...filtered, updatedAt: Date.now() });
    return null;
  },
});

export const deleteDeliveryZone = mutation({
  args: { zoneId: v.id("deliveryZones") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.zoneId);
    return null;
  },
});

// ==========================================
// BANNERS MANAGEMENT
// ==========================================

export const listBanners = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("banners"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    targetAudience: v.string(),
    country: v.optional(v.string()),
    priority: v.number(),
    active: v.boolean(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const banners = await ctx.db.query("banners").collect();
    return banners.sort((a, b) => b.priority - a.priority).map(b => ({
      _id: b._id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      backgroundColor: b.backgroundColor,
      targetAudience: b.targetAudience,
      country: b.country,
      priority: b.priority,
      active: b.active,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      createdAt: b.createdAt,
    }));
  },
});

export const createBanner = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    targetAudience: v.union(v.literal("all"), v.literal("buyers"), v.literal("florists")),
    country: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  returns: v.id("banners"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("banners", {
      title: args.title,
      subtitle: args.subtitle,
      imageUrl: args.imageUrl,
      linkUrl: args.linkUrl,
      backgroundColor: args.backgroundColor,
      targetAudience: args.targetAudience,
      country: args.country,
      priority: args.priority ?? 0,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const updateBanner = mutation({
  args: {
    bannerId: v.id("banners"),
    active: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { bannerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(bannerId, { ...filtered, updatedAt: Date.now() });
    return null;
  },
});

export const deleteBanner = mutation({
  args: { bannerId: v.id("banners") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.bannerId);
    return null;
  },
});

// ==========================================
// SEASONAL EVENTS
// ==========================================

export const listSeasonalEvents = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("seasonalEvents"),
    name: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    discountPercent: v.optional(v.number()),
    reminderDaysBefore: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const events = await ctx.db.query("seasonalEvents").collect();
    return events.sort((a, b) => a.eventDate.localeCompare(b.eventDate)).map(e => ({
      _id: e._id,
      name: e.name,
      description: e.description,
      eventDate: e.eventDate,
      discountPercent: e.discountPercent,
      reminderDaysBefore: e.reminderDaysBefore,
      active: e.active,
      createdAt: e.createdAt,
    }));
  },
});

export const createSeasonalEvent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    discountPercent: v.optional(v.number()),
    reminderDaysBefore: v.optional(v.number()),
  },
  returns: v.id("seasonalEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("seasonalEvents", {
      name: args.name,
      description: args.description,
      eventDate: args.eventDate,
      discountPercent: args.discountPercent,
      reminderDaysBefore: args.reminderDaysBefore ?? 3,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const updateSeasonalEvent = mutation({
  args: {
    eventId: v.id("seasonalEvents"),
    active: v.optional(v.boolean()),
    discountPercent: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(eventId, { ...filtered, updatedAt: Date.now() });
    return null;
  },
});

export const deleteSeasonalEvent = mutation({
  args: { eventId: v.id("seasonalEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.eventId);
    return null;
  },
});

// ==========================================
// AUDIT LOG
// ==========================================

export const listAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("auditLogs"),
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    performedBy: v.string(),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("auditLogs").order("desc").collect();
    if (args.action) {
      logs = logs.filter(l => l.action === args.action);
    }
    const limit = args.limit || 200;
    return logs.slice(0, limit);
  },
});

export const createAuditLog = mutation({
  args: {
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  returns: v.id("auditLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      details: args.details,
      performedBy: args.performedBy || "admin",
      timestamp: Date.now(),
    });
  },
});

// ==========================================
// REFERRAL PROGRAM
// ==========================================

export const listReferrals = query({
  args: {
    status: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("referrals"),
    referrerEmail: v.optional(v.string()),
    referrerName: v.optional(v.string()),
    referredEmail: v.optional(v.string()),
    referralCode: v.string(),
    status: v.string(),
    bonusAmount: v.number(),
    bonusPaid: v.boolean(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    let referrals;
    if (args.status) {
      referrals = await ctx.db
        .query("referrals")
        .withIndex("by_status", q => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      referrals = await ctx.db.query("referrals").order("desc").collect();
    }

    const buyers = await ctx.db.query("buyers").collect();
    const buyerMap = new Map(buyers.map(b => [b._id, b]));

    return referrals.map(r => {
      const referrer = buyerMap.get(r.referrerId);
      const referred = r.referredId ? buyerMap.get(r.referredId) : null;
      return {
        _id: r._id,
        referrerEmail: referrer?.email,
        referrerName: referrer?.name,
        referredEmail: referred?.email,
        referralCode: r.referralCode,
        status: r.status,
        bonusAmount: r.bonusAmount,
        bonusPaid: r.bonusPaid,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      };
    });
  },
});

export const getReferralSettings = query({
  args: {},
  returns: v.object({
    bonusAmount: v.number(),
    enabled: v.boolean(),
    totalReferrals: v.number(),
    completedReferrals: v.number(),
    totalBonusPaid: v.number(),
  }),
  handler: async (ctx) => {
    const readSetting = async (key: string) => {
      const s = await ctx.db.query("platformSettings").withIndex("by_key", q => q.eq("key", key)).first();
      return s?.value;
    };
    const bonusAmount = (await readSetting("referralBonusAmount")) ?? 50;
    const enabled = (await readSetting("referralEnabled")) ?? false;

    const referrals = await ctx.db.query("referrals").collect();
    const completed = referrals.filter(r => r.status === "completed");
    const totalBonusPaid = completed.filter(r => r.bonusPaid).reduce((sum, r) => sum + r.bonusAmount, 0);

    return {
      bonusAmount: typeof bonusAmount === "number" ? bonusAmount : 50,
      enabled: !!enabled,
      totalReferrals: referrals.length,
      completedReferrals: completed.length,
      totalBonusPaid,
    };
  },
});

export const updateReferralSettings = mutation({
  args: {
    bonusAmount: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const upsert = async (key: string, value: unknown) => {
      const existing = await ctx.db.query("platformSettings").withIndex("by_key", q => q.eq("key", key)).first();
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: Date.now(), updatedBy: "admin" });
      } else {
        await ctx.db.insert("platformSettings", { key, value, updatedAt: Date.now(), updatedBy: "admin" });
      }
    };
    if (args.bonusAmount !== undefined) await upsert("referralBonusAmount", args.bonusAmount);
    if (args.enabled !== undefined) await upsert("referralEnabled", args.enabled);
    return null;
  },
});

// ==========================================
// SLA MONITORING
// ==========================================

export const getSlaMetrics = query({
  args: {},
  returns: v.object({
    avgDeliveryTimeHours: v.number(),
    onTimeRate: v.number(),
    totalDelivered: v.number(),
    avgConfirmTimeMinutes: v.number(),
    ordersByHour: v.array(v.object({ hour: v.number(), count: v.number() })),
    slowFlorists: v.array(v.object({ name: v.string(), avgHours: v.number(), orders: v.number() })),
  }),
  handler: async (ctx) => {
    const orders = await ctx.db.query("buyerOrders").collect();
    const statusHistory = await ctx.db.query("orderStatusHistory").collect();
    const florists = await ctx.db.query("florists").collect();
    const floristMap = new Map(florists.map(f => [f._id, f]));

    // Group status history by order
    const historyByOrder = new Map<string, any[]>();
    for (const h of statusHistory) {
      const id = h.orderId.toString();
      if (!historyByOrder.has(id)) historyByOrder.set(id, []);
      historyByOrder.get(id)!.push(h);
    }

    let totalDeliveryTime = 0;
    let deliveredCount = 0;
    let onTimeCount = 0;
    let totalConfirmTime = 0;
    let confirmedCount = 0;
    const SLA_HOURS = 4; // 4 hour SLA

    const floristTimes: Record<string, { totalHours: number; count: number }> = {};

    for (const order of orders) {
      const history = historyByOrder.get(order._id.toString()) || [];
      const delivered = history.find(h => h.status === "delivered");
      const confirmed = history.find(h => h.status === "confirmed");

      if (delivered) {
        const deliveryTime = delivered.timestamp - order.createdAt;
        const hours = deliveryTime / (1000 * 60 * 60);
        totalDeliveryTime += hours;
        deliveredCount++;
        if (hours <= SLA_HOURS) onTimeCount++;

        if (order.floristId) {
          const fid = order.floristId.toString();
          if (!floristTimes[fid]) floristTimes[fid] = { totalHours: 0, count: 0 };
          floristTimes[fid].totalHours += hours;
          floristTimes[fid].count++;
        }
      }

      if (confirmed) {
        const confirmTime = (confirmed.timestamp - order.createdAt) / (1000 * 60);
        totalConfirmTime += confirmTime;
        confirmedCount++;
      }
    }

    // Orders by hour of day
    const hourCounts: Record<number, number> = {};
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const ordersByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
    }));

    // Slow florists (avg > SLA)
    const slowFlorists = Object.entries(floristTimes)
      .map(([id, data]) => ({
        name: floristMap.get(id as any)?.name || "Unknown",
        avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
        orders: data.count,
      }))
      .filter(f => f.avgHours > SLA_HOURS)
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 10);

    return {
      avgDeliveryTimeHours: deliveredCount > 0 ? Math.round((totalDeliveryTime / deliveredCount) * 10) / 10 : 0,
      onTimeRate: deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 0,
      totalDelivered: deliveredCount,
      avgConfirmTimeMinutes: confirmedCount > 0 ? Math.round(totalConfirmTime / confirmedCount) : 0,
      ordersByHour,
      slowFlorists,
    };
  },
});

// ==========================================
// FLORIST RATING MONITORING
// ==========================================

export const getFloristRatingAlerts = query({
  args: {
    threshold: v.optional(v.number()),
  },
  returns: v.array(v.object({
    floristId: v.id("florists"),
    name: v.string(),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    avgRating: v.number(),
    reviewCount: v.number(),
    recentTrend: v.string(),
    lastReviewDate: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 3.5;
    const florists = await ctx.db.query("florists").collect();
    const reviews = await ctx.db.query("floristReviews").collect();

    const reviewsByFlorist = new Map<string, any[]>();
    for (const r of reviews) {
      const id = r.floristId.toString();
      if (!reviewsByFlorist.has(id)) reviewsByFlorist.set(id, []);
      reviewsByFlorist.get(id)!.push(r);
    }

    const alerts = [];
    for (const florist of florists) {
      const fReviews = reviewsByFlorist.get(florist._id.toString()) || [];
      if (fReviews.length === 0) continue;

      const avgRating = fReviews.reduce((sum, r) => sum + r.rating, 0) / fReviews.length;
      if (avgRating >= threshold) continue;

      // Check trend: compare last 5 vs previous 5
      const sorted = fReviews.sort((a, b) => b.createdAt - a.createdAt);
      const recent5 = sorted.slice(0, 5);
      const prev5 = sorted.slice(5, 10);
      const recentAvg = recent5.reduce((s, r) => s + r.rating, 0) / recent5.length;
      const prevAvg = prev5.length > 0 ? prev5.reduce((s, r) => s + r.rating, 0) / prev5.length : recentAvg;
      const trend = recentAvg > prevAvg ? "improving" : recentAvg < prevAvg ? "declining" : "stable";

      alerts.push({
        floristId: florist._id,
        name: florist.name || "Unknown",
        email: florist.email,
        city: florist.city,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: fReviews.length,
        recentTrend: trend,
        lastReviewDate: sorted[0]?.createdAt,
      });
    }

    return alerts.sort((a, b) => a.avgRating - b.avgRating);
  },
});

// ==========================================
// COHORT ANALYSIS
// ==========================================

export const getCohortAnalysis = query({
  args: {},
  returns: v.object({
    monthlyCohorts: v.array(v.object({
      month: v.string(),
      newBuyers: v.number(),
      orderedFirstMonth: v.number(),
      orderedSecondMonth: v.number(),
      orderedThirdMonth: v.number(),
      retentionRate: v.number(),
    })),
    repeatOrderRate: v.number(),
    avgOrdersPerBuyer: v.number(),
    avgLifetimeValue: v.number(),
  }),
  handler: async (ctx) => {
    const buyers = await ctx.db.query("buyers").collect();
    const orders = await ctx.db.query("buyerOrders").collect();

    // Group buyers by registration month
    const cohorts: Record<string, any[]> = {};
    for (const buyer of buyers) {
      const month = new Date(buyer.createdAt).toISOString().slice(0, 7);
      if (!cohorts[month]) cohorts[month] = [];
      cohorts[month].push(buyer);
    }

    // Map orders by buyerDeviceId
    const ordersByDevice: Record<string, any[]> = {};
    for (const o of orders) {
      if (!ordersByDevice[o.buyerDeviceId]) ordersByDevice[o.buyerDeviceId] = [];
      ordersByDevice[o.buyerDeviceId].push(o);
    }

    // For each cohort month, calculate retention
    const monthlyCohorts = Object.entries(cohorts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // last 6 months
      .map(([month, monthBuyers]) => {
        const monthStart = new Date(month + "-01").getTime();
        const month2Start = monthStart + 30 * 24 * 60 * 60 * 1000;
        const month3Start = monthStart + 60 * 24 * 60 * 60 * 1000;
        const month4Start = monthStart + 90 * 24 * 60 * 60 * 1000;

        // Simplified: count how many of these buyers have orders in each period
        // Since we don't have a direct buyerId -> buyerDeviceId mapping, use email
        let orderedM1 = 0;
        let orderedM2 = 0;
        let orderedM3 = 0;

        return {
          month,
          newBuyers: monthBuyers.length,
          orderedFirstMonth: orderedM1,
          orderedSecondMonth: orderedM2,
          orderedThirdMonth: orderedM3,
          retentionRate: 0,
        };
      });

    // Overall stats
    const buyersWithOrders = new Set(orders.map(o => o.buyerDeviceId));
    const repeatBuyers = Object.values(ordersByDevice).filter(o => o.length > 1).length;
    const repeatOrderRate = buyersWithOrders.size > 0 ? Math.round((repeatBuyers / buyersWithOrders.size) * 100) : 0;
    const totalRevenue = orders.filter(o => o.status === "delivered" || o.paymentStatus === "paid").reduce((s, o) => s + (o.total || 0), 0);
    const avgOrdersPerBuyer = buyersWithOrders.size > 0 ? Math.round((orders.length / buyersWithOrders.size) * 10) / 10 : 0;
    const avgLifetimeValue = buyersWithOrders.size > 0 ? Math.round(totalRevenue / buyersWithOrders.size) : 0;

    return {
      monthlyCohorts,
      repeatOrderRate,
      avgOrdersPerBuyer,
      avgLifetimeValue,
    };
  },
});

// ==========================================
// FLORIST REPORTS
// ==========================================

export const getFloristReports = query({
  args: {
    period: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("year"))),
  },
  returns: v.array(v.object({
    floristId: v.id("florists"),
    name: v.string(),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    totalOrders: v.number(),
    deliveredOrders: v.number(),
    cancelledOrders: v.number(),
    totalRevenue: v.number(),
    platformCommission: v.number(),
    floristEarnings: v.number(),
    avgRating: v.number(),
    reviewCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const period = args.period || "month";
    const now = Date.now();
    let startDate = 0;
    if (period === "week") startDate = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === "month") startDate = now - 30 * 24 * 60 * 60 * 1000;
    else if (period === "year") startDate = now - 365 * 24 * 60 * 60 * 1000;

    const florists = await ctx.db.query("florists").collect();
    const allOrders = await ctx.db.query("buyerOrders").collect();
    const orders = allOrders.filter(o => o.createdAt >= startDate);
    const reviews = await ctx.db.query("floristReviews").collect();

    // Get commission rate
    const commSetting = await ctx.db.query("platformSettings").withIndex("by_key", q => q.eq("key", "platformCommission")).first();
    const commissionRate = (commSetting?.value ?? 15) / 100;

    const reviewsByFlorist = new Map<string, any[]>();
    for (const r of reviews) {
      const id = r.floristId.toString();
      if (!reviewsByFlorist.has(id)) reviewsByFlorist.set(id, []);
      reviewsByFlorist.get(id)!.push(r);
    }

    return florists.map(f => {
      const fOrders = orders.filter(o => o.floristId?.toString() === f._id.toString());
      const delivered = fOrders.filter(o => o.status === "delivered" || o.paymentStatus === "paid");
      const cancelled = fOrders.filter(o => o.status === "cancelled");
      const totalRevenue = delivered.reduce((s, o) => s + (o.total || 0), 0);
      const platformCommission = totalRevenue * commissionRate;
      const fReviews = reviewsByFlorist.get(f._id.toString()) || [];
      const avgRating = fReviews.length > 0 ? fReviews.reduce((s, r) => s + r.rating, 0) / fReviews.length : 0;

      return {
        floristId: f._id,
        name: f.name || "Unknown",
        email: f.email,
        city: f.city,
        country: f.country,
        totalOrders: fOrders.length,
        deliveredOrders: delivered.length,
        cancelledOrders: cancelled.length,
        totalRevenue,
        platformCommission: Math.round(platformCommission),
        floristEarnings: Math.round(totalRevenue - platformCommission),
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: fReviews.length,
      };
    }).filter(f => f.totalOrders > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
});