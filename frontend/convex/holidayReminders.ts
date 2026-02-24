import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Get all holidays
 */
export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.onlyActive) {
      return await ctx.db
        .query("holidays")
        .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
        .collect();
    }
    return await ctx.db.query("holidays").collect();
  },
});

/**
 * Get upcoming holidays (next 30 days)
 */
export const getUpcoming = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    const allHolidays = await ctx.db
      .query("holidays")
      .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
      .collect();
    
    // Filter holidays that are coming up in the next 30 days
    const upcoming = allHolidays.filter((holiday: any) => {
      const holidayDate = new Date(now.getFullYear(), holiday.month - 1, holiday.day);
      
      // If holiday already passed this year, check next year
      if (holidayDate < now) {
        holidayDate.setFullYear(holidayDate.getFullYear() + 1);
      }
      
      const daysUntil = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    });
    
    // Sort by date
    upcoming.sort((a: any, b: any) => {
      const dateA = new Date(now.getFullYear(), a.month - 1, a.day);
      const dateB = new Date(now.getFullYear(), b.month - 1, b.day);
      if (dateA < now) dateA.setFullYear(dateA.getFullYear() + 1);
      if (dateB < now) dateB.setFullYear(dateB.getFullYear() + 1);
      return dateA.getTime() - dateB.getTime();
    });
    
    return upcoming.map((h: any) => {
      const holidayDate = new Date(now.getFullYear(), h.month - 1, h.day);
      if (holidayDate < now) holidayDate.setFullYear(holidayDate.getFullYear() + 1);
      const daysUntil = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...h,
        daysUntil,
        dateFormatted: `${h.day}.${h.month}`,
      };
    });
  },
});

/**
 * Create a holiday (admin)
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    month: v.number(),
    day: v.number(),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    reminderDaysBefore: v.number(),
    holidayType: v.union(
      v.literal("national"),
      v.literal("religious"),
      v.literal("international"),
      v.literal("custom")
    ),
    emoji: v.optional(v.string()),
  },
  returns: v.id("holidays"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("holidays", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update holiday
 */
export const update = mutation({
  args: {
    holidayId: v.id("holidays"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    month: v.optional(v.number()),
    day: v.optional(v.number()),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    reminderDaysBefore: v.optional(v.number()),
    holidayType: v.optional(v.union(
      v.literal("national"),
      v.literal("religious"),
      v.literal("international"),
      v.literal("custom")
    )),
    emoji: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { holidayId, ...updates } = args;
    const existing = await ctx.db.get(holidayId);
    if (!existing) return false;
    
    await ctx.db.patch(holidayId, updates);
    return true;
  },
});

/**
 * Delete holiday
 */
export const remove = mutation({
  args: { holidayId: v.id("holidays") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.holidayId);
    if (!existing) return false;
    await ctx.db.delete(args.holidayId);
    return true;
  },
});

/**
 * Subscribe to holiday reminders
 */
export const subscribe = mutation({
  args: {
    buyerDeviceId: v.string(),
    enabledTypes: v.array(v.string()),
    pushToken: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("holidayReminderSubscriptions")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabledTypes: args.enabledTypes,
        pushToken: args.pushToken,
        isEnabled: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("holidayReminderSubscriptions", {
        buyerDeviceId: args.buyerDeviceId,
        enabledTypes: args.enabledTypes,
        pushToken: args.pushToken,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return true;
  },
});

/**
 * Unsubscribe from holiday reminders
 */
export const unsubscribe = mutation({
  args: { buyerDeviceId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("holidayReminderSubscriptions")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: false,
        updatedAt: Date.now(),
      });
    }
    
    return true;
  },
});

/**
 * Get user's subscription settings
 */
export const getSubscription = query({
  args: { buyerDeviceId: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("holidayReminderSubscriptions")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .first();
  },
});

/**
 * Seed default Ukrainian holidays
 */
