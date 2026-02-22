import { mutation } from "./_generated/server";
import { v } from "convex/values";

function placeholderImageUrl(text: string, seed: string) {
  // Deterministic placeholder image (safe for demos).
  return `https://api.a0.dev/assets/image?text=${encodeURIComponent(text)}&aspect=1:1&seed=${encodeURIComponent(seed)}`;
}

export const seedFlowers = mutation({
  args: {},
  returns: v.object({ count: v.number(), flowers: v.array(v.string()) }),
  handler: async (ctx) => {
    const flowersToAdd = [
      {
        name: "Red Rose Romance",
        description: "Elegant red roses perfect for special occasions",
        price: 850,
        category: "roses",
        inStock: true,
        imageUrl: placeholderImageUrl("Red roses bouquet", "seed-flower-01"),
      },
      {
        name: "Sunflower Dreams",
        description: "Bright sunflowers to bring joy and warmth",
        price: 650,
        category: "sunflowers",
        inStock: true,
        imageUrl: placeholderImageUrl("Sunflowers bouquet", "seed-flower-02"),
      },
      {
        name: "Tulip Paradise",
        description: "Colorful tulips for spring celebrations",
        price: 750,
        category: "tulips",
        inStock: true,
        imageUrl: placeholderImageUrl("Tulips bouquet", "seed-flower-03"),
      },
      {
        name: "Cherry Blossom Mix",
        description: "Delicate cherry blossoms with greenery",
        price: 950,
        category: "mixed",
        inStock: true,
        imageUrl: placeholderImageUrl("Cherry blossom bouquet", "seed-flower-04"),
      },
      {
        name: "Purple Elegance",
        description: "Beautiful purple orchids and lilac",
        price: 1100,
        category: "orchids",
        inStock: true,
        imageUrl: placeholderImageUrl("Purple orchid bouquet", "seed-flower-05"),
      },
      {
        name: "Peony Perfection",
        description: "Luxurious peonies in full bloom",
        price: 1200,
        category: "peonies",
        inStock: true,
        imageUrl: placeholderImageUrl("Peonies bouquet", "seed-flower-06"),
      },
      {
        name: "Lavender Love",
        description: "Soothing lavender bundle with white flowers",
        price: 700,
        category: "lavender",
        inStock: true,
        imageUrl: placeholderImageUrl("Lavender bouquet", "seed-flower-07"),
      },
      {
        name: "Daisy Delight",
        description: "Fresh daisies perfect for any occasion",
        price: 600,
        category: "daisies",
        inStock: true,
        imageUrl: placeholderImageUrl("Daisies bouquet", "seed-flower-08"),
      },
      {
        name: "Lily Luxury",
        description: "Exotic lilies with strong fragrance",
        price: 900,
        category: "lilies",
        inStock: true,
        imageUrl: placeholderImageUrl("Lilies bouquet", "seed-flower-09"),
      },
      {
        name: "Carnation Celebration",
        description: "Vibrant carnations in festive colors",
        price: 550,
        category: "carnations",
        inStock: true,
        imageUrl: placeholderImageUrl("Carnations bouquet", "seed-flower-10"),
      },
      {
        name: "Hydrangea Heaven",
        description: "Stunning hydrangeas in blue and pink",
        price: 1050,
        category: "hydrangeas",
        inStock: true,
        imageUrl: placeholderImageUrl("Hydrangea bouquet", "seed-flower-11"),
      },
      {
        name: "Iris Inspiration",
        description: "Noble iris flowers with graceful petals",
        price: 800,
        category: "iris",
        inStock: true,
        imageUrl: placeholderImageUrl("Iris bouquet", "seed-flower-12"),
      },
    ];

    const addedIds: string[] = [];

    for (const flower of flowersToAdd) {
      const id = await ctx.db.insert("flowers", {
        ...flower,
        rating: 4.8,
        seeded: true,
        seededType: "demo",
        createdAt: Date.now(),
      });
      addedIds.push(id);
    }

    return { count: addedIds.length, flowers: addedIds };
  },
});

