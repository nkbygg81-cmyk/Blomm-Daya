import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random invite code (6 characters)
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new group order
 */
export const create = mutation({
  args: {
    creatorDeviceId: v.string(),
    creatorName: v.string(),
    creatorPhone: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    deliveryAddress: v.string(),
    deliveryType: v.union(v.literal("delivery"), v.literal("pickup")),
    floristId: v.optional(v.id("florists")),
    deadlineHours: v.number(), // Hours until deadline
    paymentType: v.union(v.literal("split"), v.literal("creator")),
  },
  returns: v.object({
    groupOrderId: v.id("groupOrders"),
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const deadline = now + args.deadlineHours * 60 * 60 * 1000;
    
    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let existing = await ctx.db
      .query("groupOrders")
      .withIndex("by_inviteCode", (q: any) => q.eq("inviteCode", inviteCode))
      .first();
    
    // Regenerate if code already exists
    while (existing) {
      inviteCode = generateInviteCode();
      existing = await ctx.db
        .query("groupOrders")
        .withIndex("by_inviteCode", (q: any) => q.eq("inviteCode", inviteCode))
        .first();
    }
    
    const groupOrderId = await ctx.db.insert("groupOrders", {
      inviteCode,
      creatorDeviceId: args.creatorDeviceId,
      creatorName: args.creatorName,
      creatorPhone: args.creatorPhone,
      title: args.title,
      description: args.description,
      deliveryAddress: args.deliveryAddress,
      deliveryType: args.deliveryType,
      floristId: args.floristId,
      deadline,
      status: "collecting",
      paymentType: args.paymentType,
      totalAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    // Add creator as first participant
    await ctx.db.insert("groupOrderParticipants", {
      groupOrderId,
      deviceId: args.creatorDeviceId,
      name: args.creatorName,
      phone: args.creatorPhone,
      items: [],
      subtotal: 0,
      paymentStatus: "pending",
      joinedAt: now,
      updatedAt: now,
    });
    
    return { groupOrderId, inviteCode };
  },
});

/**
 * Join a group order by invite code
 */
export const join = mutation({
  args: {
    inviteCode: v.string(),
    deviceId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      groupOrderId: v.id("groupOrders"),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db
      .query("groupOrders")
      .withIndex("by_inviteCode", (q: any) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
    
    if (!groupOrder) {
      return { success: false as const, error: "Групове замовлення не знайдено" };
    }
    
    if (groupOrder.status !== "collecting") {
      return { success: false as const, error: "Групове замовлення вже закрите для приєднання" };
    }
    
    if (Date.now() > groupOrder.deadline) {
      return { success: false as const, error: "Час для приєднання вичерпано" };
    }
    
    // Check if already joined
    const existingParticipant = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId_deviceId", (q: any) => 
        q.eq("groupOrderId", groupOrder._id).eq("deviceId", args.deviceId)
      )
      .first();
    
    if (existingParticipant) {
      return { success: true as const, groupOrderId: groupOrder._id };
    }
    
    const now = Date.now();
    
    // Add new participant
    await ctx.db.insert("groupOrderParticipants", {
      groupOrderId: groupOrder._id,
      deviceId: args.deviceId,
      name: args.name,
      phone: args.phone,
      items: [],
      subtotal: 0,
      paymentStatus: "pending",
      joinedAt: now,
      updatedAt: now,
    });
    
    return { success: true as const, groupOrderId: groupOrder._id };
  },
});

/**
 * Get group order by invite code
 */
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db
      .query("groupOrders")
      .withIndex("by_inviteCode", (q: any) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
    
    if (!groupOrder) return null;
    
    // Get participants
    const participants = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId", (q: any) => q.eq("groupOrderId", groupOrder._id))
      .collect();
    
    // Get florist info if present
    let florist = null;
    if (groupOrder.floristId) {
      florist = await ctx.db.get(groupOrder.floristId);
    }
    
    return {
      ...groupOrder,
      participants: participants.map((p: any) => ({
        id: p._id,
        deviceId: p.deviceId,
        name: p.name,
        itemsCount: p.items.length,
        subtotal: p.subtotal,
        paymentStatus: p.paymentStatus,
        joinedAt: p.joinedAt,
      })),
      floristName: florist?.name || null,
      participantsCount: participants.length,
      isExpired: Date.now() > groupOrder.deadline,
      timeLeft: Math.max(0, groupOrder.deadline - Date.now()),
    };
  },
});

/**
 * Get group order by ID
 */
export const getById = query({
  args: { groupOrderId: v.id("groupOrders") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    if (!groupOrder) return null;
    
    // Get participants with full details
    const participants = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId", (q: any) => q.eq("groupOrderId", groupOrder._id))
      .collect();
    
    // Get florist info if present
    let florist = null;
    if (groupOrder.floristId) {
      florist = await ctx.db.get(groupOrder.floristId);
    }
    
    return {
      ...groupOrder,
      participants: participants.map((p: any) => ({
        id: p._id,
        deviceId: p.deviceId,
        name: p.name,
        phone: p.phone,
        items: p.items,
        gifts: p.gifts,
        subtotal: p.subtotal,
        paymentStatus: p.paymentStatus,
        joinedAt: p.joinedAt,
      })),
      floristName: florist?.name || null,
      participantsCount: participants.length,
      isExpired: Date.now() > groupOrder.deadline,
      timeLeft: Math.max(0, groupOrder.deadline - Date.now()),
    };
  },
});

/**
 * Get my group orders (as creator or participant)
 */
export const listForDevice = query({
  args: { deviceId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get group orders where user is creator
    const asCreator = await ctx.db
      .query("groupOrders")
      .withIndex("by_creatorDeviceId", (q: any) => q.eq("creatorDeviceId", args.deviceId))
      .order("desc")
      .take(20);
    
    // Get participations
    const participations = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_deviceId", (q: any) => q.eq("deviceId", args.deviceId))
      .collect();
    
    // Get group orders where user is participant (but not creator)
    const participantOrderIds = participations.map((p: any) => p.groupOrderId);
    const asParticipant: any[] = [];
    
    for (const orderId of participantOrderIds) {
      const order = await ctx.db.get(orderId) as any;
      if (order && order.creatorDeviceId !== args.deviceId) {
        asParticipant.push(order);
      }
    }
    
    // Combine and sort by date
    const allOrders = [...asCreator, ...asParticipant].sort(
      (a: any, b: any) => b.createdAt - a.createdAt
    );
    
    // Add participant counts
    const result = [];
    for (const order of allOrders) {
      const participants = await ctx.db
        .query("groupOrderParticipants")
        .withIndex("by_groupOrderId", (q: any) => q.eq("groupOrderId", order._id))
        .collect();
      
      result.push({
        id: order._id,
        inviteCode: order.inviteCode,
        title: order.title,
        status: order.status,
        totalAmount: order.totalAmount,
        participantsCount: participants.length,
        deadline: order.deadline,
        isCreator: order.creatorDeviceId === args.deviceId,
        isExpired: Date.now() > order.deadline,
        createdAt: order.createdAt,
      });
    }
    
    return result;
  },
});

/**
 * Add items to participant's cart in group order
 */
export const addItems = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
    items: v.array(v.object({
      flowerId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    })),
    gifts: v.optional(v.array(v.object({
      giftId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    }))),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    
    if (!groupOrder) {
      return { success: false as const, error: "Групове замовлення не знайдено" };
    }
    
    if (groupOrder.status !== "collecting") {
      return { success: false as const, error: "Групове замовлення вже закрите" };
    }
    
    // Find participant
    const participant = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId_deviceId", (q: any) => 
        q.eq("groupOrderId", args.groupOrderId).eq("deviceId", args.deviceId)
      )
      .first();
    
    if (!participant) {
      return { success: false as const, error: "Ви не є учасником цього замовлення" };
    }
    
    const now = Date.now();
    const gifts = args.gifts ?? [];
    
    // Calculate subtotal
    const itemsTotal = args.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const giftsTotal = gifts.reduce((sum, gift) => sum + gift.price * gift.qty, 0);
    const subtotal = itemsTotal + giftsTotal;
    
    // Update participant
    await ctx.db.patch(participant._id, {
      items: args.items,
      gifts: gifts.length > 0 ? gifts : undefined,
      subtotal,
      updatedAt: now,
    });
    
    // Recalculate total
    const allParticipants = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId", (q: any) => q.eq("groupOrderId", args.groupOrderId))
      .collect();
    
    const totalAmount = allParticipants.reduce((sum: number, p: any) => {
      if (p._id === participant._id) {
        return sum + subtotal;
      }
      return sum + p.subtotal;
    }, 0);
    
    // Update group order total
    await ctx.db.patch(args.groupOrderId, {
      totalAmount,
      updatedAt: now,
    });
    
    return { success: true as const };
  },
});

