import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env?: Record<string, string | undefined> };

export const submit = mutation({
  args: {
    businessName: v.string(),
    ownerName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    city: v.string(),
    address: v.string(),
    registrationNumber: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();

    // Check if email already exists in applications
    const existingApp = await ctx.db
      .query("floristApplications")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();

    if (existingApp) {
      if (existingApp.status === "pending") {
        // Update the pending application with latest data (user may have fixed fields)
        await ctx.db.patch(existingApp._id, {
          businessName: args.businessName.trim(),
          ownerName: args.ownerName.trim(),
          phone: args.phone.trim(),
          country: args.country.trim().toUpperCase(),
          city: args.city.trim(),
          address: args.address.trim(),
          registrationNumber: args.registrationNumber.trim(),
          description: args.description?.trim(),
          updatedAt: now,
        });

        return {
          success: true,
          message: "Заявка з цим email вже існує і розглядається",
        };
      }
      if (existingApp.status === "approved") {
        return {
          success: false,
          message: "Ця адреса вже зареєстрована. Спробуйте увійти.",
        };
      }

      if (existingApp.status === "rejected") {
        // Allow resubmission: reset to pending with new data
        await ctx.db.patch(existingApp._id, {
          businessName: args.businessName.trim(),
          ownerName: args.ownerName.trim(),
          email,
          phone: args.phone.trim(),
          country: args.country.trim().toUpperCase(),
          city: args.city.trim(),
          address: args.address.trim(),
          registrationNumber: args.registrationNumber.trim(),
          description: args.description?.trim(),
          status: "pending",
          reviewedAt: undefined,
          rejectionReason: undefined,
          updatedAt: now,
        });

        return {
          success: true,
          message: "Заявка з цим email вже існує, але відхилено. Можете подати нову заявку.",
        };
      }
    }

    // Check if florist with this email already exists
    const existingFlorist = await ctx.db
      .query("florists")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();

    if (existingFlorist) {
      return {
        success: false,
        message: "Ця адреса вже зареєстрована. Спробуйте увійти.",
      };
    }

    // Create application
    await ctx.db.insert("floristApplications", {
      businessName: args.businessName.trim(),
      ownerName: args.ownerName.trim(),
      email,
      phone: args.phone.trim(),
      country: args.country.trim().toUpperCase(),
      city: args.city.trim(),
      address: args.address.trim(),
      registrationNumber: args.registrationNumber.trim(),
      description: args.description?.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Заявку подано! Ми зв'яжемось з вами найближчим часом.",
    };
  },
});

export const listPending = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("floristApplications"),
      businessName: v.string(),
      ownerName: v.string(),
      email: v.string(),
      phone: v.string(),
      country: v.string(),
      city: v.string(),
      address: v.string(),
      registrationNumber: v.string(),
      description: v.union(v.string(), v.null()),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const apps = await ctx.db
      .query("floristApplications")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return apps.map((app: any) => ({
      _id: app._id,
      businessName: app.businessName,
      ownerName: app.ownerName,
      email: app.email,
      phone: app.phone,
      country: app.country,
      city: app.city,
      address: app.address,
      registrationNumber: app.registrationNumber,
      description: app.description ?? null,
      status: app.status,
      createdAt: app.createdAt,
    }));
  },
});

export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("floristApplications"),
      businessName: v.string(),
      ownerName: v.string(),
      email: v.string(),
      phone: v.string(),
      country: v.string(),
      city: v.string(),
      address: v.string(),
      registrationNumber: v.string(),
      description: v.union(v.string(), v.null()),
      status: v.string(),
      createdAt: v.number(),
      reviewedAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const apps = await ctx.db
      .query("floristApplications")
      .order("desc")
      .collect();

    return apps.map((app: any) => ({
      _id: app._id,
      businessName: app.businessName,
      ownerName: app.ownerName,
      email: app.email,
      phone: app.phone,
      country: app.country,
      city: app.city,
      address: app.address,
      registrationNumber: app.registrationNumber,
      description: app.description ?? null,
      status: app.status,
      createdAt: app.createdAt,
      reviewedAt: app.reviewedAt ?? null,
    }));
  },
});

export const listFlorists = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("florists").collect();
  },
});

