/// <reference lib="dom" />

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

declare const process: { env?: Record<string, string | undefined> };

export const createCheckoutSession = action({
  args: {
    items: v.array(
      v.object({
        flowerId: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        qty: v.number(),
      }),
    ),
    gifts: v.optional(
      v.array(
        v.object({
          giftId: v.string(),
          name: v.string(),
          price: v.number(),
          imageUrl: v.optional(v.string()),
          qty: v.number(),
        }),
      ),
    ),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    deliveryType: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    deliveryAddress: v.optional(v.string()),
    note: v.optional(v.string()),
    buyerDeviceId: v.string(),
    floristId: v.optional(v.string()),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    sessionId: v.string(),
    paymentMethodTypes: v.optional(v.array(v.string())),
    klarnaFallbackReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env?.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured in Convex");
    }

    // Derive the Convex site URL for Stripe redirects (HTTPS required)
    const convexUrl = process.env?.CONVEX_CLOUD_URL || "https://little-coyote-905.convex.cloud";
    const siteUrl = convexUrl.replace(".cloud", ".site");

    const gifts = args.gifts ?? [];

    // Helper: trim items for Stripe metadata (max 500 chars per value)
    const trimForMetadata = (items: Array<{ name: string; price: number; qty: number; [k: string]: any }>) => {
      return items.map((i) => ({
        name: i.name.length > 60 ? i.name.slice(0, 57) + "..." : i.name,
        price: i.price,
        qty: i.qty,
      }));
    };

    const itemsTotal = args.items.reduce(
      (sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty,
      0,
    );
    const giftsTotal = gifts.reduce(
      (sum: number, gift: { price: number; qty: number }) => sum + gift.price * gift.qty,
      0,
    );
    const discount = args.promoDiscount && args.promoDiscount > 0 ? args.promoDiscount : 0;
    const deliveryFee = args.deliveryFee && args.deliveryFee > 0 ? args.deliveryFee : 0;
    const total = Math.max(0, itemsTotal + giftsTotal - discount + deliveryFee);

    const createStripeSession = async (params: URLSearchParams) => {
      const response = await (globalThis as any).fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe API error: ${error}`);
      }

      return await response.json();
    };

    const baseParams = new (globalThis as any).URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": "sek",
      "line_items[0][price_data][product_data][name]":
        "Замовлення квітів",
      "line_items[0][price_data][unit_amount]": Math.round(total * 100).toString(),
      "line_items[0][quantity]": "1",
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      billing_address_collection: "required",
      locale: "sv",
      "shipping_address_collection[allowed_countries][0]": "SE",
      "metadata[buyerDeviceId]": args.buyerDeviceId,
      "metadata[customerName]": args.customerName,
      "metadata[customerPhone]": args.customerPhone,
      "metadata[deliveryType]": args.deliveryType || "delivery",
      "metadata[deliveryAddress]": (args.deliveryAddress || "").slice(0, 500),
      "metadata[note]": (args.note || "").slice(0, 500),
      "metadata[items]": JSON.stringify(trimForMetadata(args.items)),
      "metadata[gifts]": JSON.stringify(trimForMetadata(gifts)),
    });

    // Only pass real email to Stripe (fake emails break Klarna/Swish)
    if (args.customerEmail && args.customerEmail.trim() && !args.customerEmail.includes("@daya.local")) {
      baseParams.set("customer_email", args.customerEmail.trim());
    }

    if (args.floristId) {
      baseParams.set("metadata[floristId]", args.floristId);
    }

    if (args.promoCode) {
      baseParams.set("metadata[promoCode]", args.promoCode);
      baseParams.set("metadata[promoDiscount]", String(discount));
    }

    if (deliveryFee > 0) {
      baseParams.set("metadata[deliveryFee]", String(deliveryFee));
    }

    // Try Klarna + Card first, fall back to card-only if Klarna is unavailable
    let session: any;
    let paymentMethodTypes = ["klarna", "card"];
    let klarnaFallbackReason: string | undefined;

    try {
      const params = new (globalThis as any).URLSearchParams(baseParams);
      params.append("payment_method_types[0]", "klarna");
      params.append("payment_method_types[1]", "card");
      session = await createStripeSession(params);
    } catch (e: any) {
      // Klarna not available — fall back to card only
      klarnaFallbackReason = e?.message || "Klarna unavailable";
      paymentMethodTypes = ["card"];
      const params = new (globalThis as any).URLSearchParams(baseParams);
      params.append("payment_method_types[0]", "card");
      session = await createStripeSession(params);
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentMethodTypes,
      klarnaFallbackReason,
    };
  },
});