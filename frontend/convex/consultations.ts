import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Start a new consultation
export const startConsultation = mutation({
  args: {
    buyerId: v.id("buyers"),
    buyerName: v.optional(v.string()),
    buyerDeviceId: v.optional(v.string()),
    floristId: v.id("florists"),
    initialMessage: v.string(),
  },
  returns: v.id("consultations"),
  handler: async (ctx, args) => {
    // Check if there's already an active consultation
    const existing = await ctx.db
      .query("consultations")
      .withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("floristId"), args.floristId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "active")
          )
        )
      )
      .first();

    if (existing) {
      // Send message to existing consultation
      await ctx.db.insert("consultationMessages", {
        consultationId: existing._id,
        senderId: `buyer:${args.buyerId}`,
        senderType: "buyer",
        message: args.initialMessage,
        read: false,
        createdAt: Date.now(),
      });

      await ctx.db.patch(existing._id, {
        lastMessage: args.initialMessage,
        lastMessageAt: Date.now(),
        buyerDeviceId: args.buyerDeviceId ?? (existing as any).buyerDeviceId,
      } as any);

      // Notify florist about the new buyer message.
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: String(existing.floristId),
        userType: "florist",
        title: "Нове повідомлення від покупця",
        body: args.initialMessage.substring(0, 100),
        data: { consultationId: existing._id, type: "consultation" },
        type: "consultations",
      });

      return existing._id;
    }

    // Create new consultation
    const consultationId = await ctx.db.insert("consultations", {
      buyerId: args.buyerId,
      buyerName: args.buyerName,
      buyerDeviceId: args.buyerDeviceId,
      floristId: args.floristId,
      status: "pending",
      lastMessage: args.initialMessage,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    });

    // Add first message
    await ctx.db.insert("consultationMessages", {
      consultationId,
      senderId: `buyer:${args.buyerId}`,
      senderType: "buyer",
      message: args.initialMessage,
      read: false,
      createdAt: Date.now(),
    });

    // Notify florist about the initial buyer message.
    await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
      userId: String(args.floristId),
      userType: "florist",
      title: "Нове повідомлення від покупця",
      body: args.initialMessage.substring(0, 100),
      data: { consultationId, type: "consultation" },
      type: "consultations",
    });

    return consultationId;
  },
});

// Send message in consultation
export const sendMessage = mutation({
  args: {
    consultationId: v.id("consultations"),
    senderId: v.string(),
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    flowerId: v.optional(v.string()),
  },
  returns: v.id("consultationMessages"),
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    // Update consultation status to active if florist responds
    if (args.senderType === "florist" && consultation.status === "pending") {
      await ctx.db.patch(args.consultationId, {
        status: "active",
      });
    }

    // Update last message
    await ctx.db.patch(args.consultationId, {
      lastMessage: args.message,
      lastMessageAt: Date.now(),
    });

    const messageId = await ctx.db.insert("consultationMessages", {
      consultationId: args.consultationId,
      senderId: args.senderId,
      senderType: args.senderType,
      message: args.message,
      imageUrl: args.imageUrl,
      flowerId: args.flowerId,
      read: false,
      createdAt: Date.now(),
    });

    // Send notification to the other party
    if (args.senderType === "florist") {
      // Notify buyer
      const buyerPushUserId =
        (consultation as any).buyerDeviceId ?? String(consultation.buyerId);
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: buyerPushUserId,
        userType: "buyer",
        title: "Нове повідомлення від флориста",
        body: args.message.substring(0, 100),
        data: { consultationId: args.consultationId, type: "consultation" },
        type: "consultations",
      });
    } else {
      // Notify florist
      await ctx.scheduler.runAfter(0, api.notifications.sendPushNotification, {
        userId: String(consultation.floristId),
        userType: "florist",
        title: "Нове повідомлення від покупця",
        body: args.message.substring(0, 100),
        data: { consultationId: args.consultationId, type: "consultation" },
        type: "consultations",
      });
    }

    return messageId;
  },
});

