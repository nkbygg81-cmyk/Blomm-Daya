import { v } from "convex/values";
import { action, mutation, query, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ─── Register push token ───────────────────────────────────────────────────────
export const registerPushToken = mutation({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  },
  returns: v.id("pushTokens"),
  handler: async (ctx, args) => {
    // Check if this exact token already exists
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (existing) {
      // Update ownership (user may have re-logged in or switched roles)
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        userType: args.userType,
        platform: args.platform,
        enabled: true,
        updatedAt: Date.now(),
      });
      console.log(`[Push] Updated token for ${args.userType}:${args.userId}`);
      return existing._id;
    }

    const id = await ctx.db.insert("pushTokens", {
      userId: args.userId,
      userType: args.userType,
      token: args.token,
      platform: args.platform,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log(`[Push] Registered new token for ${args.userType}:${args.userId}`);
    return id;
  },
});

// ─── Get user's enabled push tokens ────────────────────────────────────────────
export const getUserTokens = query({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId_userType_enabled", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType).eq("enabled", true)
      )
      .collect();
    return docs.map((d: any) => d.token);
  },
});

// Internal version for cron/internal use
export const getUserTokensInternal = internalQuery({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId_userType_enabled", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType).eq("enabled", true)
      )
      .collect();
    return docs.map((d: any) => d.token);
  },
});

// ─── Send push notification (main action) ──────────────────────────────────────
// Looks up tokens for a user, checks preferences, sends via Expo Push API,
// and properly parses the response body for delivery errors.
export const sendPushNotification = action({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    type: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    sentCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { userId, userType, title, body, data, type }) => {
    try {
      // 1. Check notification preferences
      if (type) {
        const prefs = await ctx.runQuery(api.notifications.getPreferences, { userId, userType });
        const prefMap: Record<string, string> = {
          orders: "orders",
          order_status: "orders",
          messages: "messages",
          reminders: "reminders",
          promotions: "promotions",
          consultations: "consultations",
        };
        const key = prefMap[type];
        if (key && prefs && !(prefs as any)[key]) {
          console.log(`[Push] Type "${type}" disabled for ${userType}:${userId}`);
          return { success: true, sentCount: 0 };
        }
      }

      // 2. Get push tokens
      const tokens = await ctx.runQuery(api.notifications.getUserTokens, { userId, userType });
      if (!tokens || tokens.length === 0) {
        console.log(`[Push] No tokens found for ${userType}:${userId}`);
        return { success: true, sentCount: 0 };
      }

      console.log(`[Push] Sending to ${tokens.length} token(s) for ${userType}:${userId}`);

      // 3. Send to Expo Push API
      let sentCount = 0;
      let lastError: string | undefined;

      // Build messages array for batch send
      const messages = tokens.map((token: string) => ({
        to: token,
        title,
        body,
        data: data ?? {},
        sound: "default" as const,
        badge: 1,
        priority: "high" as const,
        channelId: "default",
      }));

      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(messages),
        });

        const responseText = await response.text();
        console.log(`[Push] Expo API HTTP ${response.status}, body: ${responseText.substring(0, 500)}`);

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
          console.error(`[Push] Expo API error:`, lastError);
        } else {
          // CRITICAL: Parse response body to check per-ticket delivery status
          try {
            const responseData = JSON.parse(responseText);
            const tickets = responseData.data ?? [];

            for (let i = 0; i < tickets.length; i++) {
              const ticket = tickets[i];
              const token = tokens[i];

              if (ticket.status === "ok") {
                sentCount++;
                console.log(`[Push] Ticket OK for token ${token?.substring(0, 25)}...`);
              } else {
                // Push failed for this token
                const errMsg = ticket.message ?? ticket.details?.error ?? "unknown";
                console.error(`[Push] Ticket ERROR for token ${token?.substring(0, 25)}...: ${errMsg}`);
                lastError = errMsg;

                // Disable invalid tokens
                if (
                  ticket.details?.error === "DeviceNotRegistered" ||
                  ticket.details?.error === "InvalidCredentials"
                ) {
                  console.log(`[Push] Disabling invalid token: ${token?.substring(0, 25)}...`);
                  await ctx.runMutation(internal.notifications.disablePushTokenInternal, { token });
                }
              }
            }
          } catch (parseErr) {
            console.error("[Push] Failed to parse Expo response:", parseErr);
            lastError = "Failed to parse Expo API response";
          }
        }
      } catch (fetchErr) {
        console.error("[Push] Fetch error:", fetchErr);
        lastError = String(fetchErr).substring(0, 200);
      }

      // 4. Save to history
      if (sentCount > 0) {
        await ctx.runMutation(api.notifications.saveToHistory, {
          userId,
          userType,
          title,
          body,
          data,
          type: type ?? "general",
        });
      }

      console.log(`[Push] Result: sent=${sentCount}, error=${lastError ?? "none"}`);
      return { success: sentCount > 0, sentCount, error: lastError };
    } catch (err) {
      console.error("[Push] Fatal error:", err);
      return { success: false, sentCount: 0, error: String(err).substring(0, 200) };
    }
  },
});

