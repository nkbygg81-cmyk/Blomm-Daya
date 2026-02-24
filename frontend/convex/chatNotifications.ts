import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Save chat notification settings
 */
export const saveSettings = mutation({
  args: {
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    userId: v.string(),
    enablePush: v.boolean(),
    enableSound: v.boolean(),
    enableVibration: v.boolean(),
    quietHoursEnabled: v.boolean(),
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
    pushToken: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatNotificationSettings")
      .withIndex("by_userType_userId", (q: any) => 
        q.eq("userType", args.userType).eq("userId", args.userId)
      )
      .first();
    
    const now = Date.now();
    const { userType, userId, ...settings } = args;
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...settings,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("chatNotificationSettings", {
        userType,
        userId,
        ...settings,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return true;
  },
});

/**
 * Get chat notification settings
 */
export const getSettings = query({
  args: {
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    userId: v.string(),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("chatNotificationSettings")
      .withIndex("by_userType_userId", (q: any) => 
        q.eq("userType", args.userType).eq("userId", args.userId)
      )
      .first();
    
    // Return default settings if not found
    if (!settings) {
      return {
        userType: args.userType,
        userId: args.userId,
        enablePush: true,
        enableSound: true,
        enableVibration: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        pushToken: null,
      };
    }
    
    return settings;
  },
});

/**
 * Queue a chat message notification
 */
export const queueNotification = mutation({
  args: {
    consultationId: v.id("consultations"),
    messageId: v.string(),
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
    senderId: v.string(),
    recipientType: v.union(v.literal("buyer"), v.literal("florist")),
    recipientId: v.string(),
    messagePreview: v.string(),
  },
  returns: v.id("chatMessageQueue"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessageQueue", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Get pending notifications for processing
 */
export const getPendingNotifications = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    return await ctx.db
      .query("chatMessageQueue")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .take(limit);
  },
});

/**
 * Mark notification as sent
 */
export const markAsSent = mutation({
  args: { 
    notificationId: v.id("chatMessageQueue"),
    error: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return false;
    
    await ctx.db.patch(args.notificationId, {
      status: args.error ? "failed" : "sent",
      sentAt: Date.now(),
      error: args.error,
    });
    
    return true;
  },
});

/**
 * Check if user should receive notification (respects quiet hours)
 */
export const shouldNotify = query({
  args: {
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    userId: v.string(),
  },
  returns: v.object({
    shouldSend: v.boolean(),
    reason: v.optional(v.string()),
    pushToken: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("chatNotificationSettings")
      .withIndex("by_userType_userId", (q: any) => 
        q.eq("userType", args.userType).eq("userId", args.userId)
      )
      .first();
    
    // Default: send notifications if no settings
    if (!settings) {
      return { shouldSend: true, pushToken: undefined };
    }
    
    // Check if push is enabled
    if (!settings.enablePush) {
      return { shouldSend: false, reason: "Push notifications disabled" };
    }
    
    // Check push token
    if (!settings.pushToken) {
      return { shouldSend: false, reason: "No push token" };
    }
    
    // Check quiet hours
    if (settings.quietHoursEnabled && settings.quietHoursStart !== null && settings.quietHoursEnd !== null) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Handle overnight quiet hours (e.g., 22:00 - 08:00)
      if (settings.quietHoursStart > settings.quietHoursEnd) {
        if (currentHour >= settings.quietHoursStart || currentHour < settings.quietHoursEnd) {
          return { shouldSend: false, reason: "Quiet hours active", pushToken: settings.pushToken };
        }
      } else {
        if (currentHour >= settings.quietHoursStart && currentHour < settings.quietHoursEnd) {
          return { shouldSend: false, reason: "Quiet hours active", pushToken: settings.pushToken };
        }
      }
    }
    
    return { shouldSend: true, pushToken: settings.pushToken };
  },
});

/**
 * Get unread notifications count for a user
 */
export const getUnreadCount = query({
  args: {
    recipientType: v.union(v.literal("buyer"), v.literal("florist")),
    recipientId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("chatMessageQueue")
      .withIndex("by_recipientType_recipientId", (q: any) => 
        q.eq("recipientType", args.recipientType).eq("recipientId", args.recipientId)
      )
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .collect();
    
    return pending.length;
  },
});

/**
 * Process and send pending chat notifications (internal)
 */
export const processPendingNotifications = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const pendingNotifications = await ctx.db
      .query("chatMessageQueue")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .take(50);
    
    let processedCount = 0;
    
    for (const notification of pendingNotifications) {
      // Get recipient settings
      const settings = await ctx.db
        .query("chatNotificationSettings")
        .withIndex("by_userType_userId", (q: any) => 
          q.eq("userType", notification.recipientType).eq("userId", notification.recipientId)
        )
        .first();
      
      // Default to sending if no settings exist
      let shouldSend = true;
      let pushToken = null;
      
      if (settings) {
        pushToken = settings.pushToken;
        
        if (!settings.enablePush || !settings.pushToken) {
          shouldSend = false;
        }
        
        // Check quiet hours
        if (shouldSend && settings.quietHoursEnabled && 
            settings.quietHoursStart !== null && settings.quietHoursEnd !== null) {
          const now = new Date();
          const currentHour = now.getHours();
          
          if (settings.quietHoursStart > settings.quietHoursEnd) {
            if (currentHour >= settings.quietHoursStart || currentHour < settings.quietHoursEnd) {
              shouldSend = false;
            }
          } else {
            if (currentHour >= settings.quietHoursStart && currentHour < settings.quietHoursEnd) {
              shouldSend = false;
            }
          }
        }
      }
      
      // Mark as sent (actual push would be sent via Expo Push API externally)
      await ctx.db.patch(notification._id, {
        status: shouldSend ? "sent" : "failed",
        sentAt: Date.now(),
        error: shouldSend ? undefined : "Notifications disabled or quiet hours",
      });
      
      processedCount++;
    }
    
    return processedCount;
  },
});

/**
 * Clear old sent notifications (cleanup)
 */
export const clearOldNotifications = internalMutation({
  args: { olderThanDays: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);
    
    const oldNotifications = await ctx.db
      .query("chatMessageQueue")
      .filter((q: any) => 
        q.and(
          q.neq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), cutoffTime)
        )
      )
      .take(500);
    
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }
    
    return oldNotifications.length;
  },
});
