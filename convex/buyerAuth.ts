import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function humanizeResendError(errorText: string): string {
  if (errorText.includes("You can only send testing emails")) {
    return (
      "Resend працює в TEST режимі: листи надсилаються тільки на email власника акаунту Resend. " +
      "Щоб надсилати коди на інші адреси — верифікуйте домен у resend.com/domains і встановіть OTP_FROM на адресу цього домену. " +
      "Також перевірте, що RESEND_API_KEY належить тому ж Resend-акаунту, де верифіковано домен."
    );
  }
  if (
    errorText.includes("rate_limit") ||
    errorText.includes("Too many requests") ||
    errorText.includes("rate_limit_exceeded")
  ) {
    return "Забагато запитів до сервісу email. Спробуйте ще раз через 1 хвилину.";
  }
  return "Помилка відправки коду. Спробуйте пізніше.";
}

function isResendTestModeRestriction(errorText: string): boolean {
  if (errorText.includes("You can only send testing emails")) return true;
  try {
    const parsed = JSON.parse(errorText);
    const msg = String(parsed?.message ?? "");
    return msg.includes("You can only send testing emails");
  } catch {
    return false;
  }
}

export const createOrReuseOtp = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    code: v.string(),
    shouldSend: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("buyerOtps")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .collect();

    const valid = existing.find(
      (o: any) => typeof o.expiresAt === "number" && o.expiresAt > now
    );

    if (valid) {
      const createdAt =
        typeof (valid as any).createdAt === "number" ? (valid as any).createdAt : 0;
      const msSince = createdAt ? now - createdAt : OTP_RESEND_COOLDOWN_MS + 1;

      if (msSince < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - msSince) / 1000);
        return {
          code: valid.code,
          shouldSend: false,
          message: `Код вже відправлено. Спробуйте ще раз через ${waitSec} сек.`,
        };
      }

      // Re-send same code; refresh expiry + cooldown timestamp.
      await ctx.db.patch(valid._id, {
        expiresAt: now + OTP_TTL_MS,
        createdAt: now,
      } as any);

      return {
        code: valid.code,
        shouldSend: true,
        message: "Код відправлено на пошту",
      };
    }

    // Cleanup old docs for this email
    for (const otp of existing) {
      await ctx.db.delete(otp._id);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await ctx.db.insert("buyerOtps", {
      email,
      code,
      expiresAt: now + OTP_TTL_MS,
      createdAt: now,
    } as any);

    return {
      code,
      shouldSend: true,
      message: "Код відправлено на пошту",
    };
  },
});

export const sendOtpEmail = action({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return { success: false, message: "Невірний email" };
    }

    const otp = await ctx.runMutation(api.buyerAuth.createOrReuseOtp, { email });

    // Cooldown: don't send another email.
    if (!otp.shouldSend) {
      return { success: true, message: otp.message };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const OTP_FROM =
      process.env.OTP_FROM || "Blomm Daya <noreply@daviolsblomdesign.se>";

    // If email provider not configured, log code server-side only.
    if (!RESEND_API_KEY) {
      console.log("[DEV] Buyer OTP for", email, ":", otp.code);
      return { success: true, message: "Код згенеровано (dev mode)" };
    }

    try {
      const response = await (globalThis as any).fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: OTP_FROM,
            to: email,
            subject: "Ваш код входу - Blomm Daya",
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #C084FC;">Blomm Daya</h2>
<p>Ваш код для входу:</p>
<div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
${otp.code}
</div>
<p style="color: #6b7280;">Код дійсний протягом 10 хвилин.</p>
</div>
`,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Resend test-mode restriction: log code server-side for debugging.
        if (isResendTestModeRestriction(errorText)) {
          const fromDomain = (OTP_FROM.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase();
          console.warn("Resend test-mode restriction (buyer):", {
            to: email,
            fromDomain,
          });
          console.log("[DEV] Buyer OTP for", email, ":", otp.code);
          return {
            success: true,
            message: humanizeResendError(errorText),
          };
        }

        console.error("Resend error:", errorText);
        return { success: false, message: humanizeResendError(errorText) };
      }

      return { success: true, message: "Код відправлено на пошту" };
    } catch (error) {
      console.error("Send email error:", error);
      console.log("[DEV] Buyer OTP for", email, ":", otp.code);
      return {
        success: true,
        message: "Код згенеровано (dev fallback)",
      };
    }
  },
});

export const verifyOtp = action({
  args: {
    email: v.string(),
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    token: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const code = args.code.trim();

    return await ctx.runMutation(api.buyerAuth.verifyOtpMutation, {
      email,
      code,
    });
  },
});

export const verifyOtpMutation = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    token: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    const otps = await ctx.db
      .query("buyerOtps")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .collect();

    const validOtp = otps.find(
      (otp: any) =>
        otp.code === args.code &&
        typeof otp.expiresAt === "number" &&
        otp.expiresAt > now
    );

    if (!validOtp) {
      return {
        success: false,
        message: "Невірний або прострочений код",
        token: null,
      };
    }

    await ctx.db.delete(validOtp._id);

    // Find or create buyer
    let buyer = await ctx.db
      .query("buyers")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (!buyer) {
      const buyerId = await ctx.db.insert("buyers", {
        email: args.email,
        createdAt: now,
        lastLoginAt: now,
      });
      buyer = await ctx.db.get(buyerId);
    } else {
      await ctx.db.patch(buyer._id, { lastLoginAt: now });
    }

    if (!buyer) {
      return { success: false, message: "Помилка створення акаунту", token: null };
    }

    const token = `buyer_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    await ctx.db.insert("buyerSessions", {
      buyerId: buyer._id,
      token,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });

    return { success: true, message: "Успішний вхід", token };
  },
});

export const getCurrentBuyer = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("buyers"),
      email: v.string(),
      name: v.union(v.string(), v.null()),
      phone: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("buyerSessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const buyer = await ctx.db.get(session.buyerId);
    if (!buyer) return null;

    return {
      id: buyer._id,
      email: buyer.email,
      name: buyer.name ?? null,
      phone: buyer.phone ?? null,
    };
  },
});