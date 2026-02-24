import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Legacy tables from earlier templates/versions.
   * Kept fully permissive so old documents never block schema deployments.
   */
  sellers: defineTable(v.any()),
  flowers: defineTable({
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    descriptionSv: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    inStock: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    rating: v.optional(v.number()),
    category: v.optional(v.string()),
    floristId: v.optional(v.id("florists")),
    // Additional fields
    available: v.optional(v.boolean()),
    seeded: v.optional(v.boolean()),
    seededType: v.optional(v.string()),
  })
    .index("by_floristId", ["floristId"]),
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
    // Loyalty program
    loyaltyPoints: v.optional(v.number()),
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
    // Self-pickup
    pickupPointId: v.optional(v.id("pickupPoints")),
    pickupStatus: v.optional(v.string()),
    pickupCode: v.optional(v.string()),
    pickedUpAt: v.optional(v.number()),
    // Stripe transfer
    stripeTransferId: v.optional(v.string()),
    floristPayout: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    payoutStatus: v.optional(v.string()),
    payoutCompletedAt: v.optional(v.number()),
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
    .index("by_flowerId", ["flowerId"])
    .index("by_orderId", ["orderId"]),

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
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // For abandoned cart notifications
    buyerDeviceId: v.optional(v.string()),
    pushToken: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_userType", ["userId", "userType"])
    .index("by_userId_userType_enabled", ["userId", "userType", "enabled"])
    .index("by_token", ["token"])
    .index("by_buyerDeviceId", ["buyerDeviceId"]),

  /**
   * Push notification queue for processing
   */
  pushNotificationQueue: defineTable({
    buyerDeviceId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    scheduledFor: v.number(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_buyerDeviceId", ["buyerDeviceId"]),

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
    descriptionUk: v.optional(v.string()),
    descriptionSv: v.optional(v.string()),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
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

  /**
   * Gift Certificates - Подарункові сертифікати
   */
  giftCertificates: defineTable({
    code: v.string(),                              // Унікальний код сертифіката
    initialAmount: v.number(),                     // Початкова сума
    remainingAmount: v.number(),                   // Залишок
    currency: v.string(),                          // Валюта (kr)
    purchasedBy: v.optional(v.id("buyers")),       // Хто купив
    purchasedByDeviceId: v.optional(v.string()),   // Device ID покупця
    recipientEmail: v.optional(v.string()),        // Email отримувача
    recipientName: v.optional(v.string()),         // Ім'я отримувача
    message: v.optional(v.string()),               // Персональне повідомлення
    status: v.union(
      v.literal("active"),
      v.literal("fully_redeemed"),
      v.literal("expired")
    ),
    expiresAt: v.optional(v.number()),             // Термін дії
    createdAt: v.number(),
    redeemedAt: v.optional(v.number()),            // Коли використано повністю
  })
    .index("by_code", ["code"])
    .index("by_purchasedBy", ["purchasedBy"])
    .index("by_purchasedByDeviceId", ["purchasedByDeviceId"])
    .index("by_status", ["status"]),

  /**
   * Gift Certificate Redemptions - Історія використання сертифікатів
   */
  giftCertificateRedemptions: defineTable({
    certificateId: v.id("giftCertificates"),
    orderId: v.id("buyerOrders"),
    amount: v.number(),                            // Сума використана
    redeemedAt: v.number(),
  })
    .index("by_certificateId", ["certificateId"])
    .index("by_orderId", ["orderId"]),

  /**
   * Wishlist - Список бажань
   */
  wishlist: defineTable({
    buyerDeviceId: v.string(),
    flowerId: v.string(),
    flowerName: v.string(),
    flowerPrice: v.number(),
    flowerImage: v.optional(v.string()),
    floristName: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"]),

  /**
   * Photo Reviews - Фото відгуки
   */
  photoReviews: defineTable({
    orderId: v.id("buyerOrders"),
    buyerDeviceId: v.string(),
    buyerName: v.optional(v.string()),
    floristId: v.id("florists"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    rating: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_floristId", ["floristId"])
    .index("by_status", ["status"])
    .index("by_buyerDeviceId", ["buyerDeviceId"]),

  /**
   * Discount Notifications - Сповіщення про знижки
   */
  discountNotifications: defineTable({
    title: v.string(),
    titleUk: v.string(),
    titleSv: v.optional(v.string()),
    message: v.string(),
    messageUk: v.string(),
    messageSv: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
    promoCode: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    targetCategory: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_endsAt", ["endsAt"]),

  /**
   * AI Greeting Cards - AI листівки
   */
  greetingCards: defineTable({
    orderId: v.optional(v.id("buyerOrders")),
    buyerDeviceId: v.string(),
    occasion: v.string(),
    recipientName: v.string(),
    senderName: v.optional(v.string()),
    generatedText: v.string(),
    customText: v.optional(v.string()),
    language: v.string(),
    createdAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_orderId", ["orderId"]),

  // Abandoned Carts for recovery reminders
  abandonedCarts: defineTable({
    buyerDeviceId: v.string(),
    items: v.array(v.object({
      flowerId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    })),
    total: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    reminderSent: v.boolean(),
    reminderSentAt: v.optional(v.number()),
    converted: v.boolean(),
    convertedAt: v.optional(v.number()),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_converted", ["converted"]),

  // Product Bundles
  productBundles: defineTable({
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    descriptionSv: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    items: v.array(v.object({
      flowerId: v.string(),
      flowerName: v.string(),
      quantity: v.number(),
    })),
    originalPrice: v.number(),
    bundlePrice: v.number(),
    discountPercent: v.number(),
    currency: v.optional(v.string()),
    floristId: v.optional(v.id("florists")),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_floristId", ["floristId"])
    .index("by_active", ["active"]),

  // Delivery Time Slots configuration
  deliveryTimeSlots: defineTable({
    floristId: v.id("florists"),
    id: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    label: v.string(),
    labelUk: v.optional(v.string()),
    labelSv: v.optional(v.string()),
    extraFee: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_floristId", ["floristId"]),

  // Delivery Slot Bookings
  deliverySlotBookings: defineTable({
    orderId: v.id("buyerOrders"),
    floristId: v.optional(v.id("florists")),
    date: v.string(),
    slotId: v.string(),
    extraFee: v.number(),
    createdAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_date", ["date"])
    .index("by_floristId", ["floristId"]),

  // AI Bouquet Requests
  aiBouquetRequests: defineTable({
    buyerDeviceId: v.string(),
    prompt: v.string(),
    style: v.optional(v.string()),
    occasion: v.optional(v.string()),
    budget: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    status: v.string(),
    resultCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"]),

  // Review Moderations
  reviewModerations: defineTable({
    reviewId: v.string(),
    reviewType: v.string(),
    passed: v.boolean(),
    reason: v.optional(v.string()),
    score: v.number(),
    autoModerated: v.boolean(),
    moderatedAt: v.number(),
    manuallyReviewed: v.optional(v.boolean()),
    moderatorNote: v.optional(v.string()),
    manualReviewedAt: v.optional(v.number()),
  })
    .index("by_reviewId", ["reviewId"])
    .index("by_passed", ["passed"]),

  // Courier Locations for live tracking
  courierLocations: defineTable({
    orderId: v.id("buyerOrders"),
    floristId: v.id("florists"),
    lat: v.number(),
    lon: v.number(),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
    estimatedArrival: v.optional(v.number()),
    isActive: v.boolean(),
    courierName: v.optional(v.string()),
    courierPhone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_floristId", ["floristId"]),

  // File References - for uploaded files tracking
  fileReferences: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadedBy", ["uploadedBy"]),

  // Pickup Points for self-pickup
  pickupPoints: defineTable({
    floristId: v.optional(v.id("florists")),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    workingHours: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_floristId", ["floristId"])
    .index("by_city", ["city"]),

  // User Badges/Achievements for gamification
  userBadges: defineTable({
    buyerDeviceId: v.string(),
    badgeId: v.string(),
    earnedAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_badgeId", ["badgeId"]),

  // Customer Gallery (uploaded photos from buyers)
  customerGallery: defineTable({
    buyerDeviceId: v.string(),
    orderId: v.optional(v.id("buyerOrders")),
    floristId: v.optional(v.id("florists")),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    isPublic: v.boolean(),
    approved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_floristId", ["floristId"])
    .index("by_approved", ["approved"]),

  /**
   * Group Orders - Групові замовлення
   * Дозволяє кільком людям збирати спільне замовлення
   */
  groupOrders: defineTable({
    // Унікальний код для приєднання
    inviteCode: v.string(),
    // Ініціатор групового замовлення
    creatorDeviceId: v.string(),
    creatorName: v.string(),
    creatorPhone: v.optional(v.string()),
    // Назва групового замовлення
    title: v.string(),
    description: v.optional(v.string()),
    // Адреса доставки (спільна для всіх)
    deliveryAddress: v.string(),
    deliveryType: v.union(v.literal("delivery"), v.literal("pickup")),
    // Флорист (опціонально)
    floristId: v.optional(v.id("florists")),
    // Дедлайн для приєднання
    deadline: v.number(),
    // Статус групового замовлення
    status: v.union(
      v.literal("collecting"),   // Збір учасників та товарів
      v.literal("locked"),       // Закрито для нових учасників
      v.literal("payment"),      // Очікування оплати
      v.literal("paid"),         // Оплачено
      v.literal("processing"),   // В обробці
      v.literal("delivered"),    // Доставлено
      v.literal("cancelled")     // Скасовано
    ),
    // Тип оплати
    paymentType: v.union(
      v.literal("split"),        // Кожен платить окремо
      v.literal("creator")       // Ініціатор платить за всіх
    ),
    // Загальна сума
    totalAmount: v.number(),
    deliveryFee: v.optional(v.number()),
    // Stripe
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_creatorDeviceId", ["creatorDeviceId"])
    .index("by_status", ["status"])
    .index("by_floristId", ["floristId"]),

  /**
   * Group Order Participants - Учасники групового замовлення
   */
  groupOrderParticipants: defineTable({
    groupOrderId: v.id("groupOrders"),
    deviceId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    // Товари цього учасника
    items: v.array(v.object({
      flowerId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    })),
    // Подарунки
    gifts: v.optional(v.array(v.object({
      giftId: v.string(),
      name: v.string(),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      qty: v.number(),
    }))),
    // Сума цього учасника
    subtotal: v.number(),
    // Статус оплати (для split payment)
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid")
    ),
    stripeSessionId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    // Timestamps
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_groupOrderId", ["groupOrderId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_groupOrderId_deviceId", ["groupOrderId", "deviceId"]),

  /**
   * Holiday Reminders - Нагадування про свята
   * Автоматичні push-сповіщення перед святами
   */
  holidays: defineTable({
    name: v.string(),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    // Дата свята (місяць та день)
    month: v.number(), // 1-12
    day: v.number(),   // 1-31
    // Опис
    description: v.optional(v.string()),
    descriptionUk: v.optional(v.string()),
    // Скільки днів до свята надсилати нагадування
    reminderDaysBefore: v.number(), // default: 1
    // Чи активне
    isActive: v.boolean(),
    // Тип свята
    holidayType: v.union(
      v.literal("national"),     // Національне свято
      v.literal("religious"),    // Релігійне свято
      v.literal("international"),// Міжнародне свято
      v.literal("custom")        // Кастомне
    ),
    // Emoji для сповіщення
    emoji: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_month_day", ["month", "day"])
    .index("by_isActive", ["isActive"]),

  /**
   * Holiday Reminder Subscriptions - Підписки на нагадування
   */
  holidayReminderSubscriptions: defineTable({
    buyerDeviceId: v.string(),
    // Які типи свят отримувати
    enabledTypes: v.array(v.string()), // ["national", "religious", etc.]
    // Чи увімкнено загалом
    isEnabled: v.boolean(),
    // Push token
    pushToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyerDeviceId", ["buyerDeviceId"])
    .index("by_isEnabled", ["isEnabled"]),

  /**
   * Sent Holiday Reminders - Історія надісланих нагадувань
   */
  sentHolidayReminders: defineTable({
    buyerDeviceId: v.string(),
    holidayId: v.id("holidays"),
    year: v.number(),
    sentAt: v.number(),
  })
    .index("by_buyerDeviceId_holidayId_year", ["buyerDeviceId", "holidayId", "year"]),

  /**
   * Chat Notifications Settings - Налаштування сповіщень чату
   */
  chatNotificationSettings: defineTable({
    // Може бути buyer або florist
    userType: v.union(v.literal("buyer"), v.literal("florist")),
    userId: v.string(), // deviceId для buyer, floristId для florist
    // Налаштування
    enablePush: v.boolean(),
    enableSound: v.boolean(),
    enableVibration: v.boolean(),
    // Quiet hours (не турбувати)
    quietHoursEnabled: v.boolean(),
    quietHoursStart: v.optional(v.number()), // години 0-23
    quietHoursEnd: v.optional(v.number()),   // години 0-23
    // Push token
    pushToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userType_userId", ["userType", "userId"]),

  /**
   * Chat Messages Queue - Черга повідомлень для push
   */
  chatMessageQueue: defineTable({
    consultationId: v.id("consultations"),
    messageId: v.string(),
    senderType: v.union(v.literal("buyer"), v.literal("florist")),
    senderId: v.string(),
    recipientType: v.union(v.literal("buyer"), v.literal("florist")),
    recipientId: v.string(),
    messagePreview: v.string(), // Перші 100 символів
    // Статус
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_recipientType_recipientId", ["recipientType", "recipientId"]),
});