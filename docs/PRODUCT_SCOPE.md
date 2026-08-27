# TeslaMarketplace Product Scope

## Purpose
TeslaMarketplace is an owner-operated Tesla vehicle sales platform. Customers are buyers; there is no peer-to-peer seller marketplace.

## Included
- Customer website and responsive experience
- Owner/admin inventory management
- Vehicle catalog and detail pages
- Buyer accounts
- Purchase requests and orders
- Unique customer Tracking IDs and order history
- Order tracking
- Test-drive requests
- Secure payment integration architecture
- Mobile app roadmap using the same backend/API
- International and multi-currency architecture
- Charging and energy products catalog

## Explicitly excluded
- Trade-in
- Financing integration
- Insurance
- Service scheduling
- SMS notifications
- Live delivery map
- Third-party sellers / peer-to-peer listings

## Architecture principles
- The owner's inventory is the authoritative commercial inventory.
- External/public sources must not be treated as proof that the owner possesses a vehicle.
- Customer-facing prices and availability come from the owner's database.
- Payment card data is handled by a PCI-compliant payment provider; the platform should not store raw card numbers.
- Multi-currency uses a canonical accounting currency for orders, with displayed conversion handled separately.
- Mobile clients consume the same authenticated backend APIs as the web application.
- Charging/energy products remain a separate catalog domain from vehicle inventory.
