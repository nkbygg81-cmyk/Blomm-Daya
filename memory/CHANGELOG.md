# Blomm-Daya Changelog

## December 2025 - Session 3 (Fork)

### Critical Bug Fix (P0)
- **Fixed Critical Build Failure**: App was unbuildable due to missing `react-native-worklets` dependency
- Error: `Cannot find module 'react-native-worklets/plugin'`
- Solution: Added `react-native-worklets@0.7.4` and `react-native-worklets-core@1.6.3` to package.json
- Build and Expo now working correctly
- Verified via screenshot: Onboarding, Role Selection, and Buyer Auth screens all functional

---

## December 2025 - Session 2

### Phase 2-5 Backend Implementation (ALL REQUESTED FEATURES)

#### 1. Photo Reviews Backend (P0)
- `convex/photoReviews.ts` - Full CRUD operations
- Functions: submitPhotoReview, getFloristPhotoReviews, getMyPhotoReviews, getPendingPhotoReviews, approvePhotoReview, rejectPhotoReview, getPhotoReviewStats

#### 2. Abandoned Cart System (P1)
- `convex/abandonedCarts.ts` - Cart tracking & recovery
- Functions: saveCartState, markCartConverted, getAbandonedCart, getCartsForReminder, markReminderSent, getAbandonedCartStats, cleanupOldCarts

#### 3. Product Bundles (P1)
- `convex/productBundles.ts` - Bundle management
- Functions: getActiveBundles, getBundle, createBundle, updateBundle, deleteBundle, getFeaturedBundles

#### 4. Delivery Time Slots (P1)
- `convex/deliveryTimeSlots.ts` - Time slot selection
- Functions: getAvailableSlots, bookDeliverySlot, getOrderDeliverySlot, configureFloristSlots, getFloristSlots
- Default slots: Morning, Afternoon, Evening, Late Evening, Express 1h, Express 2h

#### 5. AI Similar Products (P1)
- `convex/similarProducts.ts` - Product recommendations
- Functions: getSimilarProducts, getPersonalizedRecommendations, getTrendingProducts
- Scoring: Category match (+30), Price range (+25), Same florist (+15), Rating (+10)

#### 6. AI Bouquet Generator (P2)
- `convex/aiBouquetGenerator.ts` - AI-powered bouquet suggestions
- Functions: saveBouquetRequest, getBouquetStyles, generateBouquetSuggestions, getMyBouquetRequests
- Styles: Classic, Modern, Romantic, Wild, Luxury

#### 7. AI Review Moderation (P2)
- `convex/aiReviewModeration.ts` - Automated review moderation
- Functions: autoModerateText, autoModerateReview, getPendingReviews, manualApproveReview, manualRejectReview, getModerationStats
- Auto-checks: Banned words, excessive caps, URLs, phone numbers, spam patterns

#### 8. Live Courier Tracking (P1)
- `convex/courierTracking.ts` - Real-time delivery tracking
- Functions: updateCourierLocation, getCourierLocation, startDeliveryTracking, stopDeliveryTracking, getActiveDeliveries, calculateETA
- ETA calculation using Haversine formula

### Database Schema Updates
Added tables:
- abandonedCarts
- productBundles
- deliveryTimeSlots
- deliverySlotBookings
- aiBouquetRequests
- reviewModerations
- courierLocations

### Translations Added (UK, EN, SV)
- abandonedCart.*
- bundles.*
- deliverySlots.*
- similarProducts.*
- aiBouquet.*
- courierTracking.*
- reviewModeration.*

### Frontend UI Components Created (December 2025 - Session 2 cont.)
- `DeliveryTimeSlotsScreen.tsx` - Time slot picker with 7-day date selector
- `ProductBundlesScreen.tsx` - Bundle display with discount badges
- `AIBouquetGeneratorScreen.tsx` - AI-powered bouquet suggestions (5 styles)
- `CourierTrackingScreen.tsx` - Live GPS tracking with ETA
- `SimilarProductsSection.tsx` - Similar, Personalized, and Trending recommendations

