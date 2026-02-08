import { internalAction } from "./_generated/server";
import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal action: Check and send reminder notifications
export const checkReminders = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("[Cron] Starting reminder check");

    try {
      // Get all enabled reminders
      const reminders = await ctx.runQuery(internal.reminders.getAllEnabled, {});

      const now = new Date();
      let sentCount = 0;

      for (const reminder of reminders) {
        try {
          // Parse reminder date (format: YYYY-MM-DD or YYYYMMDD)
          let reminderDate: Date;

          if (reminder.date.includes("-")) {
            reminderDate = new Date(reminder.date);
          } else {
            // Parse YYYYMMDD format
            const year = parseInt(reminder.date.substring(0, 4));
            const month = parseInt(reminder.date.substring(4, 6)) - 1;
            const day = parseInt(reminder.date.substring(6, 8));
            reminderDate = new Date(year, month, day);
          }

          // Calculate days until reminder
          const daysUntilReminder = Math.floor(
            (reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Check if reminder is due (within notifyDaysBefore and not in the past)
          if (daysUntilReminder > reminder.notifyDaysBefore || daysUntilReminder < 0) {
            continue;
          }

          // Determine userId and userType based on available fields
          const userId = reminder.buyerId || reminder.buyerDeviceId;
          const userType: "buyer" | "florist" = "buyer"; // Reminders are for buyers

          // Check if user has notifications enabled for reminders
          const prefs = await ctx.runQuery(
            internal.notifications.getPreferencesInternal,
            { userId, userType }
          );

          if (!prefs?.reminders) {
            console.log(`[Cron] Reminders disabled for user ${userId}`);
            continue;
          }

          // Get push tokens
          const tokens = await ctx.runQuery(
            internal.notifications.getUserTokensInternal,
            { userId, userType }
          );

          if (!tokens || tokens.length === 0) {
            console.log(`[Cron] No push tokens for user ${userId}`);
            continue;
          }

          // Create notification text
          const daysText =
            daysUntilReminder === 0
              ? "Today"
              : daysUntilReminder === 1
              ? "Tomorrow"
              : `In ${daysUntilReminder} days`;

          const title = `Reminder: ${reminder.recipientName || reminder.title}`;
          const body = `${daysText} - ${reminder.type}`;

          // Send notification to all tokens
          for (const token of tokens) {
            await ctx.runAction(internal.notifications.sendPushNotificationInternal, {
              token,
              title,
              body,
              data: { type: "reminder", reminderId: reminder._id },
            });
          }

          // Save to notification history
          await ctx.runMutation(internal.notifications.saveToHistoryInternal, {
            userId,
            userType,
            type: "reminder",
            title,
            body,
          });

          sentCount++;
          console.log(`[Cron] Sent reminder for ${reminder.recipientName || reminder.title}`);
        } catch (error) {
          console.error(`[Cron] Error processing reminder:`, error);
        }
      }

      console.log(`[Cron] Reminder check complete. Sent ${sentCount} notifications.`);
    } catch (error) {
      console.error("[Cron] Fatal error in reminder check:", error);
    }

    return null;
  },
});

// Define cron job: Run every day at midnight (UTC)
const crons = cronJobs();

crons.cron(
  "check reminders daily",
  "0 0 * * *", // Midnight every day
  internal.cron.checkReminders,
  {}
);

export default crons;