# Blomm-Daya - Product Requirements Document

## Original Problem Statement
Mobile flower shop application "Blomm-Daya" built with Expo/React Native and Convex backend. The application serves both buyers (customers) and florists (sellers) with features for ordering flowers, tracking deliveries, and managing flower shops.

## User Personas
1. **Buyers** - Customers who browse, order flowers, and track deliveries
2. **Florists** - Flower shop owners who manage inventory, orders, and communicate with customers
3. **Admin** - Platform administrators who manage the entire marketplace

## Core Features

### Implemented Features
- [x] User authentication (Buyer and Florist)
- [x] Flower catalog browsing
- [x] Shopping cart and checkout
- [x] Order management
- [x] Florist dashboard
- [x] Reviews and ratings
- [x] Push notifications
- [x] Multi-language support (UK, EN, SV)
- [x] Stripe Connect payments
- [x] Loyalty program
- [x] Promo codes
- [x] Subscriptions (recurring orders)
- [x] Consultations (buyer-florist chat)
- [x] **Delivery Tracking** - Real-time order status tracking
- [x] **Gift Certificates** - Purchase and redeem gift certificates
- [x] **AI Chatbot** - LLM-powered assistant for flower recommendations
- [x] **Feature Flags System** - Dynamic feature management via admin panel
- [x] **Advanced Filters** - Price, occasion, color, rating, sorting filters for flower catalog (NEW)
- [x] **Florist Analytics Dashboard** - Revenue, orders, top products, customer analytics (NEW)

### Web Admin Panel Features (convex/http.ts)
- [x] Florist applications management
- [x] Financial analytics
- [x] Orders management with status updates
- [x] Order details view
- [x] Reviews moderation
- [x] Buyers management
- [x] Full florists management
- [x] CSV export (orders, buyers, florists)
- [x] Categories management
- [x] Platform settings
- [x] Promo codes management
- [x] FAQ management
- [x] Subscriptions overview
- [x] System messages/broadcasts
- [x] Push notifications management
- [x] Stories moderation
- [x] Consultations overview
- [x] Delivery zones
- [x] Real-time metrics
- [x] Fraud detection alerts
- [x] Audit logs
- [x] Banners management
- [x] Seasonal events
- [x] Referrals management
- [x] Cohort analysis
- [x] Reports
- [x] SLA monitoring
- [x] Low ratings alerts
- [x] **Feature Flags management** (`/admin/features`)

## Technical Architecture

### Frontend (Expo/React Native)
- Location: `/app/frontend`
- Entry point: `App.tsx`
- Screens: `/app/frontend/screens/`
- Shared lib: `/app/frontend/lib/`
- Convex functions: `/app/frontend/convex/`

### Backend (FastAPI)
- Location: `/app/backend`
- Purpose: Proxy for AI chatbot (LLM calls)
- Endpoint: `/api/chat`

### Database (Convex)
- Schema: `/app/frontend/convex/schema.ts`
- Key tables: buyers, florists, buyerOrders, flowers, gifts, giftCertificates, platformSettings

### Key Files
- `App.tsx` - Main navigation and auth
- `convex/http.ts` - Web admin panel
- `convex/admin.ts` - Admin backend functions
- `lib/useFeatureFlags.ts` - Feature flags hook
- `screens/AdvancedFiltersModal.tsx` - Advanced filters UI (NEW)
- `screens/FloristAnalyticsScreen.tsx` - Analytics dashboard (NEW)

## New Features (February 2025)

### Advanced Filters for Catalog
- Price range slider (min/max)
- Occasion filters: Birthday, Wedding, Anniversary, Romantic, Sympathy, Congratulations, Thank You, New Baby
- Color filters: Red, Pink, White, Yellow, Orange, Purple, Blue, Mixed
- Rating filter
- Sorting: Relevance, Price (asc/desc), Rating, Newest
- **Controlled by feature flag**: `feature_advanced_filters`

### Florist Analytics Dashboard
- Period selector: Week, Month, Quarter, Year
- Key metrics: Revenue, Orders, Average Order, Delivery Rate
- Growth comparison with previous period
- Sales chart by time period
- Orders by status breakdown
- Top 5 products by revenue
- Customer analysis: New vs Returning
- Historical comparison
- **Controlled by feature flag**: `feature_analytics`

## Feature Flags System
All features can be enabled/disabled from the admin panel at `/admin/features`.

### Available Feature Flags (21 total):
| Flag | Description | Category |
|------|-------------|----------|
| `feature_subscriptions` | Підписки на квіти | Покупці |
| `feature_consultations` | Консультації з флористами | Комунікація |
| `feature_gift_certificates` | Подарункові сертифікати | Покупці |
| `feature_ai_chat` | AI Чат-бот | AI |
| `feature_referral_program` | Реферальна програма | Маркетинг |
| `feature_loyalty_program` | Програма лояльності | Маркетинг |
| `feature_stories` | Stories флористів | Флористи |
| `feature_order_tracking` | Трекінг замовлень | Замовлення |
| `feature_reviews` | Відгуки | Покупці |
| `feature_push_notifications` | Push-сповіщення | Комунікація |
| `feature_promo_codes` | Промокоди | Маркетинг |
| `feature_multi_language` | Багатомовність | Система |
| `feature_dark_mode` | Темна тема | Система |
| `feature_offline_mode` | Офлайн режим | Система |
| `feature_analytics` | Аналітика для флористів | Флористи |
| `feature_calendar` | Календар замовлень | Флористи |
| `feature_delivery_zones` | Зони доставки | Замовлення |
| `feature_express_delivery` | Експрес-доставка | Замовлення |
| `feature_scheduled_delivery` | Запланована доставка | Замовлення |
| `feature_reminders` | Нагадування про події | Покупці |
| `feature_advanced_filters` | Розширені фільтри | Покупці |

## Environment Variables
- `EXPO_PUBLIC_CONVEX_URL` - Convex deployment URL
- `ADMIN_PASSWORD` - Admin panel password (set in Convex dashboard)
- `EMERGENT_LLM_KEY` - API key for AI chatbot
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature

## Last Updated
February 2025

## Recent Changes (Latest Session)
- ✅ Implemented Dark Mode with ThemeProvider
- ✅ Added theme toggle in Settings screen (controlled by feature flag)
- ✅ Translations for dark mode added (UK, EN, SV)
- ✅ All colors dynamically switch based on theme
- ✅ **Referral Program v2** - Full referral system with codes, stats, sharing
- ✅ **Offline Mode** - Cache system with queue for offline actions
- ✅ **Backend Tests** - 8 pytest tests for API endpoints (all passing)

## New Components Added
- `ReferralProgramScreen.tsx` - Full referral UI with stats and sharing
- `convex/referrals.ts` - Backend functions for referral management
- `lib/useOffline.ts` - Offline cache and sync hooks
- `backend/tests/test_api.py` - Backend API tests

## Backlog

### P1 - High Priority
- [ ] Dark mode implementation

### P2 - Medium Priority
- [ ] Performance optimizations
- [ ] Offline mode improvements

### P3 - Low Priority  
- [ ] Referral program v2
- [ ] Test coverage improvements

## Known Issues
- Expo tunnel may fail due to ngrok issues (external dependency)
- TypeScript errors in test files (missing Jest dev dependencies)
- Image resizeMode deprecation warnings