export const seedMoreFlowers = mutation({
  args: {},
  returns: v.object({ count: v.number(), flowers: v.array(v.string()) }),
  handler: async (ctx) => {
    const moreFlowersToAdd = [
      {
        name: "Білі троянди – класична елегантність",
        description: "Розкішний букет з білих троянд. Символ чистоти та невинності. Ідеально підходить для весіль, хрещення та особливих свят",
        price: 899,
        category: "roses",
        inStock: true,
        imageUrl: placeholderImageUrl("White roses bouquet", "seed-flower-more-01"),
      },
      {
        name: "Рожеві троянди у кошику",
        description: "Ніжний букет рожевих троянд у плетеному кошику. Чудова ідея для подарунка на день народження або ювілей",
        price: 1099,
        category: "roses",
        inStock: true,
        imageUrl: placeholderImageUrl("Pink roses in basket", "seed-flower-more-02"),
      },
      {
        name: "Соняшники – літня радість",
        description: "Яскраві соняшники, що дарують позитив та енергію. Відмінний вибір для літніх свят та подяк",
        price: 749,
        category: "sunflowers",
        inStock: true,
        imageUrl: placeholderImageUrl("Sunflowers bouquet", "seed-flower-more-03"),
      },
      {
        name: "Тюльпани мікс – весняна свіжість",
        description: "Райдужний букет з тюльпанів різних кольорів. Символ весни та нового початку",
        price: 699,
        category: "tulips",
        inStock: true,
        imageUrl: placeholderImageUrl("Mixed tulips bouquet", "seed-flower-more-04"),
      },
      {
        name: "Лілії – королівська розкіш",
        description: "Величні білі лілії з тонким ароматом. Елегантний вибір для особливих моментів",
        price: 1199,
        category: "lilies",
        inStock: true,
        imageUrl: placeholderImageUrl("White lilies bouquet", "seed-flower-more-05"),
      },
      {
        name: "Хризантеми – осіння краса",
        description: "Пишні хризантеми в теплих осінніх відтінках. Довготривала свіжість та яскравість",
        price: 649,
        category: "chrysanthemums",
        inStock: true,
        imageUrl: placeholderImageUrl("Chrysanthemums bouquet", "seed-flower-more-06"),
      },
      {
        name: "Гортензія – небесна ніжність",
        description: "Пишні шапки блакитної гортензії. Романтичний та витончений букет",
        price: 1149,
        category: "hydrangeas",
        inStock: true,
        imageUrl: placeholderImageUrl("Blue hydrangea bouquet", "seed-flower-more-07"),
      },
      {
        name: "Дикий луговий мікс",
        description: "Натуральний букет з польових квітів та трав. Свіжість природи у вашому домі",
        price: 599,
        category: "wildflowers",
        inStock: true,
        imageUrl: placeholderImageUrl("Wildflowers bouquet", "seed-flower-more-08"),
      },
      {
        name: "Орхідеї – екзотична краса",
        description: "Вишукані фіолетові орхідеї. Символ розкоші та витонченості",
        price: 1299,
        category: "orchids",
        inStock: true,
        imageUrl: placeholderImageUrl("Purple orchids bouquet", "seed-flower-more-09"),
      },
      {
        name: "Айстри – зоряна чарівність",
        description: "Яскраві айстри різних кольорів. Чудовий осінній букет",
        price: 549,
        category: "asters",
        inStock: true,
        imageUrl: placeholderImageUrl("Asters bouquet", "seed-flower-more-10"),
      },
      {
        name: "Гвоздики – ніжна розкіш",
        description: "Букет рожевих гвоздик з приємним ароматом. Довго зберігає свіжість",
        price: 499,
        category: "carnations",
        inStock: true,
        imageUrl: placeholderImageUrl("Pink carnations bouquet", "seed-flower-more-11"),
      },
      {
        name: "Ранункулюс – шовкова краса",
        description: "Ніжні ранункулюси з багатьма пелюстками. Розкішний весняний букет",
        price: 999,
        category: "ranunculus",
        inStock: true,
        imageUrl: placeholderImageUrl("Ranunculus bouquet", "seed-flower-more-12"),
      },
      {
        name: "Фрезії – весняна свіжість",
        description: "Ароматні фрезії в білих та пастельних тонах. Символ елегантності",
        price: 849,
        category: "freesias",
        inStock: true,
        imageUrl: placeholderImageUrl("Freesias bouquet", "seed-flower-more-13"),
      },
      {
        name: "Півонії – пишна розкіш",
        description: "Розкішні рожеві півонії. Найрозкішніший весняний букет",
        price: 1399,
        category: "peonies",
        inStock: true,
        imageUrl: placeholderImageUrl("Pink peonies bouquet", "seed-flower-more-14"),
      },
      {
        name: "Еустома – ніжна елегантність",
        description: "Витончена еустома в пастельних відтінках. Чудова альтернатива трояндам",
        price: 949,
        category: "lisianthus",
        inStock: true,
        imageUrl: placeholderImageUrl("Lisianthus bouquet", "seed-flower-more-15"),
      },
      {
        name: "Протея – екзотична краса",
        description: "Унікальна південноафриканська протея. Незвичайний та запам'ятовується букет",
        price: 1499,
        category: "protea",
        inStock: true,
        imageUrl: placeholderImageUrl("Protea bouquet", "seed-flower-more-16"),
      },
      {
        name: "Жоржини – осіння пишність",
        description: "Великі яскраві жоржини. Ефектний букет для особливих випадків",
        price: 1099,
        category: "dahlias",
        inStock: true,
        imageUrl: placeholderImageUrl("Dahlias bouquet", "seed-flower-more-17"),
      },
      {
        name: "Альстромерії – тривала краса",
        description: "Яскраві альстромерії, що довго зберігають свіжість. Чудовий вибір для подарунка",
        price: 649,
        category: "alstroemeria",
        inStock: true,
        imageUrl: placeholderImageUrl("Alstroemeria bouquet", "seed-flower-more-18"),
      },
      {
        name: "Нарциси – весняне пробудження",
        description: "Жовті нарциси – перші вісники весни. Дарують радість та оптимізм",
        price: 599,
        category: "daffodils",
        inStock: true,
        imageUrl: placeholderImageUrl("Daffodils bouquet", "seed-flower-more-19"),
      },
      {
        name: "Калли – витончена елегантність",
        description: "Білі калли з вишуканими лініями. Ідеальні для весіль та урочистостей",
        price: 1249,
        category: "calla-lilies",
        inStock: true,
        imageUrl: placeholderImageUrl("Calla lilies bouquet", "seed-flower-more-20"),
      },
    ];

    const addedIds: string[] = [];

    for (const flower of moreFlowersToAdd) {
      const id = await ctx.db.insert("flowers", {
        ...flower,
        rating: 4.7 + Math.random() * 0.3,
        seeded: true,
        seededType: "demo",
        createdAt: Date.now(),
      });
      addedIds.push(id);
    }

    return { count: addedIds.length, flowers: addedIds };
  },
});

