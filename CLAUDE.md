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

### Dual Auth Systems

The app has two parallel auth implementations that coexist:

1. **`src/contexts/AuthContext.tsx`** — React Context + `useState` (provides `useAuth` hook via `AuthProvider`)
2. **`src/store/authStore.ts`** — Zustand store with async persistence to AsyncStorage (provides `useAuthStore` hook)

The active navigation (`AppNavigator.tsx`) uses the **Zustand store** (`useAuthStore`). The Context-based `AuthProvider` is not currently mounted in `App.tsx`. Both maintain the same shape of auth state and call the same underlying services.

### State & Storage Layers

- **MMKV** (`src/utils/storage.ts`) — synchronous token/session storage via `TokenStorage` and `PartnerStatusStorage`. Used as the fast auth check layer with in-memory fallback.
- **AsyncStorage** — used by the Zustand store (`authStore.ts`) for persisting full auth state (user, profile, login status) across app restarts.
- Both layers are written to during login/logout and must stay in sync.

### Navigation

React Navigation v7 with native stack. Two stack navigators switch based on auth state:
- **AuthStack**: Login -> OTP
- **AppStack**: Home -> Profile

Controlled by `isLoggedIn && !!authData?.token` in `AppNavigator.tsx`. Auth state is rehydrated on mount via `rehydrateAuthStore()`.

### API Layer

- **`src/services/axios.config.ts`** — shared Axios instance with base URL `http://prd.quickverse.in`, 15s timeout, `Request-Origin: TRANSPORTER` header. Auto-attaches Bearer token from `TokenStorage`. Logs requests/responses in `__DEV__` mode.
- **`apiCall<T>(promise)`** — wrapper that extracts `.data` and normalizes errors to `ApiError`.
- Session expiry (error codes `1047`, `1042`) triggers a callback to force logout.

### Services

- **`auth.service.ts`** — OTP-based auth: `sendOtp` (4-digit OTP, 10-digit phone), `verifyOtp`, `signUp`, `signOut`. Uses Basic Auth header for unauthenticated endpoints.
- **`delivery-partner.service.ts`** — partner profile, online status toggle, assigned orders (fetch/accept/reject), location updates. Some endpoints use `SessionKey` header instead of `Authorization`.

### Background Location Sync

`GlobalLocationSync` component (rendered in `App.tsx`, renders `null`) syncs the delivery partner's GPS coordinates to the server every 4 minutes while the app is in the foreground and the partner is logged in.

### Fonts

Custom fonts: BricolageGrotesque (Regular/Medium/Bold) and Outfit (Regular/Bold/ExtraBold). Constants in `src/theme/typography.ts`. Font files in `src/assets/fonts/` and linked via `react-native.config.js`.

## Key Dependencies

- **zustand** for state management
- **react-native-mmkv** for synchronous key-value storage
- **@react-native-async-storage/async-storage** for async persistence
- **axios** for HTTP
- **lucide-react-native** for icons (requires react-native-svg)
- **react-native-otp-entry** for OTP input
- **@react-native-community/geolocation** for GPS