/**
 * Lock group order (stop accepting new participants/items)
 */
export const lock = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    
    if (!groupOrder) {
      return { success: false as const, error: "Групове замовлення не знайдено" };
    }
    
    if (groupOrder.creatorDeviceId !== args.deviceId) {
      return { success: false as const, error: "Тільки ініціатор може закрити замовлення" };
    }
    
    if (groupOrder.status !== "collecting") {
      return { success: false as const, error: "Замовлення вже закрите" };
    }
    
    await ctx.db.patch(args.groupOrderId, {
      status: "locked",
      updatedAt: Date.now(),
    });
    
    return { success: true as const };
  },
});

/**
 * Cancel group order
 */
export const cancel = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    
    if (!groupOrder) {
      return { success: false as const, error: "Групове замовлення не знайдено" };
    }
    
    if (groupOrder.creatorDeviceId !== args.deviceId) {
      return { success: false as const, error: "Тільки ініціатор може скасувати замовлення" };
    }
    
    if (groupOrder.status === "paid" || groupOrder.status === "delivered") {
      return { success: false as const, error: "Неможливо скасувати оплачене замовлення" };
    }
    
    await ctx.db.patch(args.groupOrderId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    
    return { success: true as const };
  },
});

/**
 * Leave group order (as participant, not creator)
 */
