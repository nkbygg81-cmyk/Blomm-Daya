import { action } from "./_generated/server";
import { v } from "convex/values";

/**
* Geocode an address using OpenStreetMap Nominatim API (free, no API key needed)
*/
export const geocodeAddress = action({
args: {
address: v.string(),
},
returns: v.union(
v.object({
lat: v.number(),
lon: v.number(),
displayName: v.string(),
}),
v.null()
),
handler: async (ctx, args) => {
try {
const encodedAddress = encodeURIComponent(args.address);
const response = await (globalThis as any).fetch(
`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
{
headers: {
"User-Agent": "Blomm-Daya-App/1.0",
},
}
);

if (!response.ok) {
console.error("Geocoding API error:", response.statusText);
return null;
}

const data = await response.json();

if (data && data.length > 0) {
return {
lat: parseFloat(data[0].lat),
lon: parseFloat(data[0].lon),
displayName: data[0].display_name,
};
}

return null;
} catch (error) {
console.error("Geocoding error:", error);
return null;
}
},
});

/**
* Calculate distance between two points using Haversine formula
* Returns distance in kilometers
*/
export const calculateDistance = action({
args: {
lat1: v.number(),
lon1: v.number(),
lat2: v.number(),
lon2: v.number(),
},
returns: v.number(),
handler: async (ctx, args) => {
const R = 6371; // Earth's radius in km
const dLat = toRad(args.lat2 - args.lat1);
const dLon = toRad(args.lon2 - args.lon1);

const a =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos(toRad(args.lat1)) *
Math.cos(toRad(args.lat2)) *
Math.sin(dLon / 2) *
Math.sin(dLon / 2);

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const distance = R * c;

return Math.round(distance * 10) / 10; // Round to 1 decimal
},
});

function toRad(degrees: number): number {
return degrees * (Math.PI / 180);
}

/**
* Calculate delivery fee based on distance
* Free for < 5km
* 50 kr for 5-10km
* 100 kr for 10-20km
* 150 kr for > 20km
*/
export const calculateDeliveryFee = action({
args: {
distanceKm: v.number(),
},
returns: v.number(),
handler: async (ctx, args) => {
if (args.distanceKm < 5) return 0;
if (args.distanceKm < 10) return 50;
if (args.distanceKm < 20) return 100;
return 150;
},
});

/**
 * Get city from postal code using Nominatim reverse geocoding
 */
export const getCityFromPostalCode = action({
  args: {
    postalCode: v.string(),
    country: v.string(),
  },
  returns: v.union(
    v.object({
      city: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    try {
      // Use Nominatim API to lookup by postal code.
      // NOTE: We request `addressdetails=1` so the response includes city/town/village fields.
      const countryCode = args.country.trim().toLowerCase();
      const response = await (globalThis as any).fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&postalcode=${encodeURIComponent(args.postalCode.trim())}&countrycodes=${encodeURIComponent(countryCode)}&limit=1`,
        {
          headers: {
            "User-Agent": "FloristApp/1.0",
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) {
        console.error("Nominatim API error:", response.status);
        return null;
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        return null;
      }

      const result = results[0];
      const address = result.address || {};

      // Extract city from different address components depending on country
      let city = "";

      if (address.city) {
        city = address.city;
      } else if (address.town) {
        city = address.town;
      } else if (address.village) {
        city = address.village;
      } else if (address.municipality) {
        city = address.municipality;
      } else if (address.county) {
        city = address.county;
      }

      if (city) {
        return { city };
      }

      return null;
    } catch (error) {
      console.error("Error geocoding postal code:", error);
      return null;
    }
  },
});