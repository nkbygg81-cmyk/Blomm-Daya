import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
* Validate and apply a promo code.
* Returns discount amount in krona if valid, throws error otherwise.
*/
export const validatePromoCode = query({
  args: { code: v.string() },
  returns: v.object({
    code: v.string(),
    discountType: v.union(v.literal("fixed"), v.literal("percent")),
    discountValue: v.number(),
    minOrderAmount: v.number(),
    maxUses: v.number(),
    currentUses: v.number(),
    isValid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q: any) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!promo) {
      throw new Error("Промокод не знайдено");
    }

    // Check if expired
    if (promo.expiresAt && promo.expiresAt < Date.now()) {
      throw new Error("Промокод закінчився");
    }

    // Check if max uses exceeded
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      throw new Error("Промокод вже використаний максимальну кількість разів");
    }

    return {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount || 0,
      maxUses: promo.maxUses || 999999,
      currentUses: promo.currentUses || 0,
      isValid: true,
    };
  },
});

/**
* Calculate the final price after applying a promo code
*/
export const calculateDiscount = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  returns: v.object({
    code: v.string(),
    subtotal: v.number(),
    discount: v.number(),
    final: v.number(),
  }),
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q: any) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!promo) {
      throw new Error("Промокод не знайдено");
    }

    // Check if expired
    if (promo.expiresAt && promo.expiresAt < Date.now()) {
      throw new Error("Промокод закінчився");
    }

    // Check min order amount
    if (args.subtotal < (promo.minOrderAmount || 0)) {
      throw new Error(`Мінімальна сума замовлення ${promo.minOrderAmount} kr`);
    }

    // Check if max uses exceeded
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      throw new Error("Промокод вже використаний максимальну кількість разів");
    }

    let discount = 0;
    if (promo.discountType === "fixed") {
      discount = Math.min(promo.discountValue, args.subtotal);
    } else {
      discount = Math.round(args.subtotal * (promo.discountValue / 100));
    }

    const final = Math.max(0, args.subtotal - discount);

    return {
      code: promo.code,
      subtotal: args.subtotal,
      discount,
      final,
    };
  },
});