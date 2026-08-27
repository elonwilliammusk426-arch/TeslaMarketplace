# Order & Tracking ID System

Every completed purchase/order receives a unique tracking ID. The tracking ID is customer-facing and is separate from the internal order ID.

## Example

`TMX-20260827-7K4P9Q`

Customer flow:

1. Buyer submits purchase request.
2. Owner confirms the order.
3. System creates an order and tracking ID.
4. Owner/admin records delivery milestones.
5. Buyer enters the tracking ID in the order-tracking page.
6. Buyer sees current status, latest location/update, and event history.

## Tracking lifecycle

Order Received → Confirmed → Processing → In Transit/Delivery Scheduled → Delivered

Cancelled orders retain their history.

## Data model

- `orders.tracking_id` is unique.
- `tracking_events.order_id` links events to the internal order.
- `tracking_events.tracking_id` supports direct customer lookup.
- `location`, `status`, `note`, and `created_at` provide the visible history.

For production, tracking IDs should be generated server-side using a collision-resistant method and should never expose internal database identifiers.