### Navigation Integration
- Added routes: ProductBundles, AIBouquetGenerator
- Updated BuyerSettingsScreen with Bundles and AI Bouquet menu items
- Updated App.tsx with new Stack.Screen components

### Deep Integrations (December 2025 - Session 2 Final)
- **Similar Products in FlowerDetailScreen** - Shows recommendations below product details
- **Wishlist button in FlowerDetailScreen** - Heart icon to save/unsave favorites
- **Abandoned Cart in CartContext** - Auto-tracking cart state, marks as converted on order
- **Time Slots in CheckoutScreen** - Modal picker with date/time selection, fee calculation

---

## December 2025 - Session 1

#### Wishlist (Список бажань)
- Added heart button on product cards in BrowseScreen
- Created WishlistScreen with:
  - List view of saved items
  - Add to cart functionality
  - Remove from wishlist
  - Clear all wishlist
- Backend functions: `getWishlist`, `toggleWishlist`, `removeFromWishlist`, `clearWishlist`
- Integrated with Settings navigation
- Full dark mode support
- Files: `WishlistScreen.tsx`, `BrowseScreen.tsx`, `convex/wishlist.ts`

#### AI Greeting Cards (Вітальні листівки)
- Created GreetingCardScreen with:
  - Occasion selection (8 occasions)
  - Multi-language greeting templates (UK, EN, SV)
  - Personalization with recipient/sender names
  - Edit and regenerate functionality
  - History of generated cards
- Occasions: Birthday, Wedding, Anniversary, Romantic, Thank You, Sympathy, Congratulations, New Baby
- Backend functions: `generateGreeting`, `updateGreetingText`, `getMyGreetingCards`, `getOccasions`
- Files: `GreetingCardScreen.tsx`, `convex/greetingCards.ts`

#### Photo Reviews Component
- Created PhotoReviewsScreen with:
  - Upload photos with reviews
  - Rating system with stars
  - Gallery view with fullscreen modal
  - Pending moderation workflow
- Status: UI complete, backend integration MOCKED
- Files: `PhotoReviewsScreen.tsx`, `convex/schema.ts` (photoReviews table)

#### Navigation Integration
- Added Wishlist and Greeting Cards to Settings menu
- Updated BuyerSettingsScreen props
- Updated App.tsx with new Stack screens

#### Translations
- Added translations for all new features in:
  - `lib/i18n/uk.ts` (Ukrainian)
  - `lib/i18n/en.ts` (English)
  - `lib/i18n/sv.ts` (Swedish)
- New translation keys:
  - `wishlist.*`
  - `greetingCards.*`
  - `photoReviews.*`

### Bug Fixes (by Testing Agent)
- Fixed duplicate closing brace in WishlistScreen.tsx
- Removed invalid floristName from CartItem
- Fixed duplicate 'presets' property in translation files

---

## February 2025 (Previous Session)

### Features Implemented
- Dark Mode with ThemeProvider
- Referral Program v2
- Offline Mode with cache system
- Backend Tests (pytest)
- Photo Editor Modal
- Dynamic Category Management
- Advanced Filters for Catalog
- Florist Analytics Dashboard

### Components Added
- ReferralProgramScreen.tsx
- PhotoEditorModal.tsx
- AdvancedFiltersModal.tsx
- FloristAnalyticsScreen.tsx
- Admin Categories Page

---

## Earlier Development

### Core Features
- User authentication (Buyer and Florist)
- Flower catalog browsing
- Shopping cart and checkout
- Order management
- Florist dashboard
- Reviews and ratings
- Push notifications
- Multi-language support
- Stripe Connect payments
- Loyalty program
- Promo codes
- Subscriptions
- Consultations
- Delivery Tracking
- Gift Certificates
- AI Chatbot
- Feature Flags System
