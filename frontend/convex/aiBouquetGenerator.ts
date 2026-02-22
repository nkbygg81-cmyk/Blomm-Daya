import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Bouquet style presets
const BOUQUET_STYLES = {
  classic: {
    name: "Класичний",
    description: "Елегантний та витончений",
    colors: ["red", "white", "pink"],
    flowers: ["roses", "lilies", "carnations"],
  },
  modern: {
    name: "Сучасний",
    description: "Мінімалістичний та стильний",
    colors: ["white", "green", "purple"],
    flowers: ["calla", "orchids", "protea"],
  },
  romantic: {
    name: "Романтичний",
    description: "Ніжний та милий",
    colors: ["pink", "peach", "lavender"],
    flowers: ["roses", "peonies", "ranunculus"],
  },
  wild: {
    name: "Польовий",
    description: "Природний та свіжий",
    colors: ["yellow", "orange", "blue"],
    flowers: ["sunflowers", "daisies", "wildflowers"],
  },
  luxury: {
    name: "Люкс",
    description: "Вишуканий та розкішний",
    colors: ["burgundy", "gold", "deep_purple"],
    flowers: ["garden_roses", "orchids", "calla"],
  },
};

// Save AI bouquet generation request
export const saveBouquetRequest = mutation({
  args: {
    buyerDeviceId: v.string(),
    prompt: v.string(),
    style: v.optional(v.string()),
    occasion: v.optional(v.string()),
    budget: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
  },
  returns: v.id("aiBouquetRequests"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiBouquetRequests", {
      buyerDeviceId: args.buyerDeviceId,
      prompt: args.prompt,
      style: args.style,
      occasion: args.occasion,
      budget: args.budget,
      colors: args.colors,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get bouquet styles
export const getBouquetStyles = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    colors: v.array(v.string()),
  })),
  handler: async () => {
    return Object.entries(BOUQUET_STYLES).map(([id, style]) => ({
      id,
      name: style.name,
      description: style.description,
      colors: style.colors,
    }));
  },
});