export const seedGifts = mutation({
  args: {},
  returns: v.object({ count: v.number(), gifts: v.array(v.string()) }),
  handler: async (ctx) => {
    const giftsToAdd = [
      {
        name: "Luxury Chocolate Box",
        description: "Premium Belgian chocolates assortment",
        price: 450,
        category: "chocolate",
        available: true,
        imageUrl: placeholderImageUrl("Chocolate gift", "seed-gift-01"),
      },
      {
        name: "Teddy Bear Classic",
        description: "Soft and cuddly teddy bear",
        price: 350,
        category: "toys",
        available: true,
        imageUrl: placeholderImageUrl("Teddy bear gift", "seed-gift-02"),
      },
      {
        name: "Scented Candle Set",
        description: "Aromatic candles in luxury packaging",
        price: 550,
        category: "candles",
        available: true,
        imageUrl: placeholderImageUrl("Candle set gift", "seed-gift-03"),
      },
      {
        name: "Wine Lovers Bundle",
        description: "Selection of finest wines",
        price: 1200,
        category: "beverages",
        available: true,
        imageUrl: placeholderImageUrl("Wine gift", "seed-gift-04"),
      },
      {
        name: "Heart-shaped Gift Box",
        description: "Romantic gift box with surprise items",
        price: 600,
        category: "gift-box",
        available: true,
        imageUrl: placeholderImageUrl("Gift box", "seed-gift-05"),
      },
      {
        name: "Bath & Spa Set",
        description: "Luxurious bath products for relaxation",
        price: 700,
        category: "wellness",
        available: true,
        imageUrl: placeholderImageUrl("Spa set gift", "seed-gift-06"),
      },
    ];

    const addedIds: string[] = [];

    for (const gift of giftsToAdd) {
      const id = await ctx.db.insert("gifts", {
        ...gift,
        seeded: true,
        seededType: "demo",
        createdAt: Date.now(),
      });
      addedIds.push(id);
    }

    return { count: addedIds.length, gifts: addedIds };
  },
});

export const cleanupSeededCatalog = mutation({
  args: {},
  returns: v.object({ deletedFlowers: v.number(), deletedGifts: v.number() }),
  handler: async (ctx) => {
    const flowers = await ctx.db.query("flowers").collect();
    const gifts = await ctx.db.query("gifts").collect();

    const isSeededDemo = (doc: any) =>
      doc?.seeded === true ||
      doc?.seededType === "demo" ||
      (typeof doc?.imageUrl === "string" && doc.imageUrl.includes("images.unsplash.com")) ||
      (typeof doc?.image === "string" && doc.image.includes("images.unsplash.com"));

    const flowersToDelete = (flowers as any[]).filter(isSeededDemo);
    const giftsToDelete = (gifts as any[]).filter(isSeededDemo);

    for (const f of flowersToDelete) await ctx.db.delete(f._id);
    for (const g of giftsToDelete) await ctx.db.delete(g._id);

    return { deletedFlowers: flowersToDelete.length, deletedGifts: giftsToDelete.length };
  },
});

export const cleanupSeededFlowers = mutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const flowers = await ctx.db.query("flowers").collect();
    // Delete flowers created at or after timestamp 1770123010120 (seeded flowers)
    const toDelete = flowers.filter((f: any) => f._creationTime >= 1770123010120);
    
    for (const flower of toDelete) {
      await ctx.db.delete(flower._id);
    }
    
    return { deleted: toDelete.length };
  },
});