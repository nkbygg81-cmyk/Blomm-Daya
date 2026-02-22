import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByCity = query({
args: {
city: v.string(),
},
handler: async (ctx, { city }) => {
const florists = await ctx.db
.query("florists")
.withIndex("by_city_and_available", (q: any) => q.eq("city", city).eq("available", true))
.collect();

return florists.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
},
returns: v.array(v.any()),
});

export const listByCountry = query({
  args: {
    country: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("florists"),
      name: v.union(v.string(), v.null()),
      businessName: v.union(v.string(), v.null()),
      city: v.union(v.string(), v.null()),
      country: v.union(v.string(), v.null()),
      rating: v.union(v.number(), v.null()),
      lat: v.union(v.number(), v.null()),
      lon: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const florists = await ctx.db
      .query("florists")
      .withIndex("by_country_and_available", (q: any) =>
        q.eq("country", args.country).eq("available", true)
      )
      .collect();

    return florists
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .map((f: any) => ({
        _id: f._id,
        name: typeof f.name === "string" ? f.name : null,
        businessName: typeof f.businessName === "string" ? f.businessName : null,
        city: typeof f.city === "string" ? f.city : null,
        country: typeof f.country === "string" ? f.country : null,
        rating: typeof f.rating === "number" ? f.rating : null,
        lat: typeof f.lat === "number" ? f.lat : null,
        lon: typeof f.lon === "number" ? f.lon : null,
      }));
  },
});

export const listByCityAndCountry = query({
  args: {
    country: v.string(),
    city: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("florists"),
      name: v.union(v.string(), v.null()),
      businessName: v.union(v.string(), v.null()),
      city: v.union(v.string(), v.null()),
      country: v.union(v.string(), v.null()),
      rating: v.union(v.number(), v.null()),
      lat: v.union(v.number(), v.null()),
      lon: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const florists = await ctx.db
      .query("florists")
      .withIndex("by_country_and_city_and_available", (q: any) =>
        q.eq("country", args.country).eq("city", args.city).eq("available", true)
      )
      .collect();

    return florists
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .map((f: any) => ({
        _id: f._id,
        name: typeof f.name === "string" ? f.name : null,
        businessName: typeof f.businessName === "string" ? f.businessName : null,
        city: typeof f.city === "string" ? f.city : null,
        country: typeof f.country === "string" ? f.country : null,
        rating: typeof f.rating === "number" ? f.rating : null,
        lat: typeof f.lat === "number" ? f.lat : null,
        lon: typeof f.lon === "number" ? f.lon : null,
      }));
  },
});

export const listAll = query({
args: {},
handler: async (ctx) => {
const florists = await ctx.db
.query("florists")
.withIndex("by_available", (q: any) => q.eq("available", true))
.collect();

return florists.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
},
returns: v.any(),
});

export const getCities = query({
args: {},
handler: async (ctx) => {
const florists = await ctx.db
.query("florists")
.withIndex("by_available", (q: any) => q.eq("available", true))
.collect();

// Create a map to get unique city-country combinations
const cityCountryMap = new Map<string, { city: string; country: string }>();

for (const f of florists as any[]) {
  const key = `${f.city}|${f.country}`;
  if (!cityCountryMap.has(key)) {
    cityCountryMap.set(key, {
      city: f.city,
      country: f.country,
    });
  }
}

// Convert to array and sort by country first, then by city
const cityCountryList = Array.from(cityCountryMap.values());
cityCountryList.sort((a, b) => {
  if (a.country !== b.country) {
    return a.country.localeCompare(b.country);
  }
  return a.city.localeCompare(b.city);
});

return cityCountryList;
},
returns: v.array(
  v.object({
    city: v.string(),
    country: v.string(),
  })
),
});

export const cleanBadCharacters = mutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const florists = await ctx.db.query("florists").collect();
    let deleted = 0;
    for (const f of florists) {
      if (f.city.includes("ö") || f.city.includes("ä") || f.city.includes("å")) {
        await ctx.db.delete(f._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const deleteAll = mutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const florists = await ctx.db.query("florists").collect();
    for (const florist of florists) {
      await ctx.db.delete(florist._id);
    }
    return { deleted: florists.length };
  },
});

