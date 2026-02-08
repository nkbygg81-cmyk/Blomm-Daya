import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Legacy tables from earlier templates/versions.
   * Kept fully permissive so old documents never block schema deployments.
   */
  sellers: defineTable(v.any()),
  flowers: defineTable(v.any()),
  orders: defineTable(v.any()),
  importantDates: defineTable(v.any()),
  
  /**
   * Gifts - chocolates, teddy bears, etc.
   */
  gifts: defineTable(v.any())
    .index("by_available", ["available"])
    .index("by_category", ["category"]),

  /**
   * Florists - local flower shops
   */
  florists: defineTable(v.any())
    .index("by_city", ["city"])
    .index("by_country", ["country"])
    .index("by_available", ["available"])
    .index("by_city_and_available", ["city", "available"])
    .index("by_country_and_available", ["country", "available"])
    .index("by_country_and_city_and_available", ["country", "city", "available"])
    .index("by_email", ["email"])
    .index("by_stripeConnectAccountId", ["stripeConnectAccountId"]),

  /**
   * Buyer authentication
   */
  buyers: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  buyerOtps: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  buyerSessions: defineTable({
    buyerId: v.id("buyers"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_buyerId", ["buyerId"]),

  floristOtps: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  floristSessions: defineTable({
    floristId: v.id("florists"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_floristId", ["floristId"]),

  floristApplications: defineTable({
    businessName: v.string(),
    ownerName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    city: v.string(),
    address: v.string(),
    registrationNumber: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  /**
   * Buyer orders (customers placing orders)
   */
  buyerOrders: defineTable({
    buyerDeviceId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    deliveryAddress: v.string(),
    deliveryLat: v.optional(v.number()),
    deliveryLon: v.optional(v.number()),
    floristId: v.optional(v.id("florists")),
    distanceKm: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
    note: v.optional(v.string()),
    status: v.string(),
    items: v.array(
      v.object({
        flowerId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      }),
    ),
    gifts: v.optional(v.array(
      v.object({
        giftId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      }),
    )),
    total: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentMethodType: v.optional(v.string()),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_buyerDeviceId_and_createdAt", ["buyerDeviceId", "createdAt"])
    .index("by_floristId_and_createdAt", ["floristId", "createdAt"])
    .index("by_floristId_and_status_and_createdAt", ["floristId", "status", "createdAt"])
    .index("by_stripeSessionId", ["stripeSessionId"]),

  /**
   * Reminders for important dates
   */
  reminders: defineTable({
    buyerDeviceId: v.string(),
    buyerId: v.optional(v.id("buyers")),
    title: v.string(),
    date: v.string(),
    type: v.string(),
    recipientName: v.optional(v.string()),
    notifyDaysBefore: v.number(),
    enabled: v.boolean(),
    createdAt: v.number(),
    note: v.optional(v.string()),
    // Calendar integration
    calendarEventId: v.optional(v.string()),
    lastNotifiedAt: v.optional(v.number()),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_buyerDeviceId_and_enabled", ["buyerDeviceId", "enabled"])
    .index("by_buyerId", ["buyerId"])
    .index("by_buyerId_and_enabled", ["buyerId", "enabled"])
    .index("by_date", ["date"]),

  /**
   * Buyer profiles - delivery addresses, preferences
   */
  buyerProfiles: defineTable({
    buyerId: v.id("buyers"),
    savedAddresses: v.array(v.object({
      id: v.string(),
      label: v.string(), // "Home", "Work", etc.
      address: v.string(),
      recipientName: v.optional(v.string()),
      recipientPhone: v.optional(v.string()),
      isDefault: v.boolean(),
    })),
    preferences: v.optional(v.object({
      favoriteColors: v.optional(v.array(v.string())),
      favoriteOccasions: v.optional(v.array(v.string())),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_buyerId", ["buyerId"]),

  /**
   * Reviews for flowers/bouquets
   */
  reviews: defineTable(v.any())
    .index("by_flowerId", ["flowerId"]),

  /**
   * Reviews for florists
   */
  floristReviews: defineTable({
    buyerId: v.id("buyers"),
    floristId: v.id("florists"),
    orderId: v.id("buyerOrders"),
    rating: v.number(), // 1-5
    comment: v.optional(v.string()),
    deliveryRating: v.number(), // 1-5
    qualityRating: v.number(), // 1-5
    photoUrls: v.optional(v.array(v.string())), // Photo review URLs
    createdAt: v.number(),
  })
    .index("by_floristId", ["floristId"])
    .index("by_buyerId", ["buyerId"])
    .index("by_orderId", ["orderId"]),

  /**
   * Order status history for tracking
   */
  orderStatusHistory: defineTable({
    orderId: v.id("buyerOrders"),
    status: v.string(),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("florists")),
    timestamp: v.number(),
  }).index("by_orderId", ["orderId"]),

  /**
   * Photos from florists (bouquet before delivery)
   */
  orderPhotos: defineTable({
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    photoUrl: v.string(),
    caption: v.optional(v.string()),
    uploadedAt: v.number(),
  }).index("by_orderId", ["orderId"]),

  /**
   * Support chat messages
   */
  supportMessages: defineTable({
    orderId: v.optional(v.id("buyerOrders")),
    buyerId: v.id("buyers"),
    floristId: v.optional(v.id("florists")),
    senderId: v.string(), // "buyer:ID" or "florist:ID"
    senderType: v.union(v.literal("buyer"), v.literal("florist"), v.literal("support")),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_buyerId", ["buyerId"])
    .index("by_orderId", ["orderId"])
    .index("by_floristId", ["floristId"]),

  /**
   * Florist consultations - live chat before ordering
   */
  consultations: defineTable({
    buyerId: v.id("buyers"),
    buyerName: v.optional(v.string()),
    // For push notifications to buyers we use a stable device id (same as orders).
    buyerDeviceId: v.optional(v.string()),
    floristId: v.id("florists"),
    status: v.union(
      v.literal("pending"),    // Waiting for florist response
      v.literal("active"),     // Florist responded
      v.literal("completed"),  // Consultation ended
      v.literal("abandoned")   // No response
    ),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_buyerId", ["buyerId"])
    .index("by_floristId", ["floristId"])
    .index("by_status", ["status"]),

  /**
   * Consultation messages
   */
  consultationMessages: defineTable({
    consultationId: v.id("consultations"),
    senderId: v.string(), // "buyer:ID" or "florist:ID"
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    flowerId: v.optional(v.string()), // If suggesting a specific flower
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_consultationId", ["consultationId"]),

  /**
   * Push notification tokens
   */
  pushTokens: defineTable({
    userId: v.string(), // buyerId or floristId
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_userType", ["userId", "userType"])
    .index("by_userId_userType_enabled", ["userId", "userType", "enabled"])
    .index("by_token", ["token"]),

  /**
   * Notification preferences
   */
  notificationPreferences: defineTable({
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    orders: v.boolean(),           // Order status updates
    messages: v.boolean(),          // Chat messages
    reminders: v.boolean(),         // Important date reminders
    promotions: v.boolean(),        // Promo and discounts
    consultations: v.boolean(),     // Consultation messages
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_userType", ["userId", "userType"]),

  /**
   * Notification history
   */
  notificationHistory: defineTable({
    userId: v.string(),
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    type: v.string(), // "order", "message", "reminder", "promotion", "consultation"
    read: v.boolean(),
    sentAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_userType", ["userId", "userType"])
    .index("by_read", ["userId", "read"])
    .index("by_userId_userType_read", ["userId", "userType", "read"]),

  /**
   * Favorites/Wishlist
   */
  favorites: defineTable(v.any())
    .index("by_flowerId", ["flowerId"])
    .index("by_buyerId", ["buyerId"]),

  portfolioPhotos: defineTable({
    floristId: v.id("florists"),
    // Legacy: external URL. New: imageStorageId in Convex file storage.
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_florist", ["floristId"])
    .index("by_createdAt", ["createdAt"]),

  /**
   * Product categories for flowers and gifts
   */
  categories: defineTable({
    name: v.string(),
    nameUk: v.string(), // Ukrainian name
    nameSv: v.optional(v.string()), // Swedish name
    type: v.union(v.literal("flower"), v.literal("gift"), v.literal("occasion")),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_type", ["type"])
    .index("by_active", ["active"])
    .index("by_type_and_active", ["type", "active"]),

  /**
   * User complaints/support tickets
   */
  complaints: defineTable({
    type: v.union(
      v.literal("order"),
      v.literal("florist"),
      v.literal("technical"),
      v.literal("payment"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    // Reporter
    buyerId: v.optional(v.id("buyers")),
    floristId: v.optional(v.id("florists")),
    reporterType: v.union(v.literal("buyer"), v.literal("florist")),
    reporterEmail: v.string(),
    // Related entities
    orderId: v.optional(v.id("buyerOrders")),
    relatedFloristId: v.optional(v.id("florists")),
    // Content
    subject: v.string(),
    description: v.string(),
    // Resolution
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_buyerId", ["buyerId"])
    .index("by_floristId", ["floristId"])
    .index("by_priority", ["priority"]),

  /**
   * Complaint messages (admin <-> user chat)
   */
  complaintMessages: defineTable({
    complaintId: v.id("complaints"),
    senderId: v.string(),
    senderType: v.union(v.literal("buyer"), v.literal("florist"), v.literal("admin")),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_complaintId", ["complaintId"]),

  /**
   * Platform settings (commission, limits, etc.)
   */
  platformSettings: defineTable({
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_key", ["key"]),

  /**
   * System messages / broadcast notifications
   */
  systemMessages: defineTable({
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("promotion"),
      v.literal("maintenance"),
      v.literal("update")
    ),
    targetAudience: v.union(
      v.literal("all"),
      v.literal("buyers"),
      v.literal("florists")
    ),
    // Optional filters
    targetCountry: v.optional(v.string()),
    targetCity: v.optional(v.string()),
    // Scheduling
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    // Status
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent")),
    // Stats
    recipientCount: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_targetAudience", ["targetAudience"]),

  /**
   * Promo codes for discounts
   */
  promoCodes: defineTable({
    code: v.string(),
    discountType: v.union(v.literal("fixed"), v.literal("percent")),
    discountValue: v.number(),
    minOrderAmount: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  /**
   * Flower subscriptions - recurring deliveries
   */
  subscriptions: defineTable({
    buyerId: v.id("buyers"),
    buyerDeviceId: v.string(),
    plan: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
    flowerPreferences: v.optional(v.string()), // e.g. "roses, tulips, bright colors"
    deliveryAddress: v.string(),
    recipientName: v.string(),
    recipientPhone: v.string(),
    budget: v.number(), // per delivery
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("cancelled")),
    nextDeliveryDate: v.string(), // ISO date
    floristId: v.optional(v.id("florists")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyerId", ["buyerId"])
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_status", ["status"]),

  /**
   * Florist stories - Instagram-like updates
   */
  floristStories: defineTable({
    floristId: v.id("florists"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(), // 24h after creation
  })
    .index("by_floristId", ["floristId"])
    .index("by_expiresAt", ["expiresAt"]),

  /**
   * Loyalty points balance
   */
  loyaltyPoints: defineTable({
    buyerId: v.id("buyers"),
    points: v.number(),
    totalEarned: v.number(),
    totalSpent: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyerId", ["buyerId"]),

  /**
   * Loyalty points transactions history
   */
  loyaltyTransactions: defineTable({
    buyerId: v.id("buyers"),
    points: v.number(), // positive = earned, negative = spent
    type: v.union(v.literal("earned"), v.literal("spent"), v.literal("bonus")),
    description: v.string(),
    orderId: v.optional(v.id("buyerOrders")),
    createdAt: v.number(),
  })
    .index("by_buyerId", ["buyerId"]),

  /**
   * Flower care tips (cached AI tips per flower type)
   */
  flowerCareTips: defineTable({
    flowerName: v.string(),
    tips: v.array(v.string()),
    wateringSchedule: v.string(),
    sunlight: v.string(),
    lifespan: v.string(),
    createdAt: v.number(),
  })
    .index("by_flowerName", ["flowerName"]),

  /**
   * FAQ entries for customer support
   */
  faq: defineTable({
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    language: v.union(v.literal("en"), v.literal("uk"), v.literal("sv")),
    order: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_language", ["language"])
    .index("by_active", ["active"]),

  /**
   * Delivery zones - areas with specific delivery fees
   */
  deliveryZones: defineTable({
    name: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    radiusKm: v.number(),
    deliveryFee: v.number(),
    minOrderAmount: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_country", ["country"])
    .index("by_active", ["active"]),

  /**
   * Banners / Promotions on the home screen
   */
  banners: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    targetAudience: v.union(v.literal("all"), v.literal("buyers"), v.literal("florists")),
    country: v.optional(v.string()),
    priority: v.number(),
    active: v.boolean(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_active", ["active"])
    .index("by_priority", ["priority"]),

  /**
   * Seasonal events / auto-promotions
   */
  seasonalEvents: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    discountPercent: v.optional(v.number()),
    promoCodeId: v.optional(v.id("promoCodes")),
    bannerId: v.optional(v.id("banners")),
    reminderDaysBefore: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_eventDate", ["eventDate"])
    .index("by_active", ["active"]),

  /**
   * Audit log - tracks admin actions
   */
  auditLogs: defineTable({
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    performedBy: v.string(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"])
    .index("by_entity", ["entity"]),

  /**
   * Referral program
   */
  referrals: defineTable({
    referrerId: v.id("buyers"),
    referredId: v.optional(v.id("buyers")),
    referralCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("expired")),
    bonusAmount: v.number(),
    bonusPaid: v.boolean(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_referrerId", ["referrerId"])
    .index("by_referralCode", ["referralCode"])
    .index("by_status", ["status"]),
});