/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abandonedCarts from "../abandonedCarts.js";
import type * as accountDeletion from "../accountDeletion.js";
import type * as admin from "../admin.js";
import type * as aiBouquetGenerator from "../aiBouquetGenerator.js";
import type * as aiReviewModeration from "../aiReviewModeration.js";
import type * as buyerAuth from "../buyerAuth.js";
import type * as buyerOrders from "../buyerOrders.js";
import type * as buyerProfiles from "../buyerProfiles.js";
import type * as categories from "../categories.js";
import type * as consultations from "../consultations.js";
import type * as courierTracking from "../courierTracking.js";
import type * as cron from "../cron.js";
import type * as deliveryCalculation from "../deliveryCalculation.js";
import type * as deliveryTimeSlots from "../deliveryTimeSlots.js";
import type * as favorites from "../favorites.js";
import type * as files from "../files.js";
import type * as floristApplications from "../floristApplications.js";
import type * as floristAuth from "../floristAuth.js";
import type * as floristHelpers from "../floristHelpers.js";
import type * as floristOrders from "../floristOrders.js";
import type * as floristReviews from "../floristReviews.js";
import type * as floristStories from "../floristStories.js";
import type * as florists from "../florists.js";
import type * as flowerCareTips from "../flowerCareTips.js";
import type * as flowers from "../flowers.js";
import type * as flowersSearch from "../flowersSearch.js";
import type * as geocoding from "../geocoding.js";
import type * as giftCertificates from "../giftCertificates.js";
import type * as gifts from "../gifts.js";
import type * as greetingCards from "../greetingCards.js";
import type * as http from "../http.js";
import type * as loyalty from "../loyalty.js";
import type * as notifications from "../notifications.js";
import type * as orderPhotos from "../orderPhotos.js";
import type * as orderTracking from "../orderTracking.js";
import type * as photoReviews from "../photoReviews.js";
import type * as productBundles from "../productBundles.js";
import type * as promos from "../promos.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as recommendations from "../recommendations.js";
import type * as referrals from "../referrals.js";
import type * as reminders from "../reminders.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as similarProducts from "../similarProducts.js";
import type * as stripe from "../stripe.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as stripeConnectMutations from "../stripeConnectMutations.js";
import type * as subscriptions from "../subscriptions.js";
import type * as supportChat from "../supportChat.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abandonedCarts: typeof abandonedCarts;
  accountDeletion: typeof accountDeletion;
  admin: typeof admin;
  aiBouquetGenerator: typeof aiBouquetGenerator;
  aiReviewModeration: typeof aiReviewModeration;
  buyerAuth: typeof buyerAuth;
  buyerOrders: typeof buyerOrders;
  buyerProfiles: typeof buyerProfiles;
  categories: typeof categories;
  consultations: typeof consultations;
  courierTracking: typeof courierTracking;
  cron: typeof cron;
  deliveryCalculation: typeof deliveryCalculation;
  deliveryTimeSlots: typeof deliveryTimeSlots;
  favorites: typeof favorites;
  files: typeof files;
  floristApplications: typeof floristApplications;
  floristAuth: typeof floristAuth;
  floristHelpers: typeof floristHelpers;
  floristOrders: typeof floristOrders;
  floristReviews: typeof floristReviews;
  floristStories: typeof floristStories;
  florists: typeof florists;
  flowerCareTips: typeof flowerCareTips;
  flowers: typeof flowers;
  flowersSearch: typeof flowersSearch;
  geocoding: typeof geocoding;
  giftCertificates: typeof giftCertificates;
  gifts: typeof gifts;
  greetingCards: typeof greetingCards;
  http: typeof http;
  loyalty: typeof loyalty;
  notifications: typeof notifications;
  orderPhotos: typeof orderPhotos;
  orderTracking: typeof orderTracking;
  photoReviews: typeof photoReviews;
  productBundles: typeof productBundles;
  promos: typeof promos;
  pushNotifications: typeof pushNotifications;
  recommendations: typeof recommendations;
  referrals: typeof referrals;
  reminders: typeof reminders;
  reviews: typeof reviews;
  seed: typeof seed;
  similarProducts: typeof similarProducts;
  stripe: typeof stripe;
  stripeConnect: typeof stripeConnect;
  stripeConnectMutations: typeof stripeConnectMutations;
  subscriptions: typeof subscriptions;
  supportChat: typeof supportChat;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