export const seedFlorists = mutation({
  args: {},
  handler: async (ctx) => {
    const florists = [
      // Ukraine - Kyiv (with coordinates)
      { businessName: "Kvitkovaya Masterniya", name: "Kvitkovaya Masterniya", city: "Kyiv", country: "Ukraine", rating: 4.8, available: true, phone: "+380441234567", address: "Khreshchatyk St, 1", lat: 50.4501, lon: 30.5234, isSeed: true },
      { businessName: "Royalty of the Capital", name: "Royalty of the Capital", city: "Kyiv", country: "Ukraine", rating: 4.6, available: true, phone: "+380441234568", address: "Velyka Vasylkivska St, 12", lat: 50.4216, lon: 30.5212, isSeed: true },
      { businessName: "Flora Kyiv", name: "Flora Kyiv", city: "Kyiv", country: "Ukraine", rating: 4.9, available: true, phone: "+380441234569", address: "Peremohy Ave, 45", lat: 50.4547, lon: 30.4501, isSeed: true },

      // Ukraine - Lviv
      { businessName: "Lviv Flowers", name: "Lviv Flowers", city: "Lviv", country: "Ukraine", rating: 4.7, available: true, phone: "+380321234567", address: "Rynok Sq, 5", lat: 49.8413, lon: 24.0315, isSeed: true },
      { businessName: "Galician Roses", name: "Galician Roses", city: "Lviv", country: "Ukraine", rating: 4.5, available: true, phone: "+380321234568", address: "Horodotska St, 23", lat: 49.8382, lon: 24.0232, isSeed: true },

      // Ukraine - Odesa
      { businessName: "Odesa Flowers", name: "Odesa Flowers", city: "Odesa", country: "Ukraine", rating: 4.6, available: true, phone: "+380481234567", address: "Derybasivska St, 10", lat: 46.4825, lon: 30.7233, isSeed: true },
      { businessName: "Primorska Flora", name: "Primorska Flora", city: "Odesa", country: "Ukraine", rating: 4.4, available: true, phone: "+380481234568", address: "Kanatna St, 15", lat: 46.4869, lon: 30.7326, isSeed: true },

      // Ukraine - Kharkiv
      { businessName: "Kharkiv Bouquet", name: "Kharkiv Bouquet", city: "Kharkiv", country: "Ukraine", rating: 4.5, available: true, phone: "+380571234567", address: "Svobody Square, 3", lat: 49.9935, lon: 36.2304, isSeed: true },
      { businessName: "Slobozhansky Flowers", name: "Slobozhansky Flowers", city: "Kharkiv", country: "Ukraine", rating: 4.7, available: true, phone: "+380571234568", address: "Sumska St, 67", lat: 50.0049, lon: 36.2311, isSeed: true },

      // Ukraine - Dnipro
      { businessName: "Dnipro Roses", name: "Dnipro Roses", city: "Dnipro", country: "Ukraine", rating: 4.6, available: true, phone: "+380561234567", address: "Gagarina Ave, 24", lat: 48.4647, lon: 35.0462, isSeed: true },
      { businessName: "Flora Dnipro", name: "Flora Dnipro", city: "Dnipro", country: "Ukraine", rating: 4.4, available: true, phone: "+380561234568", address: "Naberezhnaya St, 50", lat: 48.4647, lon: 35.0523, isSeed: true },

      // Ukraine - Kosiv (NEW - tourist town in Carpathian Mountains)
      { businessName: "Карпатські Квіти", name: "Карпатські Квіти", city: "Kosiv", country: "Ukraine", rating: 4.8, available: true, phone: "+380342123456", address: "Nezalezhnosti St, 15, Kosiv", lat: 48.3147, lon: 25.0947, isSeed: true },
      { businessName: "Косівська Флора", name: "Косівська Флора", city: "Kosiv", country: "Ukraine", rating: 4.7, available: true, phone: "+380342123457", address: "Shevchenka St, 32, Kosiv", lat: 48.3125, lon: 25.0928, isSeed: true },

      // Sweden - Stockholm
      { businessName: "Stockholm Blommor", name: "Stockholm Blommor", city: "Stockholm", country: "Sweden", rating: 4.8, available: true, phone: "+4686123456", address: "Drottninggatan 50, Stockholm", lat: 59.3293, lon: 18.0686, isSeed: true },
      { businessName: "Blomsterbutiken", name: "Blomsterbutiken", city: "Stockholm", country: "Sweden", rating: 4.7, available: true, phone: "+4686234567", address: "Norrmalm, Stockholm", lat: 59.3344, lon: 18.0632, isSeed: true },
      { businessName: "Rosor & Ranunkler", name: "Rosor & Ranunkler", city: "Stockholm", country: "Sweden", rating: 4.9, available: true, phone: "+4686345678", address: "Gamla Stan, Stockholm", lat: 59.3251, lon: 18.0711, isSeed: true },

      // Sweden - Gothenburg
      { businessName: "Goteborg Blomster", name: "Goteborg Blomster", city: "Gothenburg", country: "Sweden", rating: 4.6, available: true, phone: "+4631123456", address: "Avenyn 25, Goteborg", lat: 57.7, lon: 11.967, isSeed: true },
      { businessName: "Blomsterhandeln", name: "Blomsterhandeln", city: "Gothenburg", country: "Sweden", rating: 4.5, available: true, phone: "+4631234567", address: "Kungsgatan 10, Goteborg", lat: 57.7089, lon: 11.9746, isSeed: true },

      // Sweden - Malmo
      { businessName: "Malmo Blommor", name: "Malmo Blommor", city: "Malmo", country: "Sweden", rating: 4.7, available: true, phone: "+4640123456", address: "Stortorget 12, Malmo", lat: 55.605, lon: 13.0038, isSeed: true },
      { businessName: "Blomsterkallan", name: "Blomsterkallan", city: "Malmo", country: "Sweden", rating: 4.6, available: true, phone: "+4640234567", address: "Sodergatan 8, Malmo", lat: 55.6061, lon: 13.0011, isSeed: true },

      // Sweden - Uppsala
      { businessName: "Uppsala Blomster", name: "Uppsala Blomster", city: "Uppsala", country: "Sweden", rating: 4.5, available: true, phone: "+4618123456", address: "Sankt Persgatan 5, Uppsala", lat: 59.8586, lon: 17.6389, isSeed: true },

      // Sweden - Vasters
      { businessName: "Vasters Blommor", name: "Vasters Blommor", city: "Vasters", country: "Sweden", rating: 4.4, available: true, phone: "+4621123456", address: "Drottninggatan 12, Vasters", lat: 59.6099, lon: 16.5448, isSeed: true },
    ];

    const existing = await ctx.db.query("florists").collect();

    const keyOf = (f: any) => {
      const n = (f.businessName ?? f.name ?? "").toLowerCase();
      const c = (f.city ?? "").toLowerCase();
      const country = (f.country ?? "").toLowerCase();
      return `${n}|${c}|${country}`;
    };

    const existingByKey = new Map<string, any>();
    for (const f of existing) {
      existingByKey.set(keyOf(f), f);
    }

    const seedKeys = new Set<string>();

    // Upsert seeded florists
    let inserted = 0;
    let updated = 0;

    const upsertedFloristIds: string[] = [];

    for (const florist of florists) {
      const k = keyOf(florist);
      seedKeys.add(k);

      const prev = existingByKey.get(k);
      if (prev) {
        // Only patch seed-like fields; do not overwrite email/registrationNumber/etc.
        await ctx.db.patch(prev._id, {
          businessName: florist.businessName,
          name: florist.name,
          city: florist.city,
          country: florist.country,
          available: florist.available,
          rating: florist.rating,
          phone: florist.phone,
          address: florist.address,
          lat: florist.lat,
          lon: florist.lon,
          isSeed: true,
        } as any);
        upsertedFloristIds.push(prev._id);
        updated++;
      } else {
        const id = await ctx.db.insert("florists", florist as any);
        upsertedFloristIds.push(id);
        inserted++;
      }
    }

    // Ensure each seeded florist has at least 1 portfolio photo
    // (this is used on the buyer Browse header/cover)
    for (const floristId of upsertedFloristIds as any[]) {
      const existingPhotos = await ctx.db
        .query("portfolioPhotos")
        .withIndex("by_florist", (q: any) => q.eq("floristId", floristId))
        .take(1);

      if (existingPhotos.length > 0) continue;

      // Use the a0 image generator for stable demo images.
      const florist: any = await ctx.db.get(floristId);
      const title = encodeURIComponent(String(florist?.businessName ?? florist?.name ?? "Florist"));
      const city = encodeURIComponent(String(florist?.city ?? ""));

      const img1 = `https://api.a0.dev/assets/image?text=${title}%20Bouquet&aspect=1:1&seed=11`;
      const img2 = `https://api.a0.dev/assets/image?text=${city}%20Flowers&aspect=1:1&seed=22`;

      await ctx.db.insert("portfolioPhotos", {
        floristId,
        imageUrl: img1,
        createdAt: Date.now(),
        description: "Bouquet",
        price: 850,
      });

      await ctx.db.insert("portfolioPhotos", {
        floristId,
        imageUrl: img2,
        createdAt: Date.now(),
        description: "Seasonal",
        price: 650,
      });
    }

    // Remove old seeded records that are no longer in the seed list
    let deleted = 0;
    for (const f of existing) {
      if (f?.isSeed === true && !seedKeys.has(keyOf(f))) {
        await ctx.db.delete(f._id);
        deleted++;
      }
    }

    return {
      message: "Florists seeded successfully",
      count: florists.length,
      inserted,
      updated,
      deleted,
    };
  },
  returns: v.object({
    message: v.string(),
    count: v.number(),
    inserted: v.number(),
    updated: v.number(),
    deleted: v.number(),
  }),
});