// Generate bouquet suggestions based on prompt
export const generateBouquetSuggestions = mutation({
  args: {
    buyerDeviceId: v.string(),
    prompt: v.string(),
    style: v.optional(v.string()),
    budget: v.optional(v.number()),
    occasion: v.optional(v.string()),
  },
  returns: v.object({
    requestId: v.id("aiBouquetRequests"),
    suggestions: v.array(v.object({
      name: v.string(),
      description: v.string(),
      estimatedPrice: v.number(),
      flowers: v.array(v.string()),
      colors: v.array(v.string()),
      matchingProducts: v.array(v.object({
        id: v.string(),
        name: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
      })),
    })),
  }),
  handler: async (ctx, args) => {
    // Save request
    const requestId = await ctx.db.insert("aiBouquetRequests", {
      buyerDeviceId: args.buyerDeviceId,
      prompt: args.prompt,
      style: args.style,
      budget: args.budget,
      occasion: args.occasion,
      status: "completed",
      createdAt: Date.now(),
    });

    // Get all flowers
    const allFlowers = await ctx.db
      .query("flowers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Parse prompt for keywords
    const promptLower = args.prompt.toLowerCase();
    const keywords = {
      romantic: promptLower.includes("романт") || promptLower.includes("кохан") || promptLower.includes("валентин"),
      birthday: promptLower.includes("день народження") || promptLower.includes("birthday"),
      wedding: promptLower.includes("весіл") || promptLower.includes("шлюб"),
      sympathy: promptLower.includes("співчут") || promptLower.includes("прощ"),
      bright: promptLower.includes("яскрав") || promptLower.includes("bright"),
      pastel: promptLower.includes("ніжн") || promptLower.includes("пастел"),
      red: promptLower.includes("черв") || promptLower.includes("red"),
      white: promptLower.includes("біл") || promptLower.includes("white"),
      pink: promptLower.includes("рожев") || promptLower.includes("pink"),
    };

    // Select style based on prompt
    let selectedStyle = args.style || "classic";
    if (keywords.romantic) selectedStyle = "romantic";
    if (keywords.bright) selectedStyle = "wild";
    if (promptLower.includes("люкс") || promptLower.includes("lux")) selectedStyle = "luxury";
    if (promptLower.includes("сучасн") || promptLower.includes("modern")) selectedStyle = "modern";

    const styleConfig = BOUQUET_STYLES[selectedStyle as keyof typeof BOUQUET_STYLES] || BOUQUET_STYLES.classic;

    // Filter flowers by price range
    const budget = args.budget || 1000;
    const maxFlowerPrice = budget * 0.6;
    const filteredFlowers = allFlowers.filter((f) => (f.price || 0) <= maxFlowerPrice);

    // Score flowers based on style and keywords
    const scoredFlowers = filteredFlowers.map((flower) => {
      let score = 0;
      const name = (flower.name + " " + (flower.description || "")).toLowerCase();

      // Style matching
      styleConfig.flowers.forEach((f) => {
        if (name.includes(f)) score += 20;
      });

      // Color preference
      if (keywords.red && (name.includes("черв") || name.includes("red"))) score += 15;
      if (keywords.white && (name.includes("біл") || name.includes("white"))) score += 15;
      if (keywords.pink && (name.includes("рожев") || name.includes("pink"))) score += 15;

      // Occasion matching
      if (keywords.romantic && (name.includes("роз") || name.includes("rose"))) score += 10;
      if (keywords.birthday && name.includes("birthday")) score += 10;

      return { flower, score };
    }).sort((a, b) => b.score - a.score);

    // Generate 3 suggestions
    const suggestions = [];
    const budgetRanges = [
      { min: budget * 0.6, max: budget * 0.8, name: "Оптимальний" },
      { min: budget * 0.8, max: budget, name: "Преміум" },
      { min: budget * 0.4, max: budget * 0.6, name: "Економний" },
    ];

    for (const range of budgetRanges) {
      const rangeFlowers = scoredFlowers
        .filter((sf) => {
          const price = sf.flower.price || 0;
          return price >= range.min * 0.3 && price <= range.max * 0.5;
        })
        .slice(0, 5);

      if (rangeFlowers.length > 0) {
        const totalPrice = rangeFlowers.reduce((sum, sf) => sum + (sf.flower.price || 0), 0);
        
        suggestions.push({
          name: `${styleConfig.name} букет - ${range.name}`,
          description: `${styleConfig.description}. Ідеально підходить для ${args.occasion || "будь-якого приводу"}.`,
          estimatedPrice: Math.min(Math.round(totalPrice * 1.2), range.max),
          flowers: rangeFlowers.map((sf) => sf.flower.name).slice(0, 3),
          colors: styleConfig.colors,
          matchingProducts: rangeFlowers.slice(0, 3).map((sf) => ({
            id: sf.flower._id.toString(),
            name: sf.flower.name,
            price: sf.flower.price || 0,
            imageUrl: sf.flower.imageUrl,
          })),
        });
      }
    }

    // Ensure at least one suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        name: `${styleConfig.name} букет`,
        description: styleConfig.description,
        estimatedPrice: budget,
        flowers: styleConfig.flowers.slice(0, 3),
        colors: styleConfig.colors,
        matchingProducts: [],
      });
    }

    // Update request with results
    await ctx.db.patch(requestId, {
      status: "completed",
      resultCount: suggestions.length,
    });

    return { requestId, suggestions };
  },
});

// Get user's bouquet generation history
export const getMyBouquetRequests = query({
  args: {
    buyerDeviceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("aiBouquetRequests"),
    prompt: v.string(),
    style: v.optional(v.string()),
    occasion: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("aiBouquetRequests")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .order("desc")
      .take(args.limit || 10);

    return requests.map((r) => ({
      _id: r._id,
      prompt: r.prompt,
      style: r.style,
      occasion: r.occasion,
      budget: r.budget,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});