export const approve = mutation({
  args: {
    applicationId: v.id("floristApplications"),
  },
  returns: v.object({
    success: v.boolean(),
    floristId: v.union(v.id("florists"), v.null()),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const app: any = await ctx.db.get(args.applicationId);
    if (!app) {
      return { success: false, floristId: null, message: "Заявку не знайдено" };
    }

    if (app.status === "approved") {
      return {
        success: false,
        floristId: null,
        message: "Цю заявку вже підтверджено",
      };
    }

    if (app.status === "rejected") {
      return {
        success: false,
        floristId: null,
        message: "Цю заявку вже відхилено",
      };
    }

    // Best-effort duplicate check (florists table is v.any())
    const florists = await ctx.db.query("florists").collect();
    const existingFlorist = florists.find(
      (f: any) => f.email?.toLowerCase() === String(app.email).toLowerCase()
    );

    if (existingFlorist) {
      await ctx.db.patch(args.applicationId, {
        status: "approved",
        reviewedAt: Date.now(),
      });

      return {
        success: true,
        floristId: existingFlorist._id,
        message: "Флорист вже існував — заявку позначено як підтверджену",
      };
    }

    // Create florist account
    const floristId = await ctx.db.insert("florists", {
      name: app.businessName,
      email: app.email,
      phone: app.phone,
      country: app.country,
      city: app.city,
      address: app.address,
      registrationNumber: app.registrationNumber,
      available: true,
      rating: 0,
    });

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "approved",
      reviewedAt: Date.now(),
    });

    return { success: true, floristId, message: "Заявку підтверджено" };
  },
});

export const reject = mutation({
  args: {
    applicationId: v.id("floristApplications"),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      return { success: false, message: "Заявку не знайдено" };
    }

    await ctx.db.patch(args.applicationId, {
      status: "rejected",
      reviewedAt: Date.now(),
      rejectionReason: args.reason,
    });

    return { success: true, message: "Заявку відхилено" };
  },
});

export const resetToPending = mutation({
  args: {
    applicationId: v.id("floristApplications"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const app: any = await ctx.db.get(args.applicationId);
    if (!app) {
      return { success: false, message: "Заявку не знайдено" };
    }

    await ctx.db.patch(args.applicationId, {
      status: "pending",
      reviewedAt: undefined,
    });

    return { success: true, message: "Заявку повернено в Pending" };
  },
});

export const deleteTestData = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    deletedApplications: v.number(),
    deletedFlorists: v.number(),
  }),
  handler: async (ctx) => {
    const testEmails = [
      "maria.flowers@example.com",
      "qa.shop@example.com",
      "test.florist@example.com",
    ];

    // Delete test applications
    const apps = await ctx.db.query("floristApplications").collect();
    const testApps = apps.filter((a: any) => testEmails.includes(a.email));
    for (const app of testApps) {
      await ctx.db.delete(app._id);
    }

    // Delete test florists
    const florists = await ctx.db.query("florists").collect();
    const testFlorists = florists.filter((f: any) => testEmails.includes(f.email ?? ""));
    for (const florist of testFlorists) {
      await ctx.db.delete(florist._id);
    }

    return {
      success: true,
      deletedApplications: testApps.length,
      deletedFlorists: testFlorists.length,
    };
  },
});

export const toggleFloristAvailability = mutation({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const florist: any = await ctx.db.get(args.floristId);
    if (florist) {
      await ctx.db.patch(args.floristId, {
        available: !florist.available,
      });
    }
    return { success: true };
  },
});

export const ensureFloristAccountsForApprovedApplications = mutation({
  args: {},
  returns: v.object({
    scanned: v.number(),
    created: v.number(),
    alreadyPresent: v.number(),
  }),
  handler: async (ctx) => {
    const apps = await ctx.db.query("floristApplications").collect();
    const approved = apps.filter((a: any) => a.status === "approved");

    let created = 0;
    let alreadyPresent = 0;

    for (const app of approved) {
      const email = String(app.email ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) continue;

      const existing = await ctx.db
        .query("florists")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();

      if (existing) {
        alreadyPresent++;
        continue;
      }

      await ctx.db.insert("florists", {
        name: app.businessName,
        businessName: app.businessName,
        email,
        phone: app.phone,
        country: app.country,
        city: app.city,
        address: app.address,
        registrationNumber: app.registrationNumber,
        available: true,
        rating: 0,
      } as any);

      created++;
    }

    return { scanned: approved.length, created, alreadyPresent };
  },
});