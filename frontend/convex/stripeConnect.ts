"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env?: Record<string, string | undefined> };

// 15% комісія платформи (за замовчуванням, якщо не вказано інше для флориста)
const DEFAULT_PLATFORM_FEE_PERCENT = 0.15;

/**
* Create Stripe Connect onboarding link for florist
*/
export const createConnectAccountLink = action({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    success: v.boolean(),
    url: v.optional(v.string()),
    accountId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    message: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const stripeKey = process.env?.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return {
        success: false,
        errorCode: "stripe_not_configured",
        message: "Stripe не налаштовано (STRIPE_SECRET_KEY відсутній у Convex env).",
      };
    }

    const STRIPE_CONNECT_OVERVIEW_URL =
      "https://dashboard.stripe.com/connect/accounts/overview";

    const parseStripeMessage = (raw: string): string => {
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        const m = parsed?.error?.message;
        if (typeof m === "string" && m.length) message = m;
      } catch {
        // keep raw
      }
      return message;
    };

    const isPlatformProfileIncomplete = (message: string) =>
      message.includes("complete your platform profile") &&
      message.toLowerCase().includes("connect");

    // Get florist
    const florist = await ctx.runQuery(internal.stripeConnectMutations.getFloristForStripe, {
      floristId: args.floristId,
    });

    if (!florist) {
      return {
        success: false,
        errorCode: "florist_not_found",
        message: "Флорист не знайдено.",
      };
    }

    const floristEmail = typeof florist.email === "string" ? florist.email.trim() : "";
    if (!floristEmail || !floristEmail.includes("@")) {
      return {
        success: false,
        errorCode: "florist_email_missing",
        message:
          "Stripe: у профілі флориста не заповнено коректний email. Додайте email флористу в базі/адмін-панелі та спробуйте ще раз.",
      };
    }

    let accountId = florist.stripeConnectAccountId;

    // Create account if doesn't exist
    if (!accountId) {
      const accountParams = new (globalThis as any).URLSearchParams({
        type: "express",
        email: floristEmail,
        "business_type": "company",
        "company[name]": florist.businessName || florist.name,
        "capabilities[transfers][requested]": "true",
        "metadata[floristId]": args.floristId,
      });

      const accountResponse = await (globalThis as any).fetch(
        "https://api.stripe.com/v1/accounts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: accountParams.toString(),
        }
      );

      if (!accountResponse.ok) {
        const raw = await accountResponse.text();
        const message = parseStripeMessage(raw);
        if (isPlatformProfileIncomplete(message)) {
          return {
            success: false,
            errorCode: "stripe_platform_profile_incomplete",
            message:
              "Stripe: потрібно завершити профіль платформи для використання Connect. Відкрийте Stripe Dashboard → Connect → Accounts → Overview та заповніть анкету.",
            dashboardUrl: STRIPE_CONNECT_OVERVIEW_URL,
          };
        }
        return {
          success: false,
          errorCode: "stripe_error",
          message: `Stripe: ${message}`,
        };
      }

      const account = await accountResponse.json();
      accountId = account.id;

      // Save account ID
      await ctx.runMutation(internal.stripeConnectMutations.setStripeConnectAccount, {
        floristId: args.floristId,
        accountId,
        status: "pending",
      });
    }

    const publicAppUrlRaw = process.env?.PUBLIC_APP_URL;
    const publicAppUrl = (typeof publicAppUrlRaw === "string" && publicAppUrlRaw.length
      ? publicAppUrlRaw
      : "https://little-coyote-905.convex.cloud"
    ).replace(/\/$/, "");

    // Create account link for onboarding
    const linkParams = new (globalThis as any).URLSearchParams({
      account: accountId,
      refresh_url: `${publicAppUrl}/stripe/connect/refresh`,
      return_url: `${publicAppUrl}/stripe/connect/success`,
      type: "account_onboarding",
    });

    const linkResponse = await (globalThis as any).fetch(
      "https://api.stripe.com/v1/account_links",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: linkParams.toString(),
      }
    );

    if (!linkResponse.ok) {
      const raw = await linkResponse.text();
      const message = parseStripeMessage(raw);
      if (isPlatformProfileIncomplete(message)) {
        return {
          success: false,
          errorCode: "stripe_platform_profile_incomplete",
          message:
            "Stripe: потрібно завершити профіль платформи для використання Connect. Відкрийте Stripe Dashboard → Connect → Accounts → Overview та заповніть анкету.",
          dashboardUrl: STRIPE_CONNECT_OVERVIEW_URL,
        };
      }
      return {
        success: false,
        errorCode: "stripe_error",
        message: `Stripe: ${message}`,
      };
    }

    const accountLink = await linkResponse.json();

    return {
      success: true,
      url: accountLink.url,
      accountId,
    };
  },
});

