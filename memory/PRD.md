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

## Feature Flags System
Feature flags are stored in `platformSettings` table with keys prefixed `feature_`. 

Available flags:
- feature_subscriptions
- feature_consultations
- feature_gift_certificates
- feature_ai_chat
- feature_referral_program
- feature_loyalty_program
- feature_stories
- feature_order_tracking
- feature_reviews
- feature_push_notifications
- feature_promo_codes
- feature_multi_language
- feature_dark_mode
- feature_offline_mode
- feature_analytics
- feature_calendar
- feature_delivery_zones
- feature_express_delivery
- feature_scheduled_delivery
- feature_reminders

## Environment Variables
- `EXPO_PUBLIC_CONVEX_URL` - Convex deployment URL
- `ADMIN_PASSWORD` - Admin panel password (set in Convex dashboard)
- `EMERGENT_LLM_KEY` - API key for AI chatbot
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature

## Last Updated
February 2025

## Backlog

### P1 - High Priority
- [ ] Search and filters for flower catalog
- [ ] Dark mode implementation

### P2 - Medium Priority
- [ ] Expanded florist analytics
- [ ] Performance optimizations

### P3 - Low Priority
- [ ] Referral program v2
- [ ] Offline mode improvements
- [ ] Test coverage improvements

## Known Issues
- Expo tunnel may fail due to ngrok issues (external dependency)
- TypeScript errors in test files (missing Jest dev dependencies)
- Image resizeMode deprecation warnings
