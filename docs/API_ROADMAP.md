# TeslaMarketplace API Roadmap

## Public buyer APIs

- `GET /api/vehicles` — published inventory only
- `GET /api/vehicles/:id` — vehicle details
- `POST /api/purchase-requests` — buyer purchase request
- `GET /api/orders/:id` — authenticated customer order status

## Owner APIs (authenticated)

- `POST /api/admin/inventory`
- `PATCH /api/admin/inventory/:id`
- `POST /api/admin/inventory/:id/publish`
- `POST /api/admin/inventory/:id/reserve`
- `POST /api/admin/inventory/:id/sold`
- `GET /api/admin/purchase-requests`
- `PATCH /api/admin/purchase-requests/:id`
- `GET /api/admin/update-monitor`
- `POST /api/admin/update-monitor/:id/approve`
- `POST /api/admin/update-monitor/:id/reject`

All owner endpoints require authentication and role-based authorization. Production implementation should use a persistent database rather than in-memory arrays.
