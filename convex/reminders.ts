import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const reminderDocReturn = v.object({
  _id: v.id("reminders"),
  _creationTime: v.number(),
  buyerDeviceId: v.string(),
  title: v.string(),
  date: v.string(),
  type: v.string(),
  recipientName: v.optional(v.string()),
  notifyDaysBefore: v.number(),
  enabled: v.boolean(),
  createdAt: v.number(),
  note: v.optional(v.string()),
});

const reminderUiReturn = v.object({
  _id: v.id("reminders"),
  date: v.string(),
  type: v.string(),
  enabled: v.boolean(),
  personName: v.string(),
  daysBefore: v.number(),
  note: v.optional(v.string()),
});

type ReminderDoc = Doc<"reminders">;

type ReminderDocOut = {
  _id: ReminderDoc["_id"];
  _creationTime: number;
  buyerDeviceId: string;
  title: string;
  date: string;
  type: string;
  recipientName?: string;
  notifyDaysBefore: number;
  enabled: boolean;
  createdAt: number;
  note?: string;
};

function toReminderDocOut(r: ReminderDoc): ReminderDocOut {
  return {
    _id: r._id,
    _creationTime: r._creationTime,
    buyerDeviceId: r.buyerDeviceId,
    title: r.title,
    date: r.date,
    type: r.type,
    recipientName: r.recipientName,
    notifyDaysBefore: r.notifyDaysBefore,
    enabled: r.enabled,
    createdAt: r.createdAt,
    note: r.note,
  };
}

function sortByDateAsc(a: { date: string }, b: { date: string }) {
  const parseMonthDayKey = (raw: string): number => {
    const s = (raw ?? "").trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const m = Number(iso[2]);
      const d = Number(iso[3]);
      return m * 100 + d;
    }
    if (/^\d{8}$/.test(s)) {
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      return m * 100 + d;
    }
    return 9999;
  };

  return parseMonthDayKey(a.date) - parseMonthDayKey(b.date);
}

// Backwards-compatible API expected by the UI (screens/RemindersScreen.tsx)
export const listReminders = query({
  args: { deviceId: v.string() },
  returns: v.array(reminderUiReturn),
  handler: async (ctx, { deviceId }) => {
    const reminders: ReminderDoc[] = await ctx.db
      .query("reminders")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", deviceId))
      .collect();

    reminders.sort(sortByDateAsc);

    return reminders.map((r: ReminderDoc) => ({
      _id: r._id,
      date: r.date,
      type: r.type,
      enabled: r.enabled,
      personName: (r.recipientName ?? r.title ?? "").toString(),
      daysBefore: r.notifyDaysBefore,
      note: r.note,
    }));
  },
});

// Same UI shape as listReminders, but supports multiple device ids (migration / restore).
export const listRemindersMultiDevice = query({
  args: { deviceIds: v.array(v.string()) },
  returns: v.array(reminderUiReturn),
  handler: async (ctx, { deviceIds }) => {
    const uniqueDeviceIds: Array<string> = Array.from(
      new Set(deviceIds.map((id: string) => id.trim()).filter(Boolean))
    );

    if (uniqueDeviceIds.length === 0) return [];

    const byId: Map<ReminderDoc["_id"], ReminderDoc> = new Map();

    for (const id of uniqueDeviceIds) {
      const rows: ReminderDoc[] = await ctx.db
        .query("reminders")
        .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", id))
        .collect();

      for (const r of rows) {
        byId.set(r._id, r);
      }
    }

    const merged: ReminderDoc[] = Array.from(byId.values());
    merged.sort(sortByDateAsc);

    return merged.map((r: ReminderDoc) => ({
      _id: r._id,
      date: r.date,
      type: r.type,
      enabled: r.enabled,
      personName: (r.recipientName ?? r.title ?? "").toString(),
      daysBefore: r.notifyDaysBefore,
      note: r.note,
    }));
  },
});

// Preferred UI API: merge reminders for logged-in buyer (account) + current/legacy device ids.
export const listRemindersForBuyer = query({
  args: {
    buyerId: v.optional(v.union(v.id("buyers"), v.null())),
    deviceIds: v.array(v.string()),
  },
  returns: v.array(reminderUiReturn),
  handler: async (ctx, { buyerId, deviceIds }) => {
    const uniqueDeviceIds: Array<string> = Array.from(
      new Set(deviceIds.map((id: string) => id.trim()).filter(Boolean))
    );

    const byId: Map<ReminderDoc["_id"], ReminderDoc> = new Map();

    if (buyerId) {
      const buyerRows: ReminderDoc[] = await ctx.db
        .query("reminders")
        .withIndex("by_buyerId", (q: any) => q.eq("buyerId", buyerId))
        .collect();
      for (const r of buyerRows) {
        byId.set(r._id, r);
      }
    }

    for (const id of uniqueDeviceIds) {
      const rows: ReminderDoc[] = await ctx.db
        .query("reminders")
        .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", id))
        .collect();
      for (const r of rows) {
        byId.set(r._id, r);
      }
    }

    const merged: ReminderDoc[] = Array.from(byId.values());
    merged.sort(sortByDateAsc);

    return merged.map((r: ReminderDoc) => ({
      _id: r._id,
      date: r.date,
      type: r.type,
      enabled: r.enabled,
      personName: (r.recipientName ?? r.title ?? "").toString(),
      daysBefore: r.notifyDaysBefore,
      note: r.note,
    }));
  },
});