export const leave = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    
    if (!groupOrder) {
      return { success: false as const, error: "Групове замовлення не знайдено" };
    }
    
    if (groupOrder.creatorDeviceId === args.deviceId) {
      return { success: false as const, error: "Ініціатор не може покинути замовлення. Скасуйте його замість цього." };
    }
    
    if (groupOrder.status !== "collecting") {
      return { success: false as const, error: "Замовлення вже закрите" };
    }
    
    // Find and delete participant
    const participant = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId_deviceId", (q: any) => 
        q.eq("groupOrderId", args.groupOrderId).eq("deviceId", args.deviceId)
      )
      .first();
    
    if (!participant) {
      return { success: false as const, error: "Ви не є учасником цього замовлення" };
    }
    
    await ctx.db.delete(participant._id);
    
    // Recalculate total
    const remainingParticipants = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId", (q: any) => q.eq("groupOrderId", args.groupOrderId))
      .collect();
    
    const totalAmount = remainingParticipants.reduce((sum: number, p: any) => sum + p.subtotal, 0);
    
    await ctx.db.patch(args.groupOrderId, {
      totalAmount,
      updatedAt: Date.now(),
    });
    
    return { success: true as const };
  },
});

/**
 * Get participant's items in a group order
 */
export const getMyItems = query({
  args: {
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("groupOrderParticipants")
      .withIndex("by_groupOrderId_deviceId", (q: any) => 
        q.eq("groupOrderId", args.groupOrderId).eq("deviceId", args.deviceId)
      )
      .first();
    
    if (!participant) return null;
    
    return {
      items: participant.items,
      gifts: participant.gifts,
      subtotal: participant.subtotal,
      paymentStatus: participant.paymentStatus,
    };
  },
});

/**
 * Update group order status (for processing flow)
 */
export const updateStatus = mutation({
  args: {
    groupOrderId: v.id("groupOrders"),
    status: v.union(
      v.literal("collecting"),
      v.literal("locked"),
      v.literal("payment"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const groupOrder = await ctx.db.get(args.groupOrderId);
    if (!groupOrder) return false;
    
    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };
    
    if (args.status === "paid") {
      updates.paidAt = now;
    } else if (args.status === "delivered") {
      updates.deliveredAt = now;
    }
    
    await ctx.db.patch(args.groupOrderId, updates);
    return true;
  },
});
