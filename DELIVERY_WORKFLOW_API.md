# Delivery Workflow APIs

## Stages

### Stage 2 — Arrive at Store
**PATCH** `/v1/order-master/{id}/arriveStore`
Marks that the delivery partner has arrived at the restaurant/store location.

### Stage 3 — Pickup Order
**PATCH** `/v1/order-master/{id}/pickup?otp={otp}`
Marks that the delivery partner has picked up the order from the restaurant after OTP verification.

### Stage 4 — Arrive at Destination
**PATCH** `/v1/order-master/{id}/arriveDestination`
Marks that the delivery partner has reached the customer's delivery location.

### Stage 5 — Complete Delivery
**PATCH** `/v1/order-master/{id}/completeDelivery?otp={otp}`
Completes the delivery process after customer OTP verification and marks the order as delivered.
