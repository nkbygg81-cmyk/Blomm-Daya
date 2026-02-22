import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default categories to seed
const DEFAULT_CATEGORIES = [
  // Occasions
  { name: "Birthday", nameUk: "День народження", nameSv: "Födelsedag", type: "occasion", icon: "gift-outline", color: "#EC4899", sortOrder: 1, active: true },
  { name: "Wedding", nameUk: "Весілля", nameSv: "Bröllop", type: "occasion", icon: "heart-outline", color: "#EF4444", sortOrder: 2, active: true },
  { name: "Anniversary", nameUk: "Річниця", nameSv: "Årsdag", type: "occasion", icon: "wine-outline", color: "#8B5CF6", sortOrder: 3, active: true },
  { name: "Romantic", nameUk: "Романтика", nameSv: "Romantik", type: "occasion", icon: "rose-outline", color: "#F43F5E", sortOrder: 4, active: true },
  { name: "Sympathy", nameUk: "Співчуття", nameSv: "Sympati", type: "occasion", icon: "flower-outline", color: "#6B7280", sortOrder: 5, active: true },
  { name: "Congratulations", nameUk: "Вітання", nameSv: "Grattis", type: "occasion", icon: "trophy-outline", color: "#F59E0B", sortOrder: 6, active: true },
  { name: "Thank You", nameUk: "Подяка", nameSv: "Tack", type: "occasion", icon: "hand-left-outline", color: "#10B981", sortOrder: 7, active: true },
  { name: "New Baby", nameUk: "Новонароджений", nameSv: "Nyfött barn", type: "occasion", icon: "balloon-outline", color: "#60A5FA", sortOrder: 8, active: true },
  { name: "Home Decor", nameUk: "Для дому", nameSv: "Heminredning", type: "occasion", icon: "home-outline", color: "#84CC16", sortOrder: 9, active: true },
  { name: "Corporate", nameUk: "Корпоративні", nameSv: "Företag", type: "occasion", icon: "briefcase-outline", color: "#0EA5E9", sortOrder: 10, active: true },
  { name: "Potted Plants", nameUk: "Рослини в горщиках", nameSv: "Krukväxter", type: "occasion", icon: "leaf-outline", color: "#22C55E", sortOrder: 11, active: true },
  { name: "Seasonal", nameUk: "Сезонні", nameSv: "Säsong", type: "occasion", icon: "calendar-outline", color: "#F97316", sortOrder: 12, active: true },
  { name: "New Year", nameUk: "Новий рік", nameSv: "Nyår", type: "occasion", icon: "sparkles-outline", color: "#EAB308", sortOrder: 13, active: true },
  { name: "March 8", nameUk: "8 Березня", nameSv: "8 Mars", type: "occasion", icon: "female-outline", color: "#EC4899", sortOrder: 14, active: true },
  { name: "Valentine's Day", nameUk: "День Валентина", nameSv: "Alla hjärtans dag", type: "occasion", icon: "heart", color: "#DC2626", sortOrder: 15, active: true },
  
  // Flower types
  { name: "Roses", nameUk: "Троянди", nameSv: "Rosor", type: "flower", icon: "rose", color: "#DC2626", sortOrder: 1, active: true },
  { name: "Tulips", nameUk: "Тюльпани", nameSv: "Tulpaner", type: "flower", icon: "flower", color: "#F472B6", sortOrder: 2, active: true },
  { name: "Lilies", nameUk: "Лілії", nameSv: "Liljor", type: "flower", icon: "flower-outline", color: "#FBBF24", sortOrder: 3, active: true },
  { name: "Orchids", nameUk: "Орхідеї", nameSv: "Orkidéer", type: "flower", icon: "flower", color: "#A855F7", sortOrder: 4, active: true },
  { name: "Sunflowers", nameUk: "Соняшники", nameSv: "Solrosor", type: "flower", icon: "sunny", color: "#FBBF24", sortOrder: 5, active: true },
  { name: "Mixed Bouquet", nameUk: "Мікс букет", nameSv: "Blandad bukett", type: "flower", icon: "color-palette", color: "#8B5CF6", sortOrder: 6, active: true },
];

// Get all categories
export const getAllCategories = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("categories"),
    name: v.string(),
    nameUk: v.string(),
    nameSv: v.optional(v.string()),
    type: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .collect();
    
    return categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => ({
      ...cat,
      type: cat.type as string,
    }));
  },
});

// Get active categories by type
export const getActiveCategories = query({
  args: {
    type: v.optional(v.union(v.literal("flower"), v.literal("gift"), v.literal("occasion"))),
  },
  returns: v.array(v.object({
    _id: v.id("categories"),
    name: v.string(),
    nameUk: v.string(),
    nameSv: v.optional(v.string()),
    type: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
  })),
  handler: async (ctx, args) => {
    let categories;
    
    if (args.type) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_type_and_active", (q) => q.eq("type", args.type!).eq("active", true))
        .collect();
    } else {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_active", (q) => q.eq("active", true))
        .collect();
    }
    
    return categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => ({
      _id: cat._id,
      name: cat.name,
      nameUk: cat.nameUk,
      nameSv: cat.nameSv,
      type: cat.type as string,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
    }));
  },
});

// Seed default categories
export const seedCategories = mutation({
  args: {},
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    let added = 0;
    let skipped = 0;

    for (const cat of DEFAULT_CATEGORIES) {
      // Check if category with this name already exists
      const existing = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("name"), cat.name))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("categories", {
        ...cat,
        type: cat.type as "flower" | "gift" | "occasion",
        createdAt: Date.now(),
      });
      added++;
    }

    return { added, skipped };
  },
});

// Add new category
export const addCategory = mutation({
  args: {
    name: v.string(),
    nameUk: v.string(),
    nameSv: v.optional(v.string()),
    type: v.union(v.literal("flower"), v.literal("gift"), v.literal("occasion")),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    // Get max sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const categories = await ctx.db.query("categories").collect();
      sortOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.sortOrder)) + 1 
        : 1;
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      nameUk: args.nameUk,
      nameSv: args.nameSv,
      type: args.type,
      icon: args.icon,
      color: args.color,
      sortOrder,
      active: args.active ?? true,
      createdAt: Date.now(),
    });
  },
});

// Update category
export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    nameUk: v.optional(v.string()),
    nameSv: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    const updateData: any = { updatedAt: Date.now() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.nameUk !== undefined) updateData.nameUk = updates.nameUk;
    if (updates.nameSv !== undefined) updateData.nameSv = updates.nameSv;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
    if (updates.active !== undefined) updateData.active = updates.active;

    await ctx.db.patch(id, updateData);
    return null;
  },
});

// Toggle category active status
export const toggleCategory = mutation({
  args: {
    id: v.id("categories"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found");

    const newActive = !category.active;
    await ctx.db.patch(args.id, { 
      active: newActive,
      updatedAt: Date.now(),
    });
    
    return newActive;
  },
});

// Delete category
export const deleteCategory = mutation({
  args: {
    id: v.id("categories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Reorder categories
export const reorderCategories = mutation({
  args: {
    orders: v.array(v.object({
      id: v.id("categories"),
      sortOrder: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const item of args.orders) {
      await ctx.db.patch(item.id, { 
        sortOrder: item.sortOrder,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
