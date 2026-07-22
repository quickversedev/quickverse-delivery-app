# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QV Delivery (QuickVerse Transporters) is a React Native 0.81 delivery partner app (bare workflow, no Expo). Android-focused, TypeScript throughout. Package: `com.qvtransportersappui`. New Architecture + Hermes enabled. Min SDK 24, target/compile SDK 36.

## Commands

```bash
npm start                  # Start Metro bundler on port 8085
npm run android            # Build and run on Android (port 8085)
npm run ios                # Build and run on iOS
npm run lint               # ESLint
npm test                   # Jest with react-native preset

# Release APK
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

Metro runs on **port 8085** (not the default 8081).

Release signing config is in `android/gradle.properties` (keystore: `qvdelivery-release.keystore`). Release builds use R8 minification + `shrinkResources true` — sound files in `res/raw/` need `keep_sounds.xml` to survive.

## Architecture

### Auth & State

**Zustand store** (`src/store/authStore.ts`) for auth state, persisted to AsyncStorage under key `auth-store`. `useAuthStore` hook (`src/hooks/useAuthStore.ts`) re-exports this store. Legacy `AuthContext.tsx` exists but is **not mounted**.

On launch, `rehydrateAuthStore()` restores state with a fallback migration path from individual `TokenStorage` keys. `TokenStorage` and `PartnerStatusStorage` (`src/utils/storage.ts`) use AsyncStorage for individual keys (`@AuthToken`, `@PartnerId`, `@PhoneNumber`, `@IsLoggedIn`, `@PartnerActive`). Both the Zustand blob and individual keys are written during login/logout and must stay in sync.

**MMKV** (`react-native-mmkv` ^3.2.0) is used in `src/services/notification/notificationRedirect.ts` with a dedicated instance (`id: 'notification-redirect'`) for persisting pending order IDs from notification taps. It is not used for general storage.

A second Zustand store (`src/store/pricingStore.ts`) holds pricing config with hardcoded defaults for FOOD and GROCERY service types, fetched from backend.

### Navigation

React Navigation v7 with three layers:

1. **AuthStack** (native stack): Login -> OTP
2. **MainTabNavigator** (bottom tabs): HomeTab, EarningsTab, ProfileTab
3. **RootStack** (native stack, wraps tabs): MainTabs, OrderWebView, OrderDelivery

Auth gate in `AppNavigator.tsx` switches stacks based on `authData?.token`. Shows `LoadingScreen` while `isBootstrapping`. `LocationGuard` wraps the authenticated navigator — shows `LocationPermissionScreen` if location permission or GPS is not enabled.

`NavigationHelper.ts` holds the `navigationRef` and handles notification-driven deep-linking via MMKV-buffered order IDs. `flushPendingOrderNavigation()` is auth-gated: won't consume the pending ID until logged in + nav ready. Called on ready, on login, on app foreground, and after taps.

The `OrderDelivery` route requires a **full order object** as param (no get-by-id API). Notification tap handler fetches `getAssignedOrdersByPartnerId('all')`, matches by orderId, and navigates with the full object.

### API Layer

- **`src/services/axios.config.ts`** — shared Axios instance, base URL `http://prd.quickverse.in`, 15s timeout, `Request-Origin: TRANSPORTER` header. Auto-attaches Bearer token. Logs in `__DEV__`.
- **`apiCall<T>(promise)`** — extracts `.data`, normalizes errors to `ApiError`.
- Session expiry (error codes `1047`, `1042`) triggers force logout.

### Services

- **`auth.service.ts`** — OTP-based auth. Unauthenticated endpoints use a hardcoded Basic Auth header.
- **`delivery-partner.service.ts`** — partner profile, online status, assigned orders (paginated, time-filtered), location updates, and delivery workflow (`arriveAtStore`, `pickupOrder`, `arriveAtDestination`, `completeDelivery`). Uses `SessionKey` header and `Request-Origin: CAPTAIN` for order endpoints.
- **`earnings.service.ts`** — calls `/v1/delivery-partner/{id}/earnings-summary` and `/v1/delivery-partner/{id}/order-history` with period filters.
- **`pricing.service.ts`** — fetches pricing config from `/quickVerse/v3/pricing-configurations`.
- **`device-registry.service.ts`** — registers device info + FCM token via `/quickVerse/v1/updateDeviceRegistry`. Sends `phone` header alongside `SessionKey`.
- **`websocket.service.ts`** — STOMP over WebSocket subscribing to `/topic/deliveryPartner/{partnerId}`. Auto-reconnects with 5s delay.

### Order Delivery Workflow

`OrderDeliveryScreen` implements a multi-stage delivery flow:

`ACCEPTED/PARTNER_ASSIGNED` -> `ARRIVED_AT_STORE` -> `PICKED_UP` -> `ARRIVED_AT_DESTINATION` -> `DELIVERED`

Each stage maps to an API action. `completeDelivery` supports optional payment proof image upload via `multipart/form-data`.

### Push Notifications

Three notification channels defined in `index.js`:

| Channel | ID | Sound |
|---|---|---|
| Default | `default_channel` | `noti.wav` |
| Order Assigned | `order_assigned_channel` | `noti1.mp3` |
| Order Unassigned | `order_unassigned_channel` | `noti2.mp3` |

Sound files live in `android/app/src/main/res/raw/`. Channel routing depends on backend sending `data.channelId` in the FCM payload; without it, everything falls back to `default_channel`.

`NotificationSetup.tsx` (renders `null`, mounted in `App.tsx`) handles all FCM/notifee listeners, token refresh re-registration, and notification tap -> persist -> flush navigation. FCM token is deleted on logout (`authStore.ts`).

`AndroidManifest.xml` declares `default_notification_channel_id`, custom notification icon (`ic_notification`), and accent color. Uses `tools:replace` to override values from the Firebase messaging library.

### Background Location Sync

`GlobalLocationSync` (renders `null`, mounted in `App.tsx`) uses `react-native-background-actions` foreground service to sync GPS every **20 seconds** while logged in. Requests `ACCESS_BACKGROUND_LOCATION` permission on Android 10+.

### HomeScreen Polling

`HomeScreen.tsx` polls `getAssignedOrdersByPartnerId` every **5 seconds** while the orders tab is active. WebSocket events also trigger a refresh.

### Fonts

Custom fonts: BricolageGrotesque (Regular/Medium/Bold) and Outfit (Regular/Bold/ExtraBold). Constants in `src/theme/typography.ts`. Files in `src/assets/fonts/`, linked via `react-native.config.js`.

## Key Dependencies

- **zustand** — state management (auth store, pricing store)
- **@react-native-async-storage/async-storage** — primary persistent storage
- **react-native-mmkv** — notification redirect pending order persistence only
- **axios** — HTTP client
- **@stomp/stompjs** — WebSocket (real-time order events)
- **@react-native-firebase/messaging** + **@notifee/react-native** — push notifications
- **react-native-background-actions** — background location foreground service
- **react-native-maps** — map display in delivery screen
- **react-native-image-picker** — payment proof camera/gallery
- **react-native-device-info** — device registry
- **lucide-react-native** — icons (requires react-native-svg)
- **@react-native-community/geolocation** — GPS
- **@react-native-community/datetimepicker** — date/time filter pickers
