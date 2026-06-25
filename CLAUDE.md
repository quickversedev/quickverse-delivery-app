# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QV Delivery (QuickVerse Transporters) is a React Native 0.81 delivery partner app (bare workflow, no Expo). It targets Android and iOS, using TypeScript throughout.

## Commands

```bash
npm start                  # Start Metro bundler on port 8085
npm run android            # Build and run on Android (port 8085)
npm run ios                # Build and run on iOS
npm run lint               # ESLint (extends @react-native config)
npm test                   # Jest with react-native preset
```

Metro runs on **port 8085** (not the default 8081).

For iOS, install CocoaPods first: `bundle install && bundle exec pod install`.

## Architecture

### Auth & State

The app uses a **Zustand store** (`src/store/authStore.ts`) for auth state, persisted to AsyncStorage under key `auth-store`. The `useAuthStore` hook (`src/hooks/useAuthStore.ts`) is a re-export of this store. A legacy Context-based auth (`src/contexts/AuthContext.tsx`) exists but is **not mounted** in `App.tsx`.

On app launch, `rehydrateAuthStore()` restores state from AsyncStorage. It has a fallback path that migrates from individual `TokenStorage` keys (legacy) into the unified `auth-store` key.

**Storage**: `TokenStorage` and `PartnerStatusStorage` (both in `src/utils/storage.ts`) use **AsyncStorage** for individual keys (`@AuthToken`, `@PartnerId`, `@PhoneNumber`, `@IsLoggedIn`, `@PartnerActive`). Despite `react-native-mmkv` being a dependency, it is not currently used. Both the Zustand-persisted blob and the individual TokenStorage keys are written during login/logout and must stay in sync.

### Navigation

React Navigation v7 with three layers:

1. **AuthStack** (native stack): Login -> OTP
2. **MainTabNavigator** (bottom tabs): HomeTab, OrdersTab, EarningsTab, RewardsTab, ProfileTab
3. **RootStack** (native stack, wraps tabs): MainTabs, OrderWebView, OrderDelivery

Auth gate in `AppNavigator.tsx` switches between AuthStack and RootStack based on `authData?.token`. Shows `LoadingScreen` while `isBootstrapping` is true.

### API Layer

- **`src/services/axios.config.ts`** — shared Axios instance with base URL `http://prd.quickverse.in`, 15s timeout, `Request-Origin: TRANSPORTER` header. Auto-attaches Bearer token from `TokenStorage`. Logs requests/responses in `__DEV__` mode.
- **`apiCall<T>(promise)`** — wrapper that extracts `.data` and normalizes errors to `ApiError`.
- Session expiry (error codes `1047`, `1042`) triggers a callback to force logout.

### Services

- **`auth.service.ts`** — OTP-based auth: `sendOtp` (`/quickVerse/v1/requestOtp`), `verifyOtp` (`/quickVerse/v1/login`), `signUp`, `signOut`. Unauthenticated endpoints use a hardcoded Basic Auth header.
- **`delivery-partner.service.ts`** — partner profile, online status toggle, assigned orders, location updates, and the full delivery workflow (`arriveAtStore`, `pickupOrder`, `arriveAtDestination`, `completeDelivery`). Uses `SessionKey` header (not `Authorization`) and `Request-Origin: CAPTAIN` for order endpoints.
- **`earnings.service.ts`** — currently returns **hardcoded mock data** (backend not ready).
- **`pricing.service.ts`** — fetches pricing config; consumed by `pricingStore` (Zustand) with hardcoded defaults for FOOD and GROCERY service types.
- **`device-registry.service.ts`** — registers device info + FCM token on login via `/quickVerse/v1/updateDeviceRegistry`.
- **`websocket.service.ts`** — STOMP over WebSocket for real-time order assignment events. Subscribes to `/topic/deliveryPartner/{partnerId}`. Auto-reconnects with 5s delay.

### Order Delivery Workflow

`OrderDeliveryScreen` implements a multi-stage delivery flow driven by order status:

`ACCEPTED/PARTNER_ASSIGNED` -> `ARRIVED_AT_STORE` -> `PICKED_UP` -> `ARRIVED_AT_DESTINATION` -> `DELIVERED`

Each stage maps to an API action in `delivery-partner.service.ts`. The `completeDelivery` step supports optional payment proof image upload via `multipart/form-data`.

### Push Notifications

Firebase Cloud Messaging (`@react-native-firebase/messaging`) for receiving push messages. `@notifee/react-native` for displaying local notifications in the foreground. Permission is requested once after first login. `NotificationSetup` component (renders `null`) handles all FCM listeners and is mounted in `App.tsx`.

### Background Location Sync

`GlobalLocationSync` component (renders `null`, mounted in `App.tsx`) syncs GPS coordinates to the server every **1 minute** while the app is in the foreground and the partner is logged in.

### Fonts

Custom fonts: BricolageGrotesque (Regular/Medium/Bold) and Outfit (Regular/Bold/ExtraBold). Constants in `src/theme/typography.ts`. Font files in `src/assets/fonts/` and linked via `react-native.config.js`.

## Key Dependencies

- **zustand** for state management (auth store, pricing store)
- **@react-native-async-storage/async-storage** for all persistent storage
- **axios** for HTTP
- **@stomp/stompjs** for WebSocket (real-time order events)
- **@react-native-firebase/messaging** + **@notifee/react-native** for push notifications
- **react-native-maps** for map display in delivery screen
- **react-native-image-picker** for payment proof camera/gallery
- **react-native-device-info** for device registry
- **lucide-react-native** for icons (requires react-native-svg)
- **react-native-otp-entry** for OTP input
- **@react-native-community/geolocation** for GPS
