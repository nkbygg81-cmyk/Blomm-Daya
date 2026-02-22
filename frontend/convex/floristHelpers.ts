import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
* Helper mutation to add email to existing florist
* Run this via Convex dashboard to add email to a florist for testing
*/
export const addEmailToFlorist = mutation({
args: {
floristId: v.id("florists"),
email: v.string(),
},
returns: v.null(),
handler: async (ctx, args) => {
await ctx.db.patch(args.floristId, {
email: args.email,
});
},
});

/**
* Helper to list all florists with their emails
*/
export const listFloristsWithEmails = mutation({
args: {},
returns: v.any(),
handler: async (ctx) => {
const florists = await ctx.db.query("florists").collect();
return florists.map((f: any) => ({
_id: f._id,
name: f.name,
city: f.city,
email: f.email ?? "NO EMAIL",
}));
},
});
