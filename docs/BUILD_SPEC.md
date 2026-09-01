# TeslaMarketplace Build Specification

## Product identity
- Brand name: TeslaMarketplace
- Do not add a tagline or secondary brand name at this stage.
- Branding system: logo-ready, typography, spacing, iconography, color tokens, responsive UI.

## Marketplace scope
- Vehicles: current/new, pre-owned, previous models, performance, dream/special.
- Include multiple model years and configurations; do not represent older/discontinued vehicles as current production.
- Include Cybertruck and Roadster where inventory/data is legitimately available.
- Non-vehicle catalog: charging, vehicle accessories, parts, lifestyle.
- Apparel is excluded.

## Product detail experience
- Every product has a rich detail page.
- Vehicle pages support model/year/trim/condition/mileage/drivetrain/range/colors and gallery metadata.
- Product gallery supports multiple images, thumbnails, mobile swipe, desktop navigation, zoom, and optional video/animation assets.
- Motion should be restrained and purposeful: transitions, gallery changes, scroll reveals, configuration changes.

## Data architecture
- PostgreSQL is the source of truth for marketplace inventory, customers, orders, consignments and tracking.
- Generic products/catalog architecture should support non-vehicle products while preserving vehicle-specific detail data.
- External catalog monitoring must be implemented as permitted-source synchronization/change detection, not blind copying of another company's website, branding, text, photography, or proprietary assets.
- Prefer review/approval before publishing external catalog changes.

## Accounts
- Customer registration creates customer accounts only.
- Exactly one owner/admin account is provisioned securely; no public admin registration.
- Admin privileges are enforced server-side.

## Deployment
- Frontend and backend are separate Railway services from the monorepo.
- Frontend uses VITE_API_URL at build time.
- Backend uses DATABASE_URL, FRONTEND_ORIGIN and its private authentication secret.
- Railway provides PORT; applications bind to 0.0.0.0.
- No secrets are committed to GitHub.

## Quality gate
Before production deployment, verify frontend build, backend startup, database initialization, API connectivity, authentication, inventory retrieval, product details, purchase/order flow, tracking, admin authorization, responsive behavior and production CORS.