export const generatePortfolioUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addPortfolioPhoto = mutation({
  args: {
    floristId: v.id("florists"),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.imageUrl && !args.imageStorageId) {
      throw new Error("Missing imageUrl or imageStorageId");
    }
    const photoId = await ctx.db.insert("portfolioPhotos", {
      floristId: args.floristId,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      description: args.description,
      price: args.price,
      createdAt: Date.now(),
    });
    return photoId;
  },
  returns: v.id("portfolioPhotos"),
});

export const deletePortfolioPhoto = mutation({
  args: {
    photoId: v.id("portfolioPhotos"),
  },
  handler: async (ctx, args) => {
    const photo: any = await ctx.db.get(args.photoId);
    if (photo?.imageStorageId) {
      await ctx.storage.delete(photo.imageStorageId);
    }
    await ctx.db.delete(args.photoId);
  },
  returns: v.null(),
});

export const getPortfolioPhotos = query({
  args: {
    floristId: v.id("florists"),
  },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("portfolioPhotos")
      .withIndex("by_florist", (q: any) => q.eq("floristId", args.floristId))
      .order("desc")
      .collect();
    const out = [] as any[];
    for (const p of photos as any[]) {
      let imageUrl: string | null = null;
      if (p.imageStorageId) {
        imageUrl = await ctx.storage.getUrl(p.imageStorageId);
      }
      if (!imageUrl && typeof p.imageUrl === "string") {
        imageUrl = p.imageUrl;
      }
      out.push({
        _id: p._id,
        _creationTime: p._creationTime,
        floristId: p.floristId,
        imageUrl,
        description: p.description,
        price: p.price,
        createdAt: p.createdAt,
      });
    }
    return out;
  },
  returns: v.array(
    v.object({
      _id: v.id("portfolioPhotos"),
      _creationTime: v.number(),
      floristId: v.id("florists"),
      imageUrl: v.union(v.string(), v.null()),
      description: v.optional(v.string()),
      price: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
});

/**
 * Get florists sorted by distance from user location
 * Returns florists with their portfolio photos
 */
export const getFloristsByDistance = query({
  args: {
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 4;
    
    // Get all available florists with coordinates
    const florists = await ctx.db
      .query("florists")
      .withIndex("by_available", (q: any) => q.eq("available", true))
      .collect();

    const floristsWithPhotos = [];

    for (const florist of florists as any[]) {
      // Only include florists with portfolio photos
      const photos = await ctx.db
        .query("portfolioPhotos")
        .withIndex("by_florist", (q: any) => q.eq("floristId", florist._id))
        .take(1);

      if (photos.length === 0) continue;

      let distance = null;
      
      // Calculate distance if user location is provided and florist has coordinates
      if (args.userLat && args.userLon && florist.lat && florist.lon) {
        distance = calculateDistanceKm(
          args.userLat,
          args.userLon,
          florist.lat,
          florist.lon
        );
      }

      // Get the first portfolio photo
      let imageUrl: string | null = null;
      const photo = photos[0] as any;
      if (photo.imageStorageId) {
        imageUrl = await ctx.storage.getUrl(photo.imageStorageId);
      }
      if (!imageUrl && typeof photo.imageUrl === "string") {
        imageUrl = photo.imageUrl;
      }

      floristsWithPhotos.push({
        _id: florist._id,
        businessName: florist.businessName,
        name: florist.name,
        city: florist.city,
        country: florist.country,
        rating: florist.rating,
        portfolioImageUrl: imageUrl,
        distance,
      });
    }

    // Sort by distance (closest first) if available, otherwise by rating
    floristsWithPhotos.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return floristsWithPhotos.slice(0, limit);
  },
  returns: v.array(
    v.object({
      _id: v.id("florists"),
      businessName: v.string(),
      name: v.string(),
      city: v.string(),
      country: v.string(),
      rating: v.number(),
      portfolioImageUrl: v.union(v.string(), v.null()),
      distance: v.union(v.number(), v.null()),
    })
  ),
});

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Update platform fee percentage for a florist
 */
export const updatePlatformFee = mutation({
  args: {
    floristId: v.id("florists"),
    platformFeePercent: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    floristId: v.id("florists"),
    platformFeePercent: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.platformFeePercent < 0 || args.platformFeePercent > 1) {
      throw new Error("Platform fee must be between 0 and 1 (0% to 100%)");
    }
    
    await ctx.db.patch(args.floristId, {
      platformFeePercent: args.platformFeePercent,
    });
    
    return {
      success: true,
      floristId: args.floristId,
      platformFeePercent: args.platformFeePercent,
    };
  },
});

/**
 * Get florist by ID
 */
export const getById = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.union(
    v.object({
      _id: v.id("florists"),
      name: v.union(v.string(), v.null()),
      businessName: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      phone: v.union(v.string(), v.null()),
      address: v.union(v.string(), v.null()),
      city: v.union(v.string(), v.null()),
      country: v.union(v.string(), v.null()),
      available: v.union(v.boolean(), v.null()),
      rating: v.union(v.number(), v.null()),
      workingHours: v.optional(v.string()),
      deliveryRadius: v.optional(v.number()),
      minOrderAmount: v.optional(v.number()),
      bio: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const florist = await ctx.db.get(args.floristId);
    if (!florist) return null;
    
    return {
      _id: florist._id,
      name: (florist as any).name ?? null,
      businessName: (florist as any).businessName ?? null,
      email: (florist as any).email ?? null,
      phone: (florist as any).phone ?? null,
      address: (florist as any).address ?? null,
      city: (florist as any).city ?? null,
      country: (florist as any).country ?? null,
      available: (florist as any).available ?? null,
      rating: (florist as any).rating ?? null,
      workingHours: (florist as any).workingHours,
      deliveryRadius: (florist as any).deliveryRadius,
      minOrderAmount: (florist as any).minOrderAmount,
      bio: (florist as any).bio,
    };
  },
});

/**
 * Update florist profile
 */
export const updateProfile = mutation({
  args: {
    floristId: v.id("florists"),
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    deliveryRadius: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    bio: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { floristId, ...updates } = args;
    
    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(floristId, cleanUpdates);
    
    return { success: true };
  },
});

/**
 * Toggle florist availability status
 */
export const toggleAvailability = mutation({
  args: {
    floristId: v.id("florists"),
    available: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    available: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.floristId, {
      available: args.available,
    });
    
    return {
      success: true,
      available: args.available,
    };
  },
});

/**
 * Update florist location coordinates
 */
export const updateCoordinates = mutation({
  args: {
    floristId: v.id("florists"),
    lat: v.number(),
    lon: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.floristId, {
      lat: args.lat,
      lon: args.lon,
    });
    
    return { success: true };
  },
});

/**
 * Get florist financial stats
 */
export const getFinancialStats = query({
  args: {
    floristId: v.id("florists"),
  },
  returns: v.object({
    totalRevenue: v.number(),
    thisMonthRevenue: v.number(),
    lastMonthRevenue: v.number(),
    thisWeekRevenue: v.number(),
    pendingPayouts: v.number(),
    completedPayouts: v.number(),
    totalOrders: v.number(),
    averageOrderValue: v.number(),
    platformFeePercent: v.number(),
  }),
  handler: async (ctx, args) => {
    const florist = await ctx.db.get(args.floristId);
    const platformFeePercent = (florist as any)?.platformFeePercent ?? 0.15;
    
    // Get all orders for this florist
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_florist", (q: any) => q.eq("floristId", args.floristId))
      .collect();
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const lastMonthEnd = thisMonthStart;
    
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let thisWeekRevenue = 0;
    let deliveredOrders = 0;
    
    for (const order of orders as any[]) {
      if (order.status === "delivered" || order.status === "completed") {
        const orderTotal = order.total || 0;
        const floristShare = orderTotal * (1 - platformFeePercent);
        
        totalRevenue += floristShare;
        deliveredOrders++;
        
        const orderTime = order._creationTime || order.createdAt || 0;
        
        if (orderTime >= thisMonthStart) {
          thisMonthRevenue += floristShare;
        }
        
        if (orderTime >= lastMonthStart && orderTime < lastMonthEnd) {
          lastMonthRevenue += floristShare;
        }
        
        if (orderTime >= now - oneWeek) {
          thisWeekRevenue += floristShare;
        }
      }
    }
    
    const averageOrderValue = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;
    
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
      lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
      thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
      pendingPayouts: 0, // Would come from Stripe
      completedPayouts: Math.round(totalRevenue * 100) / 100,
      totalOrders: deliveredOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      platformFeePercent,
    };
  },
});

/**
 * Get orders for calendar view
 */
export const getOrdersForCalendar = query({
  args: {
    floristId: v.id("florists"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("orders"),
      deliveryDate: v.union(v.number(), v.null()),
      status: v.string(),
      total: v.number(),
      customerName: v.union(v.string(), v.null()),
      deliveryAddress: v.union(v.string(), v.null()),
      itemsCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_florist", (q: any) => q.eq("floristId", args.floristId))
      .collect();
    
    return orders
      .filter((o: any) => {
        if (!o.deliveryDate) return false;
        if (args.startDate && o.deliveryDate < args.startDate) return false;
        if (args.endDate && o.deliveryDate > args.endDate) return false;
        return true;
      })
      .map((o: any) => ({
        _id: o._id,
        deliveryDate: o.deliveryDate ?? null,
        status: o.status || "pending",
        total: o.total || 0,
        customerName: o.customerName ?? null,
        deliveryAddress: o.deliveryAddress ?? null,
        itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      }));
  },
});