// Get consultation messages
export const getMessages = query({
  args: { consultationId: v.id("consultations") },
  returns: v.array(v.object({
    id: v.id("consultationMessages"),
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
    message: v.string(),
    imageUrl: v.union(v.string(), v.null()),
    flowerId: v.union(v.string(), v.null()),
    flowerName: v.union(v.string(), v.null()),
    read: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("consultationMessages")
      .withIndex("by_consultationId", (q: any) => q.eq("consultationId", args.consultationId))
      .collect();

    const enriched = await Promise.all(
      messages.map(async (msg: any) => {
        let flowerName = null;
        if (msg.flowerId) {
          const flower: any = await ctx.db.get(msg.flowerId as any);
          flowerName = flower?.name ?? null;
        }

        return {
          id: msg._id,
          senderType: msg.senderType,
          message: msg.message,
          imageUrl: msg.imageUrl ?? null,
          flowerId: msg.flowerId ?? null,
          flowerName,
          read: msg.read,
          createdAt: msg.createdAt,
        };
      })
    );

    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// List consultations for buyer
export const listForBuyer = query({
  args: { buyerId: v.id("buyers") },
  returns: v.array(v.object({
    id: v.id("consultations"),
    floristId: v.id("florists"),
    floristName: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    lastMessage: v.union(v.string(), v.null()),
    lastMessageAt: v.number(),
    unreadCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const consultations = await ctx.db
      .query("consultations")
      .withIndex("by_buyerId", (q: any) => q.eq("buyerId", args.buyerId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      consultations.map(async (consultation: any) => {
        const florist = await ctx.db.get(consultation.floristId);

        // Count unread messages from florist
        const messages = await ctx.db
          .query("consultationMessages")
          .withIndex("by_consultationId", (q: any) => q.eq("consultationId", consultation._id))
          .filter((q: any) =>
            q.and(
              q.eq(q.field("senderType"), "florist"),
              q.eq(q.field("read"), false)
            )
          )
          .collect();

        return {
          id: consultation._id,
          floristId: consultation.floristId,
          floristName: florist?.businessName ?? null,
          status: consultation.status,
          lastMessage: consultation.lastMessage ?? null,
          lastMessageAt: consultation.lastMessageAt,
          unreadCount: messages.length,
        };
      })
    );

    return enriched;
  },
});

// List consultations for florist
export const listForFlorist = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.array(v.object({
    id: v.id("consultations"),
    buyerName: v.union(v.string(), v.null()),
    status: v.string(),
    lastMessage: v.union(v.string(), v.null()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const consultations = await ctx.db
      .query("consultations")
      .withIndex("by_floristId", (q: any) => q.eq("floristId", args.floristId))
      .order("desc")
      .collect();

    return consultations.map((c: any) => ({
      id: c._id,
      buyerName: c.buyerName ?? null,
      status: c.status,
      lastMessage: c.lastMessage ?? null,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    }));
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    consultationId: v.id("consultations"),
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get opposite sender type to mark their messages as read
    const oppositeSender = args.senderType === "buyer" ? "florist" : "buyer";

    const messages = await ctx.db
      .query("consultationMessages")
      .withIndex("by_consultationId", (q: any) => q.eq("consultationId", args.consultationId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("senderType"), oppositeSender),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    await Promise.all(
      messages.map((msg: any) => ctx.db.patch(msg._id, { read: true }))
    );
  },
});

// Complete consultation
export const completeConsultation = mutation({
  args: { consultationId: v.id("consultations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consultationId, {
      status: "completed",
    });
  },
});

// Get available florists for consultation
export const getAvailableFlorists = query({
  args: {
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.id("florists"),
      businessName: v.union(v.string(), v.null()),
      city: v.union(v.string(), v.null()),
      rating: v.number(),
      totalOrders: v.number(),
      responseTime: v.union(v.string(), v.null()),
      isOnline: v.boolean(),
      portfolioCount: v.number(),
      portfolioPhotos: v.array(v.string()),
      distance: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const florists = await ctx.db
      .query("florists")
      .withIndex("by_available", (q: any) => q.eq("available", true))
      .collect();

    const enriched = await Promise.all(
      florists.map(async (f: any) => {
        const portfolioPhotos = await ctx.db
          .query("portfolioPhotos")
          .withIndex("by_florist", (q: any) => q.eq("floristId", f._id))
          .collect();

        const portfolioUrls = await Promise.all(
          portfolioPhotos.map(async (p: any) => {
            if (p.imageStorageId) {
              return await ctx.storage.getUrl(p.imageStorageId);
            }
            return p.imageUrl ?? null;
          })
        );

        const businessName = (f.businessName ?? f.name ?? null) as string | null;
        const fallbackCover = `https://api.a0.dev/assets/image?text=${encodeURIComponent(
          `${businessName ?? "Florist"}${f.city ? ` ${String(f.city)}` : ""}`,
        )}&aspect=16:9&seed=21`;
        const photos = portfolioUrls.filter((u) => typeof u === "string") as string[];

        // Calculate distance if user location is provided
        let distance: number | null = null;
        if (args.userLat && args.userLon && f.lat && f.lon) {
          distance = calculateDistanceKm(args.userLat, args.userLon, f.lat, f.lon);
        }

        return {
          id: f._id,
          businessName,
          city: f.city ?? null,
          rating: f.rating ?? 0,
          totalOrders: f.totalOrders ?? 0,
          responseTime: f.responseTime ?? null,
          isOnline: (f.lastActiveAt ?? 0) > Date.now() - 15 * 60 * 1000,
          portfolioCount: portfolioPhotos.length,
          portfolioPhotos: photos.length > 0 ? photos : [fallbackCover],
          distance,
        };
      })
    );

    // Sort by distance if available, otherwise by rating
    enriched.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return b.rating - a.rating;
    });

    return enriched;
  },
});

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}