/**
* Get Stripe Connect account status
*/
export const getConnectAccountStatus = action({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    connected: v.boolean(),
    detailsSubmitted: v.boolean(),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const stripeKey = process.env?.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY не налаштовано");
    }

    const florist = await ctx.runQuery(internal.stripeConnectMutations.getFloristForStripe, {
      floristId: args.floristId,
    });

    if (!florist?.stripeConnectAccountId) {
      return {
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    const accountResponse = await (globalThis as any).fetch(
      `https://api.stripe.com/v1/accounts/${florist.stripeConnectAccountId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
      }
    );

    if (!accountResponse.ok) {
      const raw = await accountResponse.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        const m = parsed?.error?.message;
        if (typeof m === "string" && m.length) message = m;
      } catch {
        // keep raw
      }
      throw new Error(`Stripe: ${message}`);
    }

    const account = await accountResponse.json();

    return {
      connected: true,
      detailsSubmitted: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
    };
  },
});

/**
* Transfer payment to florist (called after order completion)
*/
export const transferToFlorist = action({
  args: {
    orderId: v.id("buyerOrders"),
    amount: v.number(), // Total order amount in cents
    floristId: v.id("florists"),
  },
  returns: v.object({
    success: v.boolean(),
    transferId: v.string(),
    floristAmount: v.number(),
    platformFee: v.number(),
  }),
  handler: async (ctx, args) => {
    const stripeKey = process.env?.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY не налаштовано");
    }

    const florist = await ctx.runQuery(internal.stripeConnectMutations.getFloristForStripe, {
      floristId: args.floristId,
    });

    if (!florist?.stripeConnectAccountId) {
      throw new Error("Флорист не має підключеного Stripe акаунту");
    }

    if (florist.stripePayoutsEnabled === false) {
      throw new Error("Виплати для цього флориста ще не активовані");
    }

    // Use florist-specific platform fee or default
    const platformFeePercent = florist.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;

    // Calculate fees
    const platformFee = Math.round(args.amount * platformFeePercent);
    const floristAmount = args.amount - platformFee;

    // Create transfer
    const transferParams = new (globalThis as any).URLSearchParams({
      amount: floristAmount.toString(),
      currency: "sek",
      destination: florist.stripeConnectAccountId,
      "metadata[orderId]": args.orderId,
      "metadata[floristId]": args.floristId,
      "metadata[platformFee]": platformFee.toString(),
    });

    const transferResponse = await (globalThis as any).fetch(
      "https://api.stripe.com/v1/transfers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: transferParams.toString(),
      }
    );

    if (!transferResponse.ok) {
      const raw = await transferResponse.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        const m = parsed?.error?.message;
        if (typeof m === "string" && m.length) message = m;
      } catch {
        // keep raw
      }
      throw new Error(`Stripe transfer error: ${message}`);
    }

    const transfer = await transferResponse.json();

    // Update order with transfer info
    await ctx.runMutation(internal.stripeConnectMutations.updateOrderPayoutInfo, {
      orderId: args.orderId,
      stripeTransferId: transfer.id,
      floristPayout: floristAmount,
      platformFee,
    });

    return {
      success: true,
      transferId: transfer.id,
      floristAmount,
      platformFee,
    };
  },
});