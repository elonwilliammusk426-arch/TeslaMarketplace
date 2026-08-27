# API Plan

## Public/customer
- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/purchase-requests`
- `GET /api/orders/:id`
- `GET /api/orders/track/:trackingId`
- `POST /api/payments/checkout`
- `GET /api/notifications`
- `POST /api/test-drives`
- `GET /api/products`
- `GET /api/currency/rates`

## Owner/admin
- `GET /api/admin/vehicles`
- `POST /api/admin/vehicles`
- `PATCH /api/admin/vehicles/:id`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/test-drives`
- `PATCH /api/admin/test-drives/:id`
- `GET /api/admin/notifications`
- `GET /api/admin/monitor/events`
- `POST /api/admin/monitor/events/:id/approve`
- `POST /api/admin/monitor/events/:id/reject`
- `GET /api/admin/audit-logs`

## Webhooks
- `POST /api/webhooks/payment-provider`

## API rules
- Authentication and authorization are enforced server-side.
- Request validation is mandatory for every write endpoint.
- State transitions are explicit and idempotent where external retries are possible.
- Sensitive data is never returned unnecessarily.
- Errors use stable machine-readable codes plus safe human-readable messages.
