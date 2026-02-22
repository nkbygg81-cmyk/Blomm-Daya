import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get available delivery time slots for a date
export const getAvailableSlots = query({
  args: {
    floristId: v.optional(v.id("florists")),
    date: v.string(), // ISO date string YYYY-MM-DD
    city: v.optional(v.string()),
  },
  returns: v.array(v.object({
    id: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    label: v.string(),
    available: v.boolean(),
    extraFee: v.number(),
  })),
  handler: async (ctx, args) => {
    // Default time slots
    const defaultSlots = [
      { id: "morning", startTime: "09:00", endTime: "12:00", label: "Ранок (9:00-12:00)", extraFee: 0 },
      { id: "afternoon", startTime: "12:00", endTime: "15:00", label: "День (12:00-15:00)", extraFee: 0 },
      { id: "evening", startTime: "15:00", endTime: "18:00", label: "Вечір (15:00-18:00)", extraFee: 0 },
      { id: "late_evening", startTime: "18:00", endTime: "21:00", label: "Пізній вечір (18:00-21:00)", extraFee: 50 },
      { id: "express_1h", startTime: "ASAP", endTime: "+1h", label: "Експрес (протягом 1 години)", extraFee: 150 },
      { id: "express_2h", startTime: "ASAP", endTime: "+2h", label: "Експрес (протягом 2 годин)", extraFee: 100 },
    ];

    // Check if date is today
    const today = new Date().toISOString().split("T")[0];
    const isToday = args.date === today;
    const currentHour = new Date().getHours();

    // Get florist-specific slots if available
    let floristSlots: any[] = [];
    if (args.floristId) {
      floristSlots = await ctx.db
        .query("deliveryTimeSlots")
        .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
    }

    // Use florist slots or default slots
    const slots = floristSlots.length > 0 ? floristSlots : defaultSlots;

    // Check existing bookings for the date
    const existingBookings = await ctx.db
      .query("deliverySlotBookings")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // Filter by florist if specified
    const relevantBookings = args.floristId
      ? existingBookings.filter((b) => b.floristId === args.floristId)
      : existingBookings;

    // Count bookings per slot
    const bookingCounts: Record<string, number> = {};
    relevantBookings.forEach((b) => {
      bookingCounts[b.slotId] = (bookingCounts[b.slotId] || 0) + 1;
    });

    // Max orders per slot (can be configured per florist)
    const maxOrdersPerSlot = 10;

    return slots.map((slot) => {
      const slotId = slot.id;
      const bookingCount = bookingCounts[slotId] || 0;
      
      // Check availability
      let available = bookingCount < maxOrdersPerSlot;
      
      // If today, check if slot time has passed
      if (isToday && slot.startTime !== "ASAP") {
        const slotHour = parseInt(slot.startTime.split(":")[0]);
        if (currentHour >= slotHour) {
          available = false;
        }
      }

      // Express slots only available for today
      if (slotId.startsWith("express_") && !isToday) {
        available = false;
      }

      return {
        id: slotId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label,
        available,
        extraFee: slot.extraFee || 0,
      };
    });
  },
});

// Book a delivery time slot
export const bookDeliverySlot = mutation({
  args: {
    orderId: v.id("buyerOrders"),
    floristId: v.optional(v.id("florists")),
    date: v.string(),
    slotId: v.string(),
    extraFee: v.number(),
  },
  returns: v.id("deliverySlotBookings"),
  handler: async (ctx, args) => {
    // Check if slot is still available
    const existingBookings = await ctx.db
      .query("deliverySlotBookings")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.eq(q.field("slotId"), args.slotId))
      .collect();

    const relevantBookings = args.floristId
      ? existingBookings.filter((b) => b.floristId === args.floristId)
      : existingBookings;

    if (relevantBookings.length >= 10) {
      throw new Error("Time slot is no longer available");
    }

    return await ctx.db.insert("deliverySlotBookings", {
      orderId: args.orderId,
      floristId: args.floristId,
      date: args.date,
      slotId: args.slotId,
      extraFee: args.extraFee,
      createdAt: Date.now(),
    });
  },
});

// Get order's delivery slot
export const getOrderDeliverySlot = query({
  args: {
    orderId: v.id("buyerOrders"),
  },
  returns: v.union(
    v.object({
      date: v.string(),
      slotId: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      extraFee: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("deliverySlotBookings")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!booking) return null;

    // Get slot details
    const slotDetails: Record<string, { startTime: string; endTime: string }> = {
      morning: { startTime: "09:00", endTime: "12:00" },
      afternoon: { startTime: "12:00", endTime: "15:00" },
      evening: { startTime: "15:00", endTime: "18:00" },
      late_evening: { startTime: "18:00", endTime: "21:00" },
      express_1h: { startTime: "ASAP", endTime: "+1h" },
      express_2h: { startTime: "ASAP", endTime: "+2h" },
    };

    const slot = slotDetails[booking.slotId] || { startTime: "N/A", endTime: "N/A" };

    return {
      date: booking.date,
      slotId: booking.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      extraFee: booking.extraFee,
    };
  },
});

// Configure florist delivery slots
export const configureFloristSlots = mutation({
  args: {
    floristId: v.id("florists"),
    slots: v.array(v.object({
      id: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      label: v.string(),
      labelUk: v.optional(v.string()),
      labelSv: v.optional(v.string()),
      extraFee: v.number(),
      active: v.boolean(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete existing slots
    const existing = await ctx.db
      .query("deliveryTimeSlots")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    // Insert new slots
    for (const slot of args.slots) {
      await ctx.db.insert("deliveryTimeSlots", {
        floristId: args.floristId,
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label,
        labelUk: slot.labelUk,
        labelSv: slot.labelSv,
        extraFee: slot.extraFee,
        active: slot.active,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// Get delivery slots for florist management
export const getFloristSlots = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.array(v.object({
    _id: v.id("deliveryTimeSlots"),
    id: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    label: v.string(),
    extraFee: v.number(),
    active: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const slots = await ctx.db
      .query("deliveryTimeSlots")
      .withIndex("by_floristId", (q) => q.eq("floristId", args.floristId))
      .collect();

    return slots.map((s) => ({
      _id: s._id,
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      label: s.label,
      extraFee: s.extraFee,
      active: s.active,
    }));
  },
});
