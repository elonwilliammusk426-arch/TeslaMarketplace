# TeslaMarketplace Product Scope

## Included

- Owner-operated Tesla vehicle sales
- Owner inventory management
- Customer browsing and vehicle details
- Buyer purchase requests and orders
- Customer tracking IDs and order tracking
- Owner order/customer management
- Test-drive requests
- Responsive web experience
- Mobile app roadmap
- International / multi-currency roadmap
- Charging / energy products roadmap

## Explicitly excluded

- Third-party sellers
- Peer-to-peer vehicle marketplace
- Trade-in
- Financing integration
- Insurance
- Service scheduling
- SMS notifications
- Live delivery map

## Product principle

TeslaMarketplace sells vehicles from the platform owner's inventory to buyers. It is not a marketplace where customers list or sell vehicles to one another.

## Expansion groups

### Mobile app
A future iOS/Android client will consume the same backend APIs as the web application. It should not create a second inventory or order database.

### International / multi-currency
The platform should be designed for regional expansion while keeping a canonical accounting currency in the backend. Customer-facing currency conversion must use a trusted exchange-rate source, and final transaction amounts should be explicitly confirmed before payment.

### Charging / energy products
Charging and energy products will be a separate catalog domain from vehicle inventory, with its own product, availability, pricing, and order relationships. It must not be mixed into vehicle stock records.
