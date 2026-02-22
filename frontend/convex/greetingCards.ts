import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

// Greeting templates by occasion (used if AI fails)
const GREETING_TEMPLATES: Record<string, Record<string, string[]>> = {
  birthday: {
    uk: [
      "Вітаю з Днем народження! Нехай цей день принесе тобі радість, щастя та здійснення всіх мрій!",
      "З Днем народження! Бажаю тобі яскравих емоцій, теплих обіймів та незабутніх моментів!",
      "Хай кожен новий день приносить радість, а цей особливий день стане початком чогось прекрасного!",
    ],
    en: [
      "Happy Birthday! May this special day bring you joy, happiness and all your dreams come true!",
      "Wishing you a wonderful Birthday filled with love, laughter and beautiful moments!",
      "Happy Birthday! May your day be as special as you are!",
    ],
    sv: [
      "Grattis på födelsedagen! Må denna dag ge dig glädje och lycka!",
      "Grattis! Önskar dig en underbar dag fylld med kärlek och skratt!",
      "Grattis på din födelsedag! Må alla dina drömmar bli sanna!",
    ],
  },
  wedding: {
    uk: [
      "Вітаю з весіллям! Нехай ваше кохання буде вічним, а щастя безмежним!",
      "Бажаю вам довгого та щасливого подружнього життя, наповненого любов'ю та взаєморозумінням!",
    ],
    en: [
      "Congratulations on your wedding! May your love be eternal and your happiness boundless!",
      "Wishing you a lifetime of love, joy and happiness together!",
    ],
    sv: [
      "Grattis till bröllopet! Må er kärlek vara evig och lyckan gränslös!",
      "Önskar er ett liv fyllt av kärlek och lycka tillsammans!",
    ],
  },
  anniversary: {
    uk: [
      "Вітаю з річницею! Нехай кожен наступний рік буде ще кращим за попередній!",
      "З річницею! Бажаю вам ще багато років разом, наповнених любов'ю та щастям!",
    ],
    en: [
      "Happy Anniversary! May each year together be better than the last!",
      "Congratulations on your anniversary! Wishing you many more years of love and happiness!",
    ],
    sv: [
      "Grattis på årsdagen! Må varje år tillsammans bli bättre än det förra!",
      "Grattis till er årsdag! Önskar er många fler år av kärlek och lycka!",
    ],
  },
  thank_you: {
    uk: [
      "Дякую тобі від усього серця! Твоя доброта не залишилась непоміченою!",
      "Щиро дякую за все! Ти особлива людина!",
    ],
    en: [
      "Thank you from the bottom of my heart! Your kindness means the world to me!",
      "Sincere thanks for everything! You are truly special!",
    ],
    sv: [
      "Tack från botten av mitt hjärta! Din vänlighet betyder allt för mig!",
      "Stort tack för allt! Du är verkligen speciell!",
    ],
  },
  sympathy: {
    uk: [
      "Прийміть мої щирі співчуття. Нехай квіти принесуть трохи світла в цей важкий час.",
      "З глибоким співчуттям. Пам'ять про рідних живе вічно в наших серцях.",
    ],
    en: [
      "Please accept my sincere condolences. May these flowers bring some light during this difficult time.",
      "With deepest sympathy. The memory of loved ones lives forever in our hearts.",
    ],
    sv: [
      "Ta emot mitt uppriktiga deltagande. Må dessa blommor ge lite ljus under denna svåra tid.",
      "Med djupaste sympati. Minnet av nära och kära lever för evigt i våra hjärtan.",
    ],
  },
  romantic: {
    uk: [
      "Ти — моє все! Ці квіти — лише маленький знак моєї безмежної любові до тебе!",
      "Кохаю тебе більше, ніж слова можуть передати!",
    ],
    en: [
      "You are my everything! These flowers are just a small token of my endless love for you!",
      "I love you more than words can express!",
    ],
    sv: [
      "Du är mitt allt! Dessa blommor är bara en liten symbol för min oändliga kärlek till dig!",
      "Jag älskar dig mer än ord kan uttrycka!",
    ],
  },
  congratulations: {
    uk: [
      "Вітаю! Ти заслуговуєш на все найкраще! Нехай успіх супроводжує тебе завжди!",
      "Щиро вітаю з цим досягненням! Ти неймовірна людина!",
    ],
    en: [
      "Congratulations! You deserve the best! May success always be with you!",
      "Heartfelt congratulations on this achievement! You are amazing!",
    ],
    sv: [
      "Grattis! Du förtjänar det bästa! Må framgång alltid följa dig!",
      "Hjärtliga gratulationer till denna prestation! Du är fantastisk!",
    ],
  },
  new_baby: {
    uk: [
      "Вітаю з народженням малюка! Нехай він приносить вам лише радість та щастя!",
      "Ласкаво просимо до світу, маленьке диво! Бажаю здоров'я та щастя всій родині!",
    ],
    en: [
      "Congratulations on the new baby! May they bring you only joy and happiness!",
      "Welcome to the world, little miracle! Wishing health and happiness to the whole family!",
    ],
    sv: [
      "Grattis till den nya bebisen! Må de ge er bara glädje och lycka!",
      "Välkommen till världen, lilla mirakel! Önskar hälsa och lycka till hela familjen!",
    ],
  },
};

