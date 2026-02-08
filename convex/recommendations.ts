import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";

export const getPersonalizedRecommendations = action({
args: {
buyerId: v.id("buyers"),
occasion: v.optional(v.string()),
limit: v.optional(v.number()),
},
returns: v.object({
recommendations: v.array(v.string()),
reasoning: v.string(),
}),
handler: async (ctx, args) => {
// Get buyer profile and preferences
const profile = await ctx.runQuery(api.buyerProfiles.getProfile, {
buyerId: args.buyerId,
});

// Get buyer's order history
const buyer = await ctx.runQuery(api.buyerAuth.getCurrentBuyer, {
token: "temp", // This should be passed from the caller
});

// Get all flowers
const flowers = await ctx.runQuery(api.flowers.listPublicFlowers, { limit: 100 });

// Build context for AI
const favoriteColors = profile?.preferences?.favoriteColors?.join(", ") ?? "unknown";
const favoriteOccasions = profile?.preferences?.favoriteOccasions?.join(", ") ?? "unknown";
const occasion = args.occasion ?? "general";

const flowersList = flowers.map(f => 
`${f.name} (${f.price} ${f.currency}) - ${f.description ?? 'no description'}`
).join("\n");

// Call AI API
const response = await (globalThis as any).fetch("https://api.a0.dev/ai/llm", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
messages: [
{
role: "system",
content: "You are a flower recommendation expert. Based on user preferences and occasion, recommend the most suitable flowers from the available list. Return flower IDs only."
},
{
role: "user",
content: `User preferences:
- Favorite colors: ${favoriteColors}
- Favorite occasions: ${favoriteOccasions}
- Current occasion: ${occasion}

Available flowers:
${flowersList}

Recommend ${args.limit ?? 5} flowers that best match the user's preferences and occasion. Respond with flower IDs and brief reasoning.`
}
],
schema: {
type: "object",
properties: {
flowerIds: {
type: "array",
items: { type: "string" }
},
reasoning: { type: "string" }
},
required: ["flowerIds", "reasoning"]
}
}),
});

const data = await response.json();

if (data.schema_data) {
return {
recommendations: data.schema_data.flowerIds.slice(0, args.limit ?? 5),
reasoning: data.schema_data.reasoning,
};
}

// Fallback: return first N flowers
return {
recommendations: flowers.slice(0, args.limit ?? 5).map(f => f.id),
reasoning: "Showing popular choices",
};
},
});

export const getOccasionRecommendations = action({
args: {
occasion: v.string(),
budget: v.optional(v.number()),
limit: v.optional(v.number()),
},
returns: v.array(v.string()),
handler: async (ctx, args) => {
// Get all flowers
const flowers = await ctx.runQuery(api.flowers.listPublicFlowers, { limit: 100 });

// Filter by budget if provided
const filtered = args.budget 
? flowers.filter(f => f.price <= args.budget)
: flowers;

const flowersList = filtered.map(f => 
`ID: ${f.id}, Name: ${f.name}, Price: ${f.price}, Description: ${f.description ?? 'none'}`
).join("\n");

// Call AI API
const response = await (globalThis as any).fetch("https://api.a0.dev/ai/llm", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
messages: [
{
role: "system",
content: "You are a flower recommendation expert. Recommend flowers based on occasion."
},
{
role: "user",
content: `Occasion: ${args.occasion}
Budget: ${args.budget ? `${args.budget} UAH` : "no limit"}

Available flowers:
${flowersList}

Recommend ${args.limit ?? 5} most suitable flowers for this occasion. Return only the flower IDs in order of suitability.`
}
],
schema: {
type: "object",
properties: {
flowerIds: {
type: "array",
items: { type: "string" }
}
},
required: ["flowerIds"]
}
}),
});

const data = await response.json();

if (data.schema_data) {
return data.schema_data.flowerIds.slice(0, args.limit ?? 5);
}

// Fallback
return filtered.slice(0, args.limit ?? 5).map(f => f.id);
},
});
