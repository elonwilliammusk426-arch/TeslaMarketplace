# TeslaMarketplace Architecture

## Product boundary
TeslaMarketplace is an owner-operated vehicle sales platform. The owner controls the commercial inventory. Customers are buyers; third-party sellers are not part of the product.

## Logical architecture

```text
Web UI ───────────────┐
Mobile App ───────────┼──> HTTPS API ──> Auth/RBAC ──> PostgreSQL
Admin UI ─────────────┘         │              │
                                │              └── Audit Log
                                ├── Orders / Tracking
                                ├── Payments Adapter
                                ├── Delivery
                                ├── Notifications
                                ├── Test Drives
                                ├── Charging / Energy Catalog
                                ├── Currency Service
                                └── Public-information Monitor
```

## Source of truth
- PostgreSQL is the source of truth for owned inventory, customers, orders, payments, deliveries, tracking events, notifications, and products.
- The payment provider is the source of truth for payment authorization; the platform stores provider references and verified status.
- Public Tesla pages are external reference inputs only. Monitored changes become review events and require owner approval before catalog changes.

## Order state machine
`received -> confirmed -> payment_pending -> paid -> preparing -> scheduled -> in_transit -> delivered`

Terminal states: `cancelled`, `failed`.

Every transition is server-authorized and creates a tracking event and appropriate notification event.

## Payment boundary
The application never stores raw card numbers or CVV. A payment-provider adapter creates checkout/payment sessions, receives signed webhooks, verifies them, and updates the order/payment state idempotently.

## Notifications
- Email
- In-app/web notifications
- Mobile push
- Owner/admin notifications

SMS is deliberately excluded.

## International / multi-currency
- Orders use a canonical accounting currency.
- Display currency may differ from accounting currency.
- Conversion rates are timestamped and stored for reproducibility.
- Final order totals are immutable once payment is authorized except through explicit refund/adjustment records.

## Mobile
The mobile application uses the same authenticated API and database as the web application. It does not maintain a separate business-data store.

## Charging / energy
Charging and energy products have their own catalog and inventory domain, while checkout can share the same order/payment infrastructure.

## Security
- HTTPS in production
- Secure authentication and role-based authorization
- Server-side validation
- Rate limiting
- Parameterized queries
- Secret management
- Audit logs
- Backup and recovery
- Security/dependency scanning

## Delivery
Delivery status is tracked as events, not as a live GPS map. Live delivery mapping is excluded.

## Observability
Production deployment should expose health/readiness checks, structured logs, error monitoring, database metrics, payment webhook monitoring, and audit trails.