export const claimRemindersToBuyer = mutation({
  args: {
    buyerId: v.id("buyers"),
    deviceIds: v.array(v.string()),
  },
  returns: v.object({ claimed: v.number() }),
  handler: async (ctx, { buyerId, deviceIds }) => {
    const uniqueDeviceIds: Array<string> = Array.from(
      new Set(deviceIds.map((id: string) => id.trim()).filter(Boolean))
    );

    let claimed = 0;

    for (const id of uniqueDeviceIds) {
      const rows: ReminderDoc[] = await ctx.db
        .query("reminders")
        .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", id))
        .collect();

      for (const r of rows) {
        if ((r as any).buyerId) continue;
        await ctx.db.patch(r._id, { buyerId } as any);
        claimed += 1;
      }
    }

    return { claimed };
  },
});

export const addReminder = mutation({
  args: {
    deviceId: v.string(),
    buyerId: v.optional(v.id("buyers")),
    personName: v.string(),
    date: v.string(),
    type: v.string(),
    daysBefore: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.id("reminders"),
  handler: async (ctx, args) => {
    const reminderId = await ctx.db.insert("reminders", {
      buyerDeviceId: args.deviceId,
      buyerId: args.buyerId,
      title: args.personName,
      date: args.date,
      type: args.type,
      recipientName: args.personName,
      notifyDaysBefore: args.daysBefore,
      enabled: true,
      createdAt: Date.now(),
      note: args.note,
    } as any);
    return reminderId;
  },
});

export const deleteReminder = mutation({
  args: { reminderId: v.id("reminders") },
  returns: v.null(),
  handler: async (ctx, { reminderId }) => {
    await ctx.db.delete(reminderId);
    return null;
  },
});

export const toggleReminder = mutation({
  args: { reminderId: v.id("reminders") },
  returns: v.null(),
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder) return null;
    await ctx.db.patch(reminderId, { enabled: !reminder.enabled });
    return null;
  },
});

// Canonical API (used elsewhere / by future screens)
export const list = query({
  args: {
    buyerDeviceId: v.string(),
  },
  returns: v.array(reminderDocReturn),
  handler: async (ctx, { buyerDeviceId }) => {
    const reminders: ReminderDoc[] = await ctx.db
      .query("reminders")
      .withIndex("by_buyerDeviceId", (q: any) => q.eq("buyerDeviceId", buyerDeviceId))
      .collect();

    reminders.sort(sortByDateAsc);

    return reminders.map((r: ReminderDoc) => toReminderDocOut(r));
  },
});

export const create = mutation({
  args: {
    buyerDeviceId: v.string(),
    title: v.string(),
    date: v.string(),
    type: v.string(),
    recipientName: v.optional(v.string()),
    notifyDaysBefore: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.id("reminders"),
  handler: async (ctx, args) => {
    const reminderId = await ctx.db.insert("reminders", {
      ...args,
      enabled: true,
      createdAt: Date.now(),
    });
    return reminderId;
  },
});

export const update = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    type: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    notifyDaysBefore: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    note: v.optional(v.string()),
  },
  returns: v.id("reminders"),
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("reminders"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  },
});

export const getUpcoming = query({
  args: {
    buyerDeviceId: v.string(),
    daysAhead: v.number(),
  },
  returns: v.array(reminderDocReturn),
  handler: async (ctx, { buyerDeviceId, daysAhead }) => {
    const reminders: ReminderDoc[] = await ctx.db
      .query("reminders")
      .withIndex("by_buyerDeviceId_and_enabled", (q: any) =>
        q.eq("buyerDeviceId", buyerDeviceId).eq("enabled", true)
      )
      .collect();

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const upcoming = reminders
      .filter((r: ReminderDoc) => {
        const reminderDate = new Date(r.date);
        return reminderDate >= now && reminderDate <= futureDate;
      })
      .sort(sortByDateAsc);

    return upcoming.map((r: ReminderDoc) => toReminderDocOut(r));
  },
});

// Helper: Get all enabled reminders (internal query for scheduler)
export const getAllEnabled = internalQuery({
  args: {},
  returns: v.array(reminderDocReturn),
  handler: async (ctx) => {
    const reminders: ReminderDoc[] = await ctx.db
      .query("reminders")
      .collect();

    return reminders
      .filter((r: ReminderDoc) => r.enabled)
      .map((r: ReminderDoc) => toReminderDocOut(r));
  },
});