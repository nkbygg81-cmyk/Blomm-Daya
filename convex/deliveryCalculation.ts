import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Calculate distance and delivery fee between customer address and nearest florist
 * Finds florist in the same country as delivery address
 */
export const calculateDeliveryInfo = action({
  args: {
    deliveryAddress: v.string(),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    customerLat: v.optional(v.number()),
    customerLon: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      distanceKm: v.number(),
      deliveryFee: v.number(),
      floristName: v.string(),
      floristId: v.string(),
      floristLat: v.number(),
      floristLon: v.number(),
      customerLat: v.number(),
      customerLon: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    try {
      // 1. Geocode customer address (skip if coordinates already provided)
      let customerGeo: { lat: number; lon: number; country?: string } | null = null;
      if (args.customerLat != null && args.customerLon != null) {
        customerGeo = { lat: args.customerLat, lon: args.customerLon, country: args.country };
      } else {
        customerGeo = await geocodeAddress(args.deliveryAddress);
      }
      if (!customerGeo) {
        console.error("Failed to geocode customer address:", args.deliveryAddress);
        // Fallback: pick any available florist
        return await pickFallbackFlorist(ctx);
      }

      console.log("Customer coordinates:", customerGeo);

      // 2. Get country from geocoding if not provided
      const rawCountry = args.country || customerGeo.country;
      
      if (!rawCountry) {
        console.error("Cannot determine country for delivery");
        // Fallback: pick any available florist
        return await pickFallbackFlorist(ctx);
      }

      // Nominatim returns country_code in lowercase (e.g. "se", "ua")
      // Try both uppercase and as-is to match DB records
      const targetCountryVariants = [
        rawCountry,
        rawCountry.toUpperCase(),
        rawCountry.toLowerCase(),
      ];

      // 3. Get florists in the same country (try all case variants)
      let florists: any[] = [];
      
      for (const targetCountry of targetCountryVariants) {
        if (args.city) {
          florists = await ctx.runQuery(api.florists.listByCityAndCountry, {
            country: targetCountry,
            city: args.city,
          });
        }
        
        if (florists.length === 0) {
          florists = await ctx.runQuery(api.florists.listByCountry, {
            country: targetCountry,
          });
        }
        
        if (florists.length > 0) break;
      }

      console.log(`Found ${florists.length} florists for country variants: ${targetCountryVariants.join(", ")}`);

      // Filter florists with coordinates
      const floristsWithCoords = florists.filter(
        (f: any) => f.lat != null && f.lon != null
      );

      if (floristsWithCoords.length === 0) {
        console.error(`No florists with coordinates in ${targetCountryVariants.join(", ")}`);
        // Fallback: if we have florists but none with coords, use the first one with a default distance
        if (florists.length > 0) {
          const fallback = florists[0];
          return {
            distanceKm: 5,
            deliveryFee: calculateDeliveryFee(5),
            floristName: fallback.businessName || fallback.name || "Florist",
            floristId: fallback._id,
            floristLat: customerGeo.lat,
            floristLon: customerGeo.lon,
            customerLat: customerGeo.lat,
            customerLon: customerGeo.lon,
          };
        }
        // No florists at all for this country - try global fallback
        return await pickFallbackFlorist(ctx, customerGeo);
      }

      // 4. Find nearest florist
      let nearestFlorist = floristsWithCoords[0];
      let minDistance = calculateDistance(
        customerGeo.lat,
        customerGeo.lon,
        nearestFlorist.lat,
        nearestFlorist.lon
      );

      for (const florist of floristsWithCoords.slice(1)) {
        const distance = calculateDistance(
          customerGeo.lat,
          customerGeo.lon,
          florist.lat,
          florist.lon
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestFlorist = florist;
        }
      }

      // 5. Calculate delivery fee based on distance
      const deliveryFee = calculateDeliveryFee(minDistance);

      return {
        distanceKm: Math.round(minDistance * 10) / 10,
        deliveryFee,
        floristName: nearestFlorist.businessName || nearestFlorist.name || "Florist",
        floristId: nearestFlorist._id,
        floristLat: nearestFlorist.lat,
        floristLon: nearestFlorist.lon,
        customerLat: customerGeo.lat,
        customerLon: customerGeo.lon,
      };
    } catch (error) {
      console.error("Error calculating delivery:", error);
      return null;
    }
  },
});

/**
 * Fallback: pick any available florist when geocoding/country lookup fails
 */
async function pickFallbackFlorist(ctx: any, customerGeo?: { lat: number; lon: number } | null) {
  try {
    const allFlorists = await ctx.runQuery(api.florists.listAll, {});
    if (!allFlorists || allFlorists.length === 0) {
      console.error("No available florists at all");
      return null;
    }

    // Prefer florists with coordinates
    const withCoords = allFlorists.filter((f: any) => f.lat != null && f.lon != null);
    const chosen = withCoords.length > 0 ? withCoords[0] : allFlorists[0];

    let distanceKm = 5;
    if (customerGeo && chosen.lat != null && chosen.lon != null) {
      distanceKm = calculateDistance(customerGeo.lat, customerGeo.lon, chosen.lat, chosen.lon);
    }

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      deliveryFee: calculateDeliveryFee(distanceKm),
      floristName: chosen.businessName || chosen.name || "Florist",
      floristId: chosen._id,
      floristLat: chosen.lat ?? (customerGeo?.lat ?? 0),
      floristLon: chosen.lon ?? (customerGeo?.lon ?? 0),
      customerLat: customerGeo?.lat ?? 0,
      customerLon: customerGeo?.lon ?? 0,
    };
  } catch (error) {
    console.error("pickFallbackFlorist error:", error);
    return null;
  }
}

/**
 * Geocode an address using OpenStreetMap Nominatim API
 */
async function geocodeAddress(address: string) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await (globalThis as any).fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "Blomm-Daya-App/1.0",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        country: data[0].country_code || data[0].country,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on distance
 * Base price: 120 kr
 * After 5 km: +15 kr per km
 */
function calculateDeliveryFee(distanceKm: number): number {
  const BASE_PRICE = 120;
  const PRICE_PER_KM = 15;
  const FREE_DISTANCE = 5;

  if (distanceKm <= FREE_DISTANCE) {
    return BASE_PRICE;
  }

  const extraKm = distanceKm - FREE_DISTANCE;
  return BASE_PRICE + (extraKm * PRICE_PER_KM);
}