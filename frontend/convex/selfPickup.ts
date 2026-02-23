import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get pickup points for a florist
export const getPickupPoints = query({
  args: {
    floristId: v.optional(v.id("florists")),
    city: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("pickupPoints"),
    floristId: v.optional(v.id("florists")),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    workingHours: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("pickupPoints");

    if (args.floristId) {
      query = query.filter((q) => q.eq(q.field("floristId"), args.floristId));
    }

    const points = await query.collect();

    // Filter by city if specified
    let filtered = points.filter((p) => p.isActive);
    if (args.city) {
      filtered = filtered.filter((p) => 
        p.city.toLowerCase().includes(args.city!.toLowerCase())
      );
    }

    return filtered;
  },
});

// Create pickup point (for florists)
export const createPickupPoint = mutation({
  args: {
    floristId: v.id("florists"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    workingHours: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.id("pickupPoints"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("pickupPoints", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update pickup point
export const updatePickupPoint = mutation({
  args: {
    pointId: v.id("pickupPoints"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { pointId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(pointId, filteredUpdates);
    }
    return null;
  },
});

// Delete pickup point
export const deletePickupPoint = mutation({
  args: {
    pointId: v.id("pickupPoints"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pointId, { isActive: false });
    return null;
  },
});

// Get order with pickup info
export const getOrderPickupInfo = query({
  args: {
    orderId: v.id("buyerOrders"),
  },
  returns: v.union(
    v.object({
      pickupPointId: v.id("pickupPoints"),
      pickupPoint: v.object({
        name: v.string(),
        address: v.string(),
        city: v.string(),
        workingHours: v.string(),
        phone: v.optional(v.string()),
      }),
      pickupCode: v.string(),
      pickupStatus: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || !order.pickupPointId) return null;

    const point = await ctx.db.get(order.pickupPointId);
    if (!point) return null;

    return {
      pickupPointId: order.pickupPointId,
      pickupPoint: {
        name: point.name,
        address: point.address,
        city: point.city,
        workingHours: point.workingHours,
        phone: point.phone,
      },
      pickupCode: order.pickupCode || "----",
      pickupStatus: order.pickupStatus || "pending",
    };
  },
});

// Mark order as picked up
export const markOrderPickedUp = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    pickupCode: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.pickupCode !== args.pickupCode) {
      return { success: false, error: "Invalid pickup code" };
    }

    await ctx.db.patch(args.orderId, {
      pickupStatus: "picked_up",
      pickedUpAt: Date.now(),
      status: "delivered",
    });

    return { success: true };
  },
});

// Generate pickup code for order
export const generatePickupCode = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    pickupPointId: v.id("pickupPoints"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    await ctx.db.patch(args.orderId, {
      pickupPointId: args.pickupPointId,
      pickupCode: code,
      pickupStatus: "pending",
      deliveryType: "pickup",
    });

    return code;
  },
});