// ─── Internal push (for cron jobs) ─────────────────────────────────────────────
export const sendPushNotificationInternal = internalAction({
  args: {
    token: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { token, title, body, data }) => {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data: data ?? {},
          sound: "default",
          badge: 1,
          priority: "high",
          channelId: "default",
        }),
      });

      const responseText = await response.text();
      console.log(`[Push Internal] HTTP ${response.status}: ${responseText.substring(0, 300)}`);

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const parsed = JSON.parse(responseText);
      const ticket = parsed.data;

      if (ticket?.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") {
          await ctx.runMutation(internal.notifications.disablePushTokenInternal, { token });
        }
        return { success: false, error: ticket.message ?? "Push failed" };
      }

      return { success: true };
    } catch (err) {
      console.error("[Push Internal] Error:", err);
      return { success: false, error: String(err).substring(0, 200) };
    }
  },
});

// ─── Disable push token (internal) ────────────────────────────────────────────
export const disablePushTokenInternal = internalMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, { enabled: false, updatedAt: Date.now() });
      console.log(`[Push] Disabled token: ${args.token.substring(0, 25)}...`);
    }
  },
});

// Public version for legacy callers
export const disablePushToken = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, { enabled: false, updatedAt: Date.now() });
    }
  },
});

// ─── Notification preferences ──────────────────────────────────────────────────
export const getPreferences = query({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.union(
    v.null(),
    v.object({
      orders: v.boolean(),
      messages: v.boolean(),
      reminders: v.boolean(),
      promotions: v.boolean(),
      consultations: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId_userType", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType)
      )
      .first();

    if (!prefs) {
      return { orders: true, messages: true, reminders: true, promotions: true, consultations: true };
    }

    return {
      orders: prefs.orders,
      messages: prefs.messages,
      reminders: prefs.reminders,
      promotions: prefs.promotions,
      consultations: prefs.consultations,
    };
  },
});

export const getPreferencesInternal = internalQuery({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.union(
    v.null(),
    v.object({
      orders: v.boolean(),
      messages: v.boolean(),
      reminders: v.boolean(),
      promotions: v.boolean(),
      consultations: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId_userType", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType)
      )
      .first();

    if (!prefs) {
      return { orders: true, messages: true, reminders: true, promotions: true, consultations: true };
    }

    return {
      orders: prefs.orders,
      messages: prefs.messages,
      reminders: prefs.reminders,
      promotions: prefs.promotions,
      consultations: prefs.consultations,
    };
  },
});

export const updatePreferences = mutation({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    orders: v.optional(v.boolean()),
    messages: v.optional(v.boolean()),
    reminders: v.optional(v.boolean()),
    promotions: v.optional(v.boolean()),
    consultations: v.optional(v.boolean()),
  },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId_userType", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        orders: args.orders ?? existing.orders,
        messages: args.messages ?? existing.messages,
        reminders: args.reminders ?? existing.reminders,
        promotions: args.promotions ?? existing.promotions,
        consultations: args.consultations ?? existing.consultations,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("notificationPreferences", {
      userId: args.userId,
      userType: args.userType,
      orders: args.orders ?? true,
      messages: args.messages ?? true,
      reminders: args.reminders ?? true,
      promotions: args.promotions ?? true,
      consultations: args.consultations ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── Notification history ──────────────────────────────────────────────────────
export const saveToHistory = mutation({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    type: v.string(),
  },
  returns: v.id("notificationHistory"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationHistory", {
      userId: args.userId,
      userType: args.userType,
      title: args.title,
      body: args.body,
      data: args.data,
      type: args.type,
      read: false,
      sentAt: Date.now(),
    });
  },
});

export const saveToHistoryInternal = internalMutation({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    type: v.string(),
  },
  returns: v.id("notificationHistory"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationHistory", {
      userId: args.userId,
      userType: args.userType,
      title: args.title,
      body: args.body,
      data: args.data,
      type: args.type,
      read: false,
      sentAt: Date.now(),
    });
  },
});

export const getHistory = query({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.id("notificationHistory"),
      title: v.string(),
      body: v.string(),
      data: v.any(),
      type: v.string(),
      read: v.boolean(),
      sentAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("notificationHistory")
      .withIndex("by_userId_userType", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return items.map((n: any) => ({
      id: n._id,
      title: n.title,
      body: n.body,
      data: n.data ?? null,
      type: n.type,
      read: n.read,
      sentAt: n.sentAt,
    }));
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notificationHistory") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const getUnreadCount = query({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notificationHistory")
      .withIndex("by_userId_userType_read", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

// ─── Debug: list all tokens for a user (useful for diagnostics screen) ─────────
export const debugGetTokenInfo = query({
  args: {
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.array(
    v.object({
      token: v.string(),
      platform: v.string(),
      enabled: v.boolean(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId_userType", (q: any) =>
        q.eq("userId", args.userId).eq("userType", args.userType)
      )
      .collect();

    return docs.map((d: any) => ({
      token: d.token,
      platform: d.platform,
      enabled: d.enabled,
      updatedAt: d.updatedAt,
    }));
  },
});