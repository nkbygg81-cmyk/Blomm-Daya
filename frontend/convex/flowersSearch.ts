import { v } from "convex/values";
import { query } from "./_generated/server";

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.union(v.string(), v.null()),
      price: v.number(),
      currency: v.string(),
      imageUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const allFlowers = await ctx.db.query("flowers").collect();

    const searchQuery = args.query.toLowerCase().trim();

    const filtered = allFlowers.filter((flower: any) => {
      const name = (flower.name || "").toLowerCase();
      const description = (flower.description || "").toLowerCase();
      const category = (flower.category || "").toLowerCase();

      return (
        name.includes(searchQuery) ||
        description.includes(searchQuery) ||
        category.includes(searchQuery)
      );
    });

    return filtered.slice(0, args.limit ?? 50).map((f: any) => ({
      id: f._id || f.id,
      name: f.name,
      description: f.description || null,
      price: f.price,
      currency: "SEK",
      imageUrl: f.imageUrl || null,
    }));
  },
});

export const filter = query({
  args: {
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.union(v.string(), v.null()),
      price: v.number(),
      currency: v.string(),
      imageUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const allFlowers = await ctx.db.query("flowers").collect();

    const filtered = allFlowers.filter((flower: any) => {
      if (args.minPrice !== undefined && flower.price < args.minPrice) return false;
      if (args.maxPrice !== undefined && flower.price > args.maxPrice) return false;
      if (args.category && flower.category !== args.category) return false;
      if (
        args.color &&
        !Array.isArray(flower.colors)
      ) {
        return false;
      }
      if (
        args.color &&
        Array.isArray(flower.colors) &&
        !(flower.colors as string[]).includes(args.color)
      ) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, args.limit ?? 50).map((f: any) => ({
      id: f._id || f.id,
      name: f.name,
      description: f.description || null,
      price: f.price,
      currency: "SEK",
      imageUrl: f.imageUrl || null,
    }));
  },
});

export const getCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const flowers = await ctx.db.query("flowers").collect();
    const categories = new Set(flowers.map((f: any) => f.category).filter((c: any) => c));
    return Array.from(categories).sort();
  },
});

export const getColors = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const flowers = await ctx.db.query("flowers").collect();
    const colors = new Set<string>();
    flowers.forEach((f: any) => {
      if (Array.isArray(f.colors)) {
        f.colors.forEach((c: string) => colors.add(c));
      }
    });
    return Array.from(colors).sort();
  },
});

export const getPriceRange = query({
  args: {},
  returns: v.object({
    min: v.number(),
    max: v.number(),
  }),
  handler: async (ctx) => {
    const flowers = await ctx.db.query("flowers").collect();
    if (flowers.length === 0) return { min: 0, max: 0 };

    const prices = flowers.map((f: any) => f.price).sort((a: number, b: number) => a - b);
    return {
      min: prices[0],
      max: prices[prices.length - 1],
    };
  },
});