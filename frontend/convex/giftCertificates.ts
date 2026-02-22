import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Генерувати унікальний код сертифіката
function generateCertificateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Без схожих символів (0,O,1,I)
  let code = "GIFT-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Створити/купити подарунковий сертифікат
 */
export const create = mutation({
  args: {
    amount: v.number(),
    purchasedByDeviceId: v.optional(v.string()),
    purchasedBy: v.optional(v.id("buyers")),
    recipientEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: v.object({
    id: v.id("giftCertificates"),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    if (args.amount < 100) {
      throw new Error("Мінімальна сума сертифіката - 100 kr");
    }
    if (args.amount > 10000) {
      throw new Error("Максимальна сума сертифіката - 10000 kr");
    }

    // Генеруємо унікальний код
    let code = generateCertificateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("giftCertificates")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!existing) break;
      code = generateCertificateCode();
      attempts++;
    }

    // Термін дії - 1 рік
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

    const id = await ctx.db.insert("giftCertificates", {
      code,
      initialAmount: args.amount,
      remainingAmount: args.amount,
      currency: "kr",
      purchasedBy: args.purchasedBy,
      purchasedByDeviceId: args.purchasedByDeviceId,
      recipientEmail: args.recipientEmail,
      recipientName: args.recipientName,
      message: args.message,
      status: "active",
      expiresAt,
      createdAt: Date.now(),
    });

    return { id, code };
  },
});

/**
 * Перевірити код сертифіката та отримати деталі
 */
export const checkCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("giftCertificates"),
      code: v.string(),
      initialAmount: v.number(),
      remainingAmount: v.number(),
      currency: v.string(),
      status: v.string(),
      isValid: v.boolean(),
      message: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const certificate = await ctx.db
      .query("giftCertificates")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!certificate) {
      return null;
    }

    // Перевіряємо чи не прострочений
    const isExpired = certificate.expiresAt && certificate.expiresAt < Date.now();
    const isFullyRedeemed = certificate.remainingAmount <= 0;
    const isValid = certificate.status === "active" && !isExpired && !isFullyRedeemed;

    let message: string | null = null;
    if (isExpired) message = "Сертифікат прострочений";
    else if (isFullyRedeemed) message = "Сертифікат повністю використано";
    else if (certificate.status !== "active") message = "Сертифікат недійсний";

    return {
      id: certificate._id,
      code: certificate.code,
      initialAmount: certificate.initialAmount,
      remainingAmount: certificate.remainingAmount,
      currency: certificate.currency,
      status: certificate.status,
      isValid,
      message,
    };
  },
});

/**
 * Використати сертифікат для замовлення
 */
export const redeem = mutation({
  args: {
    code: v.string(),
    orderId: v.id("buyerOrders"),
    amount: v.number(), // Сума до списання
  },
  returns: v.object({
    success: v.boolean(),
    amountUsed: v.number(),
    remainingBalance: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const certificate = await ctx.db
      .query("giftCertificates")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!certificate) {
      return {
        success: false,
        amountUsed: 0,
        remainingBalance: 0,
        message: "Сертифікат не знайдено",
      };
    }

    // Перевіряємо валідність
    const isExpired = certificate.expiresAt && certificate.expiresAt < Date.now();
    if (isExpired) {
      await ctx.db.patch(certificate._id, { status: "expired" });
      return {
        success: false,
        amountUsed: 0,
        remainingBalance: 0,
        message: "Сертифікат прострочений",
      };
    }

    if (certificate.status !== "active") {
      return {
        success: false,
        amountUsed: 0,
        remainingBalance: certificate.remainingAmount,
        message: "Сертифікат недійсний",
      };
    }

    if (certificate.remainingAmount <= 0) {
      return {
        success: false,
        amountUsed: 0,
        remainingBalance: 0,
        message: "Сертифікат повністю використано",
      };
    }

    // Визначаємо суму до списання
    const amountToUse = Math.min(args.amount, certificate.remainingAmount);
    const newRemainingAmount = certificate.remainingAmount - amountToUse;

    // Оновлюємо сертифікат
    await ctx.db.patch(certificate._id, {
      remainingAmount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? "fully_redeemed" : "active",
      redeemedAt: newRemainingAmount <= 0 ? Date.now() : undefined,
    });

    // Записуємо транзакцію
    await ctx.db.insert("giftCertificateRedemptions", {
      certificateId: certificate._id,
      orderId: args.orderId,
      amount: amountToUse,
      redeemedAt: Date.now(),
    });

    return {
      success: true,
      amountUsed: amountToUse,
      remainingBalance: newRemainingAmount,
      message: `Використано ${amountToUse} kr з сертифіката`,
    };
  },
});

/**
 * Отримати сертифікати покупця
 */
export const listMyGiftCertificates = query({
  args: {
    buyerDeviceId: v.optional(v.string()),
    buyerId: v.optional(v.id("buyers")),
  },
  returns: v.array(
    v.object({
      id: v.id("giftCertificates"),
      code: v.string(),
      initialAmount: v.number(),
      remainingAmount: v.number(),
      currency: v.string(),
      status: v.string(),
      recipientName: v.union(v.string(), v.null()),
      createdAt: v.number(),
      expiresAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    let certificates: any[] = [];

    if (args.buyerId) {
      certificates = await ctx.db
        .query("giftCertificates")
        .withIndex("by_purchasedBy", (q) => q.eq("purchasedBy", args.buyerId))
        .collect();
    } else if (args.buyerDeviceId) {
      certificates = await ctx.db
        .query("giftCertificates")
        .withIndex("by_purchasedByDeviceId", (q) => q.eq("purchasedByDeviceId", args.buyerDeviceId))
        .collect();
    }

    return certificates.map((c) => ({
      id: c._id,
      code: c.code,
      initialAmount: c.initialAmount,
      remainingAmount: c.remainingAmount,
      currency: c.currency,
      status: c.status,
      recipientName: c.recipientName ?? null,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt ?? null,
    }));
  },
});

/**
 * Отримати історію використання сертифіката
 */
export const getRedemptionHistory = query({
  args: {
    certificateId: v.id("giftCertificates"),
  },
  returns: v.array(
    v.object({
      orderId: v.id("buyerOrders"),
      amount: v.number(),
      redeemedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const redemptions = await ctx.db
      .query("giftCertificateRedemptions")
      .withIndex("by_certificateId", (q) => q.eq("certificateId", args.certificateId))
      .collect();

    return redemptions.map((r) => ({
      orderId: r.orderId,
      amount: r.amount,
      redeemedAt: r.redeemedAt,
    }));
  },
});

/**
 * Отримати деталі сертифіката за ID
 */
export const getById = query({
  args: {
    id: v.id("giftCertificates"),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("giftCertificates"),
      code: v.string(),
      initialAmount: v.number(),
      remainingAmount: v.number(),
      currency: v.string(),
      status: v.string(),
      recipientEmail: v.union(v.string(), v.null()),
      recipientName: v.union(v.string(), v.null()),
      message: v.union(v.string(), v.null()),
      createdAt: v.number(),
      expiresAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const certificate = await ctx.db.get(args.id);
    if (!certificate) return null;

    return {
      id: certificate._id,
      code: certificate.code,
      initialAmount: certificate.initialAmount,
      remainingAmount: certificate.remainingAmount,
      currency: certificate.currency,
      status: certificate.status,
      recipientEmail: certificate.recipientEmail ?? null,
      recipientName: certificate.recipientName ?? null,
      message: certificate.message ?? null,
      createdAt: certificate.createdAt,
      expiresAt: certificate.expiresAt ?? null,
    };
  },
});