// Get random greeting from templates
function getRandomGreeting(occasion: string, language: string): string {
  const occasionTemplates = GREETING_TEMPLATES[occasion] || GREETING_TEMPLATES["congratulations"];
  const langTemplates = occasionTemplates[language] || occasionTemplates["en"] || [];
  
  if (langTemplates.length === 0) {
    return language === "uk" 
      ? "Найкращі побажання!" 
      : language === "sv" 
        ? "Bästa önskningar!" 
        : "Best wishes!";
  }
  
  return langTemplates[Math.floor(Math.random() * langTemplates.length)];
}

// Generate greeting card (uses templates, can be enhanced with AI later)
export const generateGreeting = mutation({
  args: {
    buyerDeviceId: v.string(),
    occasion: v.string(),
    recipientName: v.string(),
    senderName: v.optional(v.string()),
    language: v.string(),
    orderId: v.optional(v.id("buyerOrders")),
  },
  returns: v.object({
    cardId: v.id("greetingCards"),
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get greeting text
    let greetingText = getRandomGreeting(args.occasion.toLowerCase(), args.language);
    
    // Personalize with name
    if (args.recipientName) {
      const dearPrefix = args.language === "uk" 
        ? `Дорогий/а ${args.recipientName}!\n\n`
        : args.language === "sv"
          ? `Kära ${args.recipientName}!\n\n`
          : `Dear ${args.recipientName}!\n\n`;
      greetingText = dearPrefix + greetingText;
    }
    
    // Add sender name
    if (args.senderName) {
      const withLove = args.language === "uk"
        ? `\n\nЗ любов'ю,\n${args.senderName}`
        : args.language === "sv"
          ? `\n\nMed kärlek,\n${args.senderName}`
          : `\n\nWith love,\n${args.senderName}`;
      greetingText += withLove;
    }

    // Save to database
    const cardId = await ctx.db.insert("greetingCards", {
      buyerDeviceId: args.buyerDeviceId,
      orderId: args.orderId,
      occasion: args.occasion,
      recipientName: args.recipientName,
      senderName: args.senderName,
      generatedText: greetingText,
      language: args.language,
      createdAt: Date.now(),
    });

    return { cardId, text: greetingText };
  },
});

// Update greeting card with custom text
export const updateGreetingText = mutation({
  args: {
    cardId: v.id("greetingCards"),
    customText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cardId, { customText: args.customText });
    return null;
  },
});

// Get greeting card
export const getGreetingCard = query({
  args: {
    cardId: v.id("greetingCards"),
  },
  returns: v.union(
    v.object({
      _id: v.id("greetingCards"),
      occasion: v.string(),
      recipientName: v.string(),
      senderName: v.optional(v.string()),
      generatedText: v.string(),
      customText: v.optional(v.string()),
      language: v.string(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return null;
    
    return {
      _id: card._id,
      occasion: card.occasion,
      recipientName: card.recipientName,
      senderName: card.senderName,
      generatedText: card.generatedText,
      customText: card.customText,
      language: card.language,
      createdAt: card.createdAt,
    };
  },
});

// Get user's greeting cards history
export const getMyGreetingCards = query({
  args: {
    buyerDeviceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("greetingCards"),
    occasion: v.string(),
    recipientName: v.string(),
    generatedText: v.string(),
    customText: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("greetingCards")
      .withIndex("by_buyerDeviceId", (q) => q.eq("buyerDeviceId", args.buyerDeviceId))
      .order("desc")
      .take(args.limit || 20);

    return cards.map((c) => ({
      _id: c._id,
      occasion: c.occasion,
      recipientName: c.recipientName,
      generatedText: c.generatedText,
      customText: c.customText,
      createdAt: c.createdAt,
    }));
  },
});

// Get available occasions
export const getOccasions = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    nameUk: v.string(),
    nameEn: v.string(),
    nameSv: v.string(),
    icon: v.string(),
  })),
  handler: async () => {
    return [
      { id: "birthday", nameUk: "День народження", nameEn: "Birthday", nameSv: "Födelsedag", icon: "gift-outline" },
      { id: "wedding", nameUk: "Весілля", nameEn: "Wedding", nameSv: "Bröllop", icon: "heart-outline" },
      { id: "anniversary", nameUk: "Річниця", nameEn: "Anniversary", nameSv: "Årsdag", icon: "wine-outline" },
      { id: "romantic", nameUk: "Романтика", nameEn: "Romantic", nameSv: "Romantik", icon: "rose-outline" },
      { id: "thank_you", nameUk: "Подяка", nameEn: "Thank You", nameSv: "Tack", icon: "hand-left-outline" },
      { id: "sympathy", nameUk: "Співчуття", nameEn: "Sympathy", nameSv: "Sympati", icon: "flower-outline" },
      { id: "congratulations", nameUk: "Вітання", nameEn: "Congratulations", nameSv: "Grattis", icon: "trophy-outline" },
      { id: "new_baby", nameUk: "Новонароджений", nameEn: "New Baby", nameSv: "Nyfött barn", icon: "balloon-outline" },
    ];
  },
});