export const seedDefaultHolidays = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const defaultHolidays = [
      { name: "New Year", nameUk: "Новий рік", month: 1, day: 1, holidayType: "national" as const, emoji: "🎄", reminderDaysBefore: 3 },
      { name: "Christmas (Orthodox)", nameUk: "Різдво", month: 1, day: 7, holidayType: "religious" as const, emoji: "⭐", reminderDaysBefore: 2 },
      { name: "Valentine's Day", nameUk: "День Святого Валентина", month: 2, day: 14, holidayType: "international" as const, emoji: "❤️", reminderDaysBefore: 3 },
      { name: "International Women's Day", nameUk: "8 Березня", month: 3, day: 8, holidayType: "international" as const, emoji: "💐", reminderDaysBefore: 3 },
      { name: "Easter", nameUk: "Великдень", month: 4, day: 20, holidayType: "religious" as const, emoji: "🥚", reminderDaysBefore: 3 },
      { name: "Mother's Day", nameUk: "День Матері", month: 5, day: 12, holidayType: "international" as const, emoji: "👩‍👧", reminderDaysBefore: 3 },
      { name: "Father's Day", nameUk: "День Батька", month: 6, day: 16, holidayType: "international" as const, emoji: "👨‍👧", reminderDaysBefore: 2 },
      { name: "Independence Day", nameUk: "День Незалежності", month: 8, day: 24, holidayType: "national" as const, emoji: "🇺🇦", reminderDaysBefore: 2 },
      { name: "Teacher's Day", nameUk: "День Вчителя", month: 10, day: 6, holidayType: "international" as const, emoji: "📚", reminderDaysBefore: 2 },
      { name: "Halloween", nameUk: "Хеловін", month: 10, day: 31, holidayType: "international" as const, emoji: "🎃", reminderDaysBefore: 2 },
      { name: "Christmas (Catholic)", nameUk: "Різдво (католицьке)", month: 12, day: 25, holidayType: "religious" as const, emoji: "🎄", reminderDaysBefore: 3 },
    ];
    
    let count = 0;
    for (const holiday of defaultHolidays) {
      // Check if already exists
      const existing = await ctx.db
        .query("holidays")
        .withIndex("by_month_day", (q: any) => q.eq("month", holiday.month).eq("day", holiday.day))
        .first();
      
      if (!existing) {
        await ctx.db.insert("holidays", {
          ...holiday,
          isActive: true,
          createdAt: Date.now(),
        });
        count++;
      }
    }
    
    return count;
  },
});

/**
 * Check and send holiday reminders (called by cron or scheduled function)
 */
export const checkAndSendReminders = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get all active holidays
    const holidays = await ctx.db
      .query("holidays")
      .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
      .collect();
    
    // Get all enabled subscriptions
    const subscriptions = await ctx.db
      .query("holidayReminderSubscriptions")
      .withIndex("by_isEnabled", (q: any) => q.eq("isEnabled", true))
      .collect();
    
    let sentCount = 0;
    
    for (const holiday of holidays) {
      // Calculate days until this holiday
      const holidayDate = new Date(currentYear, holiday.month - 1, holiday.day);
      if (holidayDate < now) {
        holidayDate.setFullYear(currentYear + 1);
      }
      
      const daysUntil = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if we should send reminder
      if (daysUntil === holiday.reminderDaysBefore) {
        for (const sub of subscriptions) {
          // Check if user subscribed to this holiday type
          if (!sub.enabledTypes.includes(holiday.holidayType)) continue;
          if (!sub.pushToken) continue;
          
          // Check if already sent this year
          const alreadySent = await ctx.db
            .query("sentHolidayReminders")
            .withIndex("by_buyerDeviceId_holidayId_year", (q: any) => 
              q.eq("buyerDeviceId", sub.buyerDeviceId)
                .eq("holidayId", holiday._id)
                .eq("year", currentYear)
            )
            .first();
          
          if (alreadySent) continue;
          
          // Queue push notification (would be sent via external service)
          await ctx.db.insert("sentHolidayReminders", {
            buyerDeviceId: sub.buyerDeviceId,
            holidayId: holiday._id,
            year: currentYear,
            sentAt: Date.now(),
          });
          
          sentCount++;
        }
      }
    }
    
    return sentCount;
  },
});
