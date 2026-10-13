# QuickVerse Delivery App — API Endpoint Map

**Base URL:** `http://prd.quickverse.in`  
**27 endpoints** · **8 screens with APIs** · **7 service files** · **2 WebSocket topics**

---

## LoginScreen

`screens/LoginScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| POST | `/quickVerse/v1/requestOtp` | Send OTP to phone number | button press |

---

## OTPScreen

`screens/OTPScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| POST | `/quickVerse/v1/login` | Verify OTP → get JWT | button press |
| POST | `/quickVerse/v1/requestOtp` | Resend OTP (after 60s cooldown) | resend tap |
| GET | `/v1/delivery-partner/{partnerId}` | Fetch partner profile after auth | post-verify |
| POST | `/quickVerse/v1/updateDeviceRegistry` | Register device + FCM token (fire-and-forget) | post-verify |

---

## HomeScreen *(busiest screen)*

`screens/HomeScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/v1/order-master/delivery-partner/{partnerId}` | Fetch assigned orders (all statuses) | poll 5s |
| GET | `/v1/order-master/delivery-partner/{partnerId}` | Fetch orders with custom date range | date filter |
| GET | `/v1/order-master/deliveryPartner/stats/{partnerId}` | Daily / weekly / monthly / total stats | tab switch |
| GET | `/quickVerse/v3/pricing-configurations` | Fetch pricing config (×2 — FOOD + GROCERY) | on mount |
| PATCH | `/v1/delivery-partner/{partnerId}/online` | Toggle online / offline status | toggle switch |
| PATCH | `/v1/order-master/{id}/pickup` | Mark order picked up (via OTP modal) | OTP confirm |
| PATCH | `/v1/order-master/{id}/completeDelivery` | Complete delivery (via OTP modal) | OTP confirm |
| WS | `/topic/deliveryPartner/{partnerId}` | Real-time order events (STOMP over WebSocket) | on mount |
| DELETE | `/quickVerse/v1/logout` | Invalidate session | button press |

---

## OrderDeliveryScreen

`screens/OrderDeliveryScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| PATCH | `/v1/order-master/{id}/arriveStore` | Mark arrived at store | button press |
| PATCH | `/v1/order-master/{id}/pickup` | Mark order picked up | button press |
| PATCH | `/v1/order-master/{id}/arriveDestination` | Mark arrived at customer | button press |
| PATCH | `/v1/order-master/{id}/completeDelivery` | Complete delivery (optional payment proof image) | button press |

---

## EarningsScreen

`screens/EarningsScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/v1/delivery-partner/{partnerId}/earnings-summary` | Earnings by period (today / week / month / lifetime) | period change |
| GET | `/v1/delivery-partner/{partnerId}/order-history` | Completed order history (called in parallel with above) | period change |

---

## ProfileScreen

`screens/ProfileScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| DELETE | `/quickVerse/v1/logout` | Invalidate session on logout | button press |

---

## LiveOrderPoolScreen

`screens/LiveOrderPoolScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/quickVerse/v3/rider/{partnerId}/shifts/active` | Check if partner has an active shift | on mount |
| PATCH | `/v1/delivery-partner/{partnerId}/online` | Toggle online / offline | toggle switch |
| GET | `/quickVerse/v3/order-pool` | Fetch available pool orders | on mount + pull |
| POST | `/quickVerse/v3/order-pool/{poolId}/claim` | Claim an order from the pool | accept tap |
| WS | `/topic/orderPool` | Real-time pool events (ADDED / CLAIMED / EXPIRED) | on mount |

---

## ShiftSelectionScreen

`screens/ShiftSelectionScreen.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/quickVerse/v3/rider/{partnerId}/shifts` | Get shifts for today + tomorrow (×2 parallel calls) | on mount |
| POST | `/quickVerse/v3/rider/{partnerId}/shifts` | Book one or more shifts for a date | save press |
| DELETE | `/quickVerse/v3/rider/{partnerId}/shifts/{shiftId}` | Cancel a shift (one call per removed shift) | save press |

---

## Global / Background Services

### GlobalLocationSync

`components/GlobalLocationSync.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| PATCH | `/v1/delivery-partner/{partnerId}/location` | Push GPS coordinates to server | poll 20s |

### NotificationSetup

`components/NotificationSetup.tsx`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| POST | `/quickVerse/v1/updateDeviceRegistry` | Re-register device on FCM token refresh | token refresh |
| POST | `/quickVerse/v1/updateDeviceRegistry` | Register device once after login + permissions | post-login |

### NavigationHelper

`navigation/NavigationHelper.ts`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/v1/order-master/delivery-partner/{partnerId}` | Fetch all orders to find the tapped order | notif tap |

### AuthStore

`store/authStore.ts`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/v1/delivery-partner/{partnerId}` | Refresh partner profile on rehydration (cold start) | app launch |

### PricingStore

`store/pricingStore.ts`

| Method | Endpoint | Description | Trigger |
|--------|----------|-------------|---------|
| GET | `/quickVerse/v3/pricing-configurations` | Pricing config per service type (triggered by HomeScreen) | on mount |

---

## Screens with No API Calls

- **MyShiftsScreen** — data via route params
- **OrderWebViewScreen** — external WebView
- **LocationPermissionScreen** — device permissions only
- **NewHomeScreen** — static
- **OrdersScreen** — placeholder
- **RewardsScreen** — placeholder
