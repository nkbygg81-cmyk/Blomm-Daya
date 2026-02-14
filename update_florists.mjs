// Script to update florist data directly via Convex client
import { ConvexClient } from "convex/browser";

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function fixData() {
try {
// Update florist 1
const result1 = await client.mutation(florists.updateProfile, {
floristId: "qn7f3wvyh3kpby6cv69gmqrgmd80fs2c",
businessName: "daviols blomm och design",
city: "Enskede",
});
console.log("Fixed florist 1:", result1);

// Update florist 2
const result2 = await client.mutation(florists.updateCoordinates, {
floristId: "qn7aaz2c2fjg9w2eettt6cr8sx80fres",
lat: 59.3293,
lon: 18.0686,
});
console.log("Fixed florist 2:", result2);
} catch (e) {
console.error("Error:", e);
}
}

fixData();
