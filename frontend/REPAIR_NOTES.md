# Frontend repair

The frontend is intentionally deployed from this directory, not the repository root. It reads `VITE_API_URL` at build time and calls the shared Express API. Keep the frontend free of secrets; only public API configuration belongs in `VITE_*` variables.
