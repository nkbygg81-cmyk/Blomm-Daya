import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update courier location
export const updateCourierLocation = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    lat: v.number(),
    lon: v.number(),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
    estimatedArrival: v.optional(v.number()),
  },
  returns: v.id("courierLocations"),
  handler: async (ctx, args) => {
    // Check if location record exists
    const existing = await ctx.db
      .query("courierLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        lat: args.lat,
        lon: args.lon,
        heading: args.heading,
        speed: args.speed,
        estimatedArrival: args.estimatedArrival,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new record
    return await ctx.db.insert("courierLocations", {
      orderId: args.orderId,
      floristId: args.floristId,
      lat: args.lat,
      lon: args.lon,
      heading: args.heading,
      speed: args.speed,
      estimatedArrival: args.estimatedArrival,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get courier location for order (buyer view)
export const getCourierLocation = query({
  args: {
    orderId: v.id("buyerOrders"),
  },
  returns: v.union(
    v.object({
      lat: v.number(),
      lon: v.number(),
      heading: v.optional(v.number()),
      speed: v.optional(v.number()),
      estimatedArrival: v.optional(v.number()),
      updatedAt: v.number(),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const location = await ctx.db
      .query("courierLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!location) return null;

    // Only return if active and updated recently (within 10 minutes)
    const isRecent = Date.now() - location.updatedAt < 10 * 60 * 1000;
    
    return {
      lat: location.lat,
      lon: location.lon,
      heading: location.heading,
      speed: location.speed,
      estimatedArrival: location.estimatedArrival,
      updatedAt: location.updatedAt,
      isActive: location.isActive && isRecent,
    };
  },
});

// Start delivery tracking (florist initiates)
export const startDeliveryTracking = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    courierName: v.optional(v.string()),
    courierPhone: v.optional(v.string()),
  },
  returns: v.id("courierLocations"),
  handler: async (ctx, args) => {
    // Get order details
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Verify florist owns this order
    if (order.floristId !== args.floristId) {
      throw new Error("Unauthorized");
    }

    // Check if tracking already exists
    const existing = await ctx.db
      .query("courierLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existing) {
      // Reactivate existing tracking
      await ctx.db.patch(existing._id, {
        isActive: true,
        courierName: args.courierName,
        courierPhone: args.courierPhone,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create tracking record (location will be updated separately)
    return await ctx.db.insert("courierLocations", {
      orderId: args.orderId,
      floristId: args.floristId,
      lat: 0, // Will be updated
      lon: 0,
      isActive: true,
      courierName: args.courierName,
      courierPhone: args.courierPhone,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Stop delivery tracking
export const stopDeliveryTracking = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const location = await ctx.db
      .query("courierLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (location && location.floristId === args.floristId) {
      await ctx.db.patch(location._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

// Get active deliveries for florist
export const getActiveDeliveries = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.array(v.object({
    _id: v.id("courierLocations"),
    orderId: v.id("buyerOrders"),
    lat: v.number(),
    lon: v.number(),
    courierName: v.optional(v.string()),
    estimatedArrival: v.optional(v.number()),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const deliveries = await ctx.db
      .query("courierLocations")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return deliveries.map((d) => ({
      _id: d._id,
      orderId: d.orderId,
      lat: d.lat,
      lon: d.lon,
      courierName: d.courierName,
      estimatedArrival: d.estimatedArrival,
      updatedAt: d.updatedAt,
    }));
  },
});

// Calculate ETA based on distance
export const calculateETA = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    currentLat: v.number(),
    currentLon: v.number(),
  },
  returns: v.object({
    estimatedMinutes: v.number(),
    distanceKm: v.number(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || !order.deliveryLat || !order.deliveryLon) {
      return { estimatedMinutes: 0, distanceKm: 0 };
    }

    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = (order.deliveryLat - args.currentLat) * Math.PI / 180;
    const dLon = (order.deliveryLon - args.currentLon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(args.currentLat * Math.PI / 180) * Math.cos(order.deliveryLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Estimate time (assuming average 30 km/h in city)
    const estimatedMinutes = Math.round(distance / 30 * 60);

    // Update courier location with ETA
    const location = await ctx.db
      .query("courierLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (location) {
      await ctx.db.patch(location._id, {
        estimatedArrival: Date.now() + estimatedMinutes * 60 * 1000,
        updatedAt: Date.now(),
      });
    }

    return {
      estimatedMinutes,
      distanceKm: Math.round(distance * 10) / 10,
    };
  },
});
