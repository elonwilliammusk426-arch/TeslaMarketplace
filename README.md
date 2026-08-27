# TeslaMarketplace

A premium electric-vehicle marketplace with a clean, cinematic automotive experience and a practical marketplace workflow.

> **Brand note:** TeslaMarketplace is an independent marketplace project. Its interface takes inspiration from modern automotive product design while using its own branding, content, and application identity.

## Overview

TeslaMarketplace is being built as a full-stack marketplace for EV discovery, vehicle listings, configuration, consignment, ordering, tracking, customer accounts, and administration.

### Experience goals

- Minimal, premium automotive UI/UX
- Cinematic hero presentation on the landing page
- Fast, responsive marketplace browsing
- Clear vehicle specifications and pricing
- Mobile-first interactions
- Straightforward customer and admin workflows

## Planned / Active Features

### Marketplace

- Vehicle catalogue and featured listings
- Search and filtering
- Vehicle detail pages
- Vehicle specifications
- Configurator experience
- Availability and listing status
- Energy and accessory categories

### Customer

- Account registration and sign-in
- Customer dashboard
- Consignment requests
- Order/request tracking
- Contact and sourcing requests

### Administration

- Inventory/listing management
- Customer and request management
- Order/status workflows
- Operational dashboard
- Audit-oriented administration

## UI / UX Direction

The product uses a restrained automotive design system:

- Large photographic hero sections
- High-contrast typography
- Black/white neutral foundation
- Rounded pill-style calls to action
- Subtle glass/blur navigation treatments
- Spacious layouts and strong visual hierarchy
- Responsive desktop and mobile layouts

The goal is **premium automotive simplicity without copying another company's website or branding**.

## Project Structure

```text
TeslaMarketplace/
├── index.html
├── dashboard.html
├── admin-dashboard.html
├── auth.html
├── calculator.html
├── configurator.html
├── categories.html
├── request.html
├── track.html
├── ai-fleet.html
├── how-it-works.html
├── about.html
├── app.js
├── i18n.js
├── styles.css
├── package.json
├── server.js
└── README.md
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

For development, use the development script when available:

```bash
npm run dev
```

The application should bind to the port supplied by the hosting environment, including Railway's `PORT` environment variable.

## Railway Deployment

The intended deployment flow is:

```text
GitHub (main)
      ↓
   Railway
      ↓
TeslaMarketplace
```

Railway should use the repository's production start command:

```bash
npm start
```

Configure secrets and service-specific values through Railway environment variables rather than committing them to GitHub.

## Environment & Security

Never commit:

- `.env` files containing secrets
- API keys
- passwords
- private keys
- database credentials
- production tokens

Use environment variables for production configuration.

## API Direction

The application is designed to move frontend mock interactions toward server-backed workflows for:

- Authentication
- Marketplace listings
- Requests
- Orders
- Consignment
- Tracking
- Contact submissions

## Development Status

**Active development.** The repository began as a static frontend prototype and is being evolved into a deployable full-stack marketplace application.

Before production launch, authentication, persistent data storage, payments/checkout, authorization, validation, logging, and deployment security should be fully configured and tested.

## License

Project-specific. Add the final commercial/open-source license before public distribution.
