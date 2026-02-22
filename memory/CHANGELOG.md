# Blomm-Daya Changelog

## December 2025

### Phase 1 Features Implementation

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
