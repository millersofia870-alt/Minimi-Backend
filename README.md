# Minimi Agri — Backend

Node.js + TypeScript + Express + Socket.io backend for the Minimi Agri
farmer-vet connect platform (Kenya). Implements auth (phone+ID+OTP for
farmers/vets, username+password for admin), service requests, real-time
chat, livestock/crop image capture, M-Pesa payments (mocked, ready for real
Daraja credentials), and admin analytics.

This has been run and smoke-tested end-to-end against a live MySQL/MariaDB
instance — register → login → create request → accept → complete → chat
(live over a socket) → image upload → M-Pesa payment → admin dashboard
reflecting real data. See "Verified flow" below for the exact commands.

## Why raw SQL (mysql2) instead of Prisma Client at runtime

`prisma/schema.prisma` is still here and is the **authoritative schema
reference** — the SQL migration below mirrors it field-for-field. But the
actual runtime code in `src/db/*.repo.ts` uses `mysql2` with hand-written
parameterized SQL instead of a generated Prisma Client.

Why: `prisma generate` needs to download a query-engine binary from
`binaries.prisma.sh`. In the sandbox this was built in, that domain was
blocked by the network allowlist, and no combination of flags
(`--no-engine`, `engineType = "wasm"`, `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING`)
or Prisma version (5.x, 7.x) got around it. Rather than ship untested code,
the runtime data layer was swapped to `mysql2`, which has zero external
download dependency and let every endpoint actually be run and verified.

**If your environment can reach `binaries.prisma.sh`** (most normal dev
machines and CI can), you're free to switch back: run
`npx prisma generate` and `npx prisma migrate dev`, then replace the
`src/db/*.repo.ts` calls in each service file with `prisma.<model>.*` calls
— the schema is identical either way, so it's a mechanical swap.

## Tech stack
- Node.js + TypeScript, Express
- MySQL (via `mysql2`, raw parameterized SQL — see above)
- Socket.io for real-time chat (JWT-authenticated, room-based)
- JWT access + refresh tokens (refresh tokens hashed at rest, rotated on use)
- Multer for local-disk image uploads (swap for S3/Cloudinary in production —
  see `src/modules/uploads/uploads.middleware.ts`)
- M-Pesa Daraja integration point clearly marked and mocked for local dev
  (see `src/modules/payments/payments.service.ts`)
- OTP delivery mocked to console logs (see `src/utils/otp.ts`) — swap in a
  real SMS gateway before production

## Setup

### 1. Database
You need a MySQL or MariaDB server running. Create the database and apply
the schema:

```bash
mysql -u root -e "CREATE DATABASE minimi_agri CHARACTER SET utf8mb4;"
mysql -u root minimi_agri < prisma/migrations/001_init.sql
```

### 2. Environment
```bash
cp .env.example .env
# edit .env: set DATABASE_URL, JWT secrets, ADMIN_SEED_USERNAME/PASSWORD
```

### 3. Install & seed
```bash
npm install
npm run seed   # creates the admin account + a demo approved vet + demo farmer
```

### 4. Run
```bash
npm run dev     # ts-node-dev, auto-restart on change
# or
npm run build && npm start   # production build
```

Server starts on `http://localhost:4000` (or `PORT` from `.env`).
Health check: `GET /health`.

## Verified flow (what was actually tested)

```bash
# Admin login
curl -X POST localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your ADMIN_SEED_PASSWORD>"}'

# Farmer login start — in dev/non-production, the response includes
# "devCode" so you don't need a real SMS gateway to test
curl -X POST localhost:4000/api/auth/farmer/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"254700000002","idNumber":"30000002"}'

# Farmer verify OTP -> get tokens
curl -X POST localhost:4000/api/auth/farmer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"254700000002","idNumber":"30000002","code":"<devCode>"}'

# ...same pattern for vet login (phone 254700000001, idNumber 30000001)

# Farmer creates a request (Authorization: Bearer <farmer accessToken>)
curl -X POST localhost:4000/api/service-requests \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"county":"Kiambu","subCounty":"Ruiru","description":"Cow has a swollen leg","animalOrCropType":"Cattle"}'

# Vet sees it, accepts, completes (Authorization: Bearer <vet accessToken>)
curl localhost:4000/api/vet/requests -H "Authorization: Bearer <vet token>"
curl -X PATCH localhost:4000/api/service-requests/<id>/accept -H "Authorization: Bearer <vet token>"
curl -X PATCH localhost:4000/api/service-requests/<id>/complete -H "Authorization: Bearer <vet token>"

# Farmer pays (mocked STK push)
curl -X POST localhost:4000/api/mpesa/stk-push \
  -H "Content-Type: application/json" -H "Authorization: Bearer <farmer token>" \
  -d '{"requestId":"<id>","amount":1500,"phone":"254700000002"}'

# Simulate Safaricom's callback (dev-only endpoint)
curl -X POST localhost:4000/api/mpesa/simulate-callback \
  -H "Content-Type: application/json" \
  -d '{"checkoutRequestId":"<from stk-push response>","success":true}'

# Admin dashboard now reflects it
curl localhost:4000/api/admin/dashboard/summary -H "Authorization: Bearer <admin token>"
```

