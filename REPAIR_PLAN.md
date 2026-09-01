# TeslaMarketplace Repair Plan

## Current repair
- Establish one canonical application boundary: `frontend/` and `backend/`.
- Keep the root only for repository documentation/configuration; do not deploy the root as the web service.
- Make PostgreSQL schema and backend SQL consistent.
- Add the missing authentication module and secure RBAC.
- Add backend CORS, validation, graceful startup, and API coverage for the Phase 1 scope.
- Make the React frontend consume the API and provide the core customer flow.
- Provide a separate owner/admin UI boundary; admin APIs require authentication and admin role.
- Use Railway service root directories explicitly: `frontend` and `backend`.

## Deployment boundary
- Backend service root: `backend/`
- Backend start: `node server.js`
- Frontend service root: `frontend/`
- Frontend build: `npm run build`
- Frontend serves the built Vite application.
- PostgreSQL is the only persistence source of truth.

## Not yet production-ready
Payments, delivery operations, notifications, monitoring, mobile, international currency, charging/energy, and advanced hardening remain follow-on work unless explicitly implemented and tested end-to-end.
