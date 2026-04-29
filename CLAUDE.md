# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (nodemon, auto-reload)
npm start          # Start production server
npx prisma db seed # Seed the database with initial data
npx prisma studio  # Open Prisma Studio (DB GUI)
npx prisma generate # Regenerate Prisma client after schema changes
npx prisma migrate dev # Run pending migrations in development
```

Server runs on port 3000 by default.

## Architecture

REST API backend for an optical shop/clinic (OptiLuxe). Built with **Express 5** + **Prisma 6** on **PostgreSQL** (hosted on Render).

### Entry Points

- [server.js](server.js) — loads `.env`, starts HTTP server
- [app.js](app.js) — Express app config: mounts all routers, global middlewares, error handler, 404 handler

### Folder Structure

```
src/
  config/       # Prisma client instance, business constants (negocio.js)
  controllers/  # HTTP request handlers — thin layer, delegates to services
  services/     # Business logic and all Prisma queries
  routes/       # Express routers, one file per domain
  middlewares/  # Auth (JWT), CORS
  jobs/         # node-cron background jobs (notifications, appointment reminders)
  templates/    # HTML email templates
  utils/        # Date formatting, error classes, email sender
  generated/    # Auto-generated Prisma client — never edit manually
prisma/
  schema.prisma # Database schema
  seed.js       # Initial seeding script
```

### Request Lifecycle

```
Request → CORS middleware → cookie-parser → express.json()
        → Route → authMiddleware (validates JWT from httpOnly cookie)
        → role check (isAdmin / isStaff)
        → Controller → Service (Prisma queries)
        → Response / HttpError → global error handler
```

### Authentication

JWT stored as httpOnly cookie (2-hour expiry). Three middleware variants:
- `authMiddleware` — requires valid token
- `isAdmin()` — requires `ADMINISTRADOR` role
- `isStaff()` — requires `ADMINISTRADOR` or `EMPLEADO` role
- `optionalAuthMiddleware` — continues even without token

Password reset uses crypto tokens with expiry stored in DB, sent via email.

### Key Conventions

**Database naming:** All column names use Spanish domain prefixes (`usu_*` for usuario, `cit_*` for cita, `fac_*` for factura, etc.).

**Services:** Named functions with a `Service` suffix. All Prisma calls live here — controllers must not import Prisma directly.

**Error handling:** Throw `HttpError(message, statusCode)` from [src/utils/httpErrors.js](src/utils/httpErrors.js) in services/controllers. The global error handler in `app.js` catches everything. 4xx errors are logged quietly; 5xx errors log the full stack.

**Business constants:** [src/config/negocio.js](src/config/negocio.js) is the single source of truth for IVA (19%), office hours, and other business rules. Never hardcode these values elsewhere.

**Background jobs:** Initialized via `iniciarJobs()` called from `app.js`. Use `node-cron`. Jobs read/write notification state (`Pendiente` → `Enviada` / `Fallida`) in the database. Note: cron jobs do not run on Vercel (serverless) — use an external scheduler or a persistent host (Railway, Render) if jobs are critical.

**Email:** HTML templates in [src/templates/emails/](src/templates/emails/) use CID references for the logo. Sending is handled by [src/utils/sendEmail.js](src/utils/sendEmail.js) via Gmail SMTP.

**API pattern:** All routes under `/api/{resource}`. Standard HTTP status codes. JSON responses use a `message` field for human-readable feedback.

## Environment Variables

Required in `.env` at root (never commit this file):

```
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # JWT signing secret
EMAIL_HOST            # smtp.gmail.com
EMAIL_PORT            # 587
EMAIL_USER            # Gmail account
EMAIL_PASS            # Gmail app password
EMAIL_FROM            # From header
VAPID_PUBLIC_KEY      # Web push public key
VAPID_PRIVATE_KEY     # Web push private key
VAPID_SUBJECT         # mailto: address for VAPID
FRONTEND_URL          # Production frontend URL (for CORS)
PORT                  # Optional, defaults to 3000
NODE_ENV              # development | production
```

## Database

Roles: `ADMINISTRADOR`, `EMPLEADO`, `CLIENTE`

Core models: `usuario`, `rol`, `cita` (appointments), `producto`, `categoria`, `carrito`, `factura`, `encuesta` (surveys), `notificacion`, `historia_clinica` (clinical records), `webpush_suscripcion`, `log_acceso`, `contacto`, `servicio`.

After editing [prisma/schema.prisma](prisma/schema.prisma), always run `npx prisma generate` before running the app. The generated client outputs to `src/generated/prisma`.

## Vercel Deployment

Configured via [vercel.json](vercel.json) — all routes are proxied to `app.js` using `@vercel/node`. Prisma client is generated automatically on deploy via the `postinstall` script. Set all environment variables listed above in the Vercel dashboard.
