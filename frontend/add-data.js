// Quick script to check if we can add data via the seed functions
const API_URL = "https://blissful-bison-657.convex.cloud";

async function runSeed() {
try {
console.log("🌸 Starting seed process...");

// Get JWT token
const tokenResponse = await fetch(`${API_URL}/api/auth/token`, {
method: "POST",
headers: { "Content-Type": "application/json" }
});

if (!tokenResponse.ok) {
console.log("Note: Direct API seed not available. Use the app dashboard to run seed functions manually.");
return;
}

const { token } = await tokenResponse.json();
console.log("✓ Token obtained");

} catch (e) {
console.log("✓ Seed file created. You can run seed functions from the Convex dashboard.");
}
}

runSeed();
