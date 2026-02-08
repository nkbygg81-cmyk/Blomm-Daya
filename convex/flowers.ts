import { v } from "convex/values";
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  returns: v.string(),
  handler: async () => "pong",
});

const publicFlowerReturn = v.object({
  id: v.id("flowers"),
  name: v.string(),
  description: v.union(v.null(), v.string()),
  price: v.number(),
  currency: v.string(),
  imageUrl: v.union(v.null(), v.string()),
});

type PublicOut = {
  id: any;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
};

async function listPublicImpl(ctx: any, limit: number): Promise<PublicOut[]> {
  // Legacy table: best-effort normalization.
  const rows = await ctx.db.query("flowers").order("desc").take(200);

  const out: PublicOut[] = [];

  for (const f of rows as any[]) {
    if (out.length >= limit) break;

    const name = typeof f.name === "string" ? f.name.trim() : "Bouquet";
    const price = typeof f.price === "number" ? f.price : 0;
    const currency = "SEK";

    const inStock =
      typeof f.inStock === "boolean" ? f.inStock : f.isActive !== false;
    if (!inStock) continue;
    if (!name) continue;

    const description = typeof f.description === "string" ? f.description : null;

    // Get image URL from storage if imageStorageId exists, otherwise use imageUrl
    let imageUrl: string | null = null;
    if (f.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(f.imageStorageId);
    } else if (typeof f.imageUrl === "string" && f.imageUrl) {
      imageUrl = f.imageUrl;
    } else if (typeof f.image === "string" && f.image) {
      imageUrl = f.image;
    }

    out.push({
      id: f._id,
      name,
      description,
      price,
      currency,
      imageUrl,
    });
  }

  return out;
}

// Backwards compatible name (older clients call this)
export const listPublic = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(publicFlowerReturn),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, args.limit ?? 40));
    return await listPublicImpl(ctx, limit);
  },
});

// Canonical name (new clients call this)
export const listPublicFlowers = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(publicFlowerReturn),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, args.limit ?? 40));
    return await listPublicImpl(ctx, limit);
  },
});

/**
 * Get public flowers with florist location data for distance-based filtering
 */
export const listPublicFlowersWithLocation = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      id: v.id("portfolioPhotos"),
      name: v.string(),
      description: v.union(v.null(), v.string()),
      price: v.number(),
      currency: v.string(),
      imageUrl: v.union(v.null(), v.string()),
      floristId: v.union(v.null(), v.id("florists")),
      floristName: v.union(v.null(), v.string()),
      floristCity: v.union(v.null(), v.string()),
      floristCountry: v.union(v.null(), v.string()),
      floristLat: v.union(v.null(), v.number()),
      floristLon: v.union(v.null(), v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, args.limit ?? 100));
    
    // Get all portfolio photos from available florists
    const photos = await ctx.db
      .query("portfolioPhotos")
      .order("desc")
      .take(200);

    const out: any[] = [];

    for (const photo of photos as any[]) {
      if (out.length >= limit) break;

      // Get florist data
      const florist = await ctx.db.get(photo.floristId);
      if (!florist || !florist.available) continue;

      let imageUrl: string | null = null;
      if (photo.imageStorageId) {
        imageUrl = await ctx.storage.getUrl(photo.imageStorageId);
      }
      if (!imageUrl && typeof photo.imageUrl === "string") {
        imageUrl = photo.imageUrl;
      }

      const name = typeof photo.description === "string" && photo.description
        ? photo.description
        : "Bouquet";
      const price = typeof photo.price === "number" ? photo.price : 0;
      const description = typeof photo.description === "string" ? photo.description : null;

      out.push({
        id: photo._id,
        name,
        description,
        price,
        currency: "SEK",
        imageUrl,
        floristId: florist._id,
        floristName: florist.businessName || florist.name || "Florist",
        floristCity: florist.city || null,
        floristCountry: florist.country || null,
        floristLat: florist.lat || null,
        floristLon: florist.lon || null,
      });
    }

    return out;
  },
});

/**
 * Get flowers (portfolio photos) by florist location
 * Returns flowers only from florists in the specified country/city
 */
export const listByLocation = query({
  args: {
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.id("portfolioPhotos"),
      name: v.string(),
      description: v.union(v.null(), v.string()),
      price: v.number(),
      currency: v.string(),
      imageUrl: v.union(v.null(), v.string()),
      floristId: v.id("florists"),
      floristName: v.string(),
      floristCity: v.string(),
      floristCountry: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, args.limit ?? 40));
    
    // 1. Find florists by location
    let florists: any[] = [];
    
    if (args.country && args.city) {
      // Filter by both country and city
      florists = await ctx.db
        .query("florists")
        .withIndex("by_country_and_city_and_available", (q: any) =>
          q.eq("country", args.country).eq("city", args.city).eq("available", true)
        )
        .collect();
    } else if (args.country) {
      // Filter by country only
      florists = await ctx.db
        .query("florists")
        .withIndex("by_country_and_available", (q: any) =>
          q.eq("country", args.country).eq("available", true)
        )
        .collect();
    } else {
      // No filter - get all available florists
      florists = await ctx.db
        .query("florists")
        .withIndex("by_available", (q: any) => q.eq("available", true))
        .collect();
    }

    if (florists.length === 0) {
      return [];
    }

    // 2. Get portfolio photos from these florists
    const floristIds = florists.map((f) => f._id);
    const out: any[] = [];

    for (const floristId of floristIds) {
      if (out.length >= limit) break;

      const photos = await ctx.db
        .query("portfolioPhotos")
        .withIndex("by_florist", (q: any) => q.eq("floristId", floristId))
        .collect();

      const florist = florists.find((f) => f._id === floristId);
      if (!florist) continue;

      for (const photo of photos as any[]) {
        if (out.length >= limit) break;

        let imageUrl: string | null = null;
        if (photo.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(photo.imageStorageId);
        }
        if (!imageUrl && typeof photo.imageUrl === "string") {
          imageUrl = photo.imageUrl;
        }

        const name = typeof photo.description === "string" && photo.description
          ? photo.description
          : "Bouquet";
        const price = typeof photo.price === "number" ? photo.price : 0;
        const description = typeof photo.description === "string" ? photo.description : null;

        out.push({
          id: photo._id,
          name,
          description,
          price,
          currency: "SEK",
          imageUrl,
          floristId: florist._id,
          floristName: florist.businessName || florist.name || "Florist",
          floristCity: florist.city || "",
          floristCountry: florist.country || "",
        });
      }
    }

    return out;
  },
});