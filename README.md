# FarmLokal Project (Backend + React Frontend)

This project implements the FarmLokal backend assignment with a companion React dashboard for product discovery. It runs **without Docker** and uses **Node.js + TypeScript** with **MongoDB**. Redis is optional (can be disabled for local dev).

## Features
- OAuth2 Client Credentials authentication with safe concurrency and Redis token cache.
- Sync external API integration with retries, timeout, circuit breaker, and request logging.
- Webhook integration with HMAC verification, idempotency, and safe retries.
- High-performance `/products` listing API (cursor pagination, filters, search, sort).
- React frontend for searching, filtering, and paging through products.

## Tech Stack
- Node.js (TypeScript)
- Express
- MongoDB
- Redis (ioredis, optional)
- React + Vite

## Local Setup (No Docker)

### 1) Install dependencies
```
# Backend
npm install

# Frontend
cd frontend
npm install
```

### 2) Configure environment
- Backend: create `.env` from `.env.example`.
- Frontend: optionally create `frontend/.env` from `frontend/.env.example` if your API runs on a different host.

### 3) Start MongoDB (Redis optional)
Make sure MongoDB (default port 27017) is running locally. Redis (port 6379) is optional; if you don't have Redis, keep `REDIS_DISABLED=true` in `.env`.

### 4) (Optional) Add sample data
Insert a few documents into the `products` collection in the `farmlokal` database to see results in the UI.

### 5) (Optional) Create indexes (recommended for 1M docs)
```
npm run db:indexes
```

### 6) Start backend
```
npm run dev
```

### 7) Start frontend
```
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173 and connects to the API at http://localhost:8080.

### One-command dev (backend + frontend)
```
npm run dev:all
```

## API Endpoints

### `GET /products`
Cursor-based pagination with search, sorting, and filters.

Query params:
- `limit` (1-100, default 20)
- `cursor` (opaque base64)
- `sort` (`created_at | price | name`)
- `order` (`asc | desc`)
- `q` (search string)
- `category_id`
- `price_min`
- `price_max`
- `active` (`true | false`)

Response:
```
{
  "items": [ ... ],
  "next_cursor": "..." | null
}
```

### `GET /external/supplier/:id`
Calls a synchronous external API with retries, timeout, and circuit breaker protection. Uses OAuth2 client credentials for authorization.

### `POST /webhooks/external`
Webhook receiver with HMAC signature validation and idempotency protection.

Required headers:
- `x-signature`: `sha256=<hmac>`
- `x-event-id`: unique event id (or `event_id` in payload)

## OAuth2 Client Credentials
The OAuth access token is cached in Redis with a safety window to avoid expired tokens. Concurrency is controlled via a Redis lock to prevent thundering herd.

## Caching Strategy
- Product listing responses are cached in Redis by a hash of query parameters.
- Access tokens are cached in Redis with TTL.

## Performance Optimizations
- Cursor-based pagination avoids large skips.
- Suggested indexes on `category_id`, `price_cents`, `created_at`, and `name`.
- Search uses case-insensitive regex by default; can be upgraded to MongoDB text indexes.
- Minimal queries per request (single find for listing).

## Reliability Techniques
- Rate limiting (Redis token bucket, per IP).
- Circuit breaker around the sync external API.
- Retry + timeout with exponential delay.
- Webhook idempotency backed by Redis (optional unique index on `event_id`).

## Render Deployment
1. Create a new Render Web Service.
2. Connect this repository.
3. Add environment variables from `.env.example`.
4. Use build command: `npm install && npm run build`
5. Start command: `npm run start`
6. Provision MongoDB and Redis (Render or managed services) and update env vars.

## Trade-offs
- Uses in-memory circuit breaker state (per instance). A distributed breaker could be added if needed.
- Product cache is short TTL to keep data fresh without complex invalidation.
- Regex search is simpler than text indexes; add text indexes for large datasets.

## Testing (optional)
No automated tests included due to time constraints; in production this should include unit tests for token manager, pagination, and webhook idempotency.