Chat was verified over an actual Socket.io connection (not REST) — connect
with `auth: { token: accessToken }`, `emit('join_request_room', { requestId })`,
then `emit('send_message', { requestId, message })`. The other participant,
in the same room, receives `receive_message` in real time, and it's
persisted (`GET /api/chat/:requestId/messages` returns it after).

Image upload was verified with a real multipart POST to
`/api/vet/requests/:id/capture-image` (field name `image`), and the
returned `imageUrl` was confirmed servable via `GET /uploads/captures/...`.

Refresh token rotation and logout revocation were also verified: reusing an
already-rotated or revoked refresh token correctly returns `401`.

## Project structure
```
src/
  app.ts                  # Express app assembly, route mounting
  server.ts                # HTTP + Socket.io entry point
  config/
    env.ts                  # environment variable loading
    db.ts                    # mysql2 connection pool
  db/                          # raw-SQL repository layer, one file per table
    farmers.repo.ts, vets.repo.ts, admins.repo.ts,
    serviceRequests.repo.ts, chatMessages.repo.ts, captureImages.repo.ts,
    payments.repo.ts, otpCodes.repo.ts, refreshTokens.repo.ts
  middleware/
    auth.ts                  # requireAuth, requireRole
    errorHandler.ts            # asyncHandler wrapper, centralized error responses
    rateLimiter.ts               # auth endpoint rate limiting
  modules/
    auth/, farmers/, vets/, service-requests/, chat/, uploads/,
    payments/, admin/, reference/
  sockets/
    index.ts                  # Socket.io server, JWT auth, chat events
    rooms.ts, ioInstance.ts, notify.ts   # room conventions + cross-module emit helper
  utils/
    jwt.ts, otp.ts, AppError.ts
prisma/
  schema.prisma              # authoritative schema reference (see note above)
  migrations/001_init.sql      # hand-written migration actually used at runtime
  seed.ts                        # admin + demo vet/farmer seed script
```

## What's mocked / needs real credentials before production
- **SMS/OTP**: `src/utils/otp.ts` logs the code to console instead of sending
  a real SMS. Swap in Africa's Talking, Twilio SMS, etc.
- **M-Pesa**: `src/modules/payments/payments.service.ts` simulates Daraja's
  STK push response. The real integration point (`callRealDarajaStkPush`) is
  a stub that throws until you add real credentials — see comments there.
  `/api/mpesa/simulate-callback` is a dev-only endpoint to test the full
  payment flow locally; remove or lock it down before deploying.
- **File storage**: images are saved to local disk (`uploads/captures/`) and
  served statically. Swap the multer storage engine in
  `src/modules/uploads/uploads.middleware.ts` for `multer-s3` or similar.

## Known simplifications (documented, not hidden)
- IDs are UUIDs (`crypto.randomUUID()`), not Prisma's default `cuid()` — both
  are fine as primary keys, this just avoids needing the Prisma runtime for
  ID generation too.
- `ChatMessage.senderId` / `Notification.userId` / `OtpCode.userId` /
  `RefreshToken.userId` are plain string columns (not foreign keys), since a
  "sender" or "user" may be either a Farmer or a Vet — the app layer
  resolves them against the correct table using the accompanying `role`
  field. This matches how `prisma/schema.prisma` models it too.
- Reference county/sub-county data (`src/modules/reference/counties.data.ts`)
  covers a representative subset of Kenya's 47 counties for local dev —
  extend it before launch.
#   M i n i m i - B a c k e n d  
 #   M i n i m i - B a c k e n d  
 