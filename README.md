# Minimi Agri Backend

Backend API for **Minimi Agri**, a farmer-veterinarian connection platform built for the Kenyan agricultural ecosystem.

Built with Node.js, TypeScript, Express and MySQL, the backend provides authentication, farmer and veterinarian management, service requests, real-time communication, image uploads, payments and administrative analytics.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture and Database](#architecture-and-database)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [API Verification](#api-verification)
- [Real-Time Communication](#real-time-communication)
- [Development Integrations](#development-integrations)
- [Production Readiness](#production-readiness)
- [Known Simplifications](#known-simplifications)

---

## Overview

Minimi Agri connects farmers with veterinary and agricultural service providers through a digital platform.

The backend supports:

- Farmer and veterinarian authentication.
- Administrative authentication and management.
- Agricultural and veterinary service requests.
- Request assignment, acceptance and completion.
- Real-time chat between farmers and service providers.
- Livestock and crop image capture.
- M-Pesa payment workflows.
- Farmer and veterinarian wallets.
- Subscription management.
- Administrative dashboards and analytics.

## Features

| Module | Description |
|---|---|
| Authentication | Phone number, national ID and OTP authentication for farmers and veterinarians |
| Administration | Username and password authentication for administrators |
| Farmers | Farmer registration and profile management |
| Veterinarians | Veterinarian profiles and service management |
| Service Requests | Creation, acceptance and completion of service requests |
| Real-Time Chat | Socket.IO messaging between service participants |
| Image Uploads | Livestock and crop image capture and storage |
| Payments | M-Pesa STK Push integration point |
| Wallets | Wallet-related operations |
| Subscriptions | Subscription management |
| Analytics | Administrative dashboard and reporting |
| Reference Data | County and sub-county information |

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| TypeScript | Application development |
| Express.js | REST API framework |
| MySQL / MariaDB | Relational database |
| mysql2 | Database connectivity and SQL queries |
| Socket.IO | Real-time communication |
| JWT | Authentication and authorization |
| bcryptjs | Password hashing |
| Zod | Input validation |
| Multer | File uploads |
| Helmet | HTTP security headers |
| CORS | Cross-origin configuration |
| Swagger UI | API documentation |
| dotenv | Environment configuration |

---

## Architecture and Database

The application uses a modular Express architecture with a repository-based data access layer.

### Database implementation

The runtime application uses **MySQL through mysql2**, with parameterized SQL queries.

Prisma remains in the project as the authoritative database schema reference.

The application does not require Prisma Client at runtime.

This implementation was selected because the development environment used to build and verify the application could not download Prisma's query-engine binaries. Using mysql2 allowed the database operations and application workflows to be tested without that dependency.

### Database components

- `prisma/schema.prisma`: Authoritative database schema.
- `prisma/migrations/001_init.sql`: SQL migration used to initialize the database.
- `src/db/`: Repository layer containing parameterized SQL operations.
- `src/config/db.ts`: Database connection configuration.

---

## Project Structure

```text
Minimi-Backend/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       └── 001_init.sql
│
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   │
│   ├── db/
│   │   ├── farmers.repo.ts
│   │   ├── vets.repo.ts
│   │   ├── admins.repo.ts
│   │   ├── serviceRequests.repo.ts
│   │   ├── chatMessages.repo.ts
│   │   ├── captureImages.repo.ts
│   │   ├── payments.repo.ts
│   │   ├── otpCodes.repo.ts
│   │   └── refreshTokens.repo.ts
│   │
│   ├── middleware/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── farmers/
│   │   ├── vets/
│   │   ├── service-requests/
│   │   ├── chat/
│   │   ├── uploads/
│   │   ├── payments/
│   │   ├── admin/
│   │   ├── reference/
│   │   ├── subscriptions/
│   │   └── wallets/
│   │
│   ├── sockets/
│   │   ├── index.ts
│   │   ├── rooms.ts
│   │   ├── ioInstance.ts
│   │   └── notify.ts
│   │
│   ├── utils/
│   │
│   ├── app.ts
│   ├── server.ts
│   └── swagger.ts
│
├── uploads/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

Ensure the following are installed:

- Node.js (LTS recommended).
- npm.
- MySQL 8+ or a compatible MariaDB installation.
- Git.

Verify your installations:

```bash
node --version
npm --version
mysql --version
```

---

## Local Development Setup

Clone the repository:

```bash
git clone https://github.com/millersofia870-alt/Minimi-Backend.git

cd Minimi-Backend
```

Install dependencies:

```bash
npm install
```

Create the environment configuration:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure the environment variables before proceeding.

---

## Environment Configuration

The application uses environment variables for its runtime configuration.

Example configuration:

```env
# Server
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Database
DATABASE_URL=mysql://username:password@127.0.0.1:3306/minimi_agri

# Authentication
JWT_ACCESS_SECRET=replace-with-a-secure-random-secret
JWT_REFRESH_SECRET=replace-with-another-secure-random-secret

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Administrator
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_PASSWORD=replace-with-a-secure-password

# OTP
OTP_EXPIRES_MINUTES=5

# M-Pesa
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=

MPESA_SANDBOX_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_PRODUCTION_BASE_URL=https://api.safaricom.co.ke

# Uploads
UPLOAD_DIR=uploads
```

**Security:** Never commit `.env` files, production credentials, private keys or database passwords to GitHub.

---

## Database Setup

Create the database:

```sql
CREATE DATABASE minimi_agri
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Apply the initial migration:

```bash
mysql -u root -p minimi_agri < prisma/migrations/001_init.sql
```

Update `DATABASE_URL` in `.env` to match your local database credentials.

---

## Running the Application

### Development

```bash
npm run dev
```

The development server uses `ts-node-dev` and automatically restarts when source files change.

### Production build

Compile TypeScript:

```bash
npm run build
```

Start the compiled application:

```bash
npm start
```

### Database seeding

Run:

```bash
npm run seed
```

The seed script initializes the administrator account and development demonstration records.

### Health check

Once the server is running:

```http
GET http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "time": "2026-11-06T00:00:00.000Z"
}
```

The timestamp will reflect the actual server time.

---

## API Documentation

Swagger UI is integrated into the application.

Once the server is running, inspect the API documentation at the configured Swagger endpoint.

### Main API route groups

| Route | Module |
|---|---|
| `/api/auth` | Authentication |
| `/api/farmer` | Farmer operations |
| `/api/vet` | Veterinarian operations |
| `/api/vets` | Veterinarian discovery |
| `/api/service-requests` | Service requests |
| `/api/chat` | Chat |
| `/api/mpesa` | M-Pesa payments |
| `/api/payments` | Payment operations |
| `/api/admin` | Administration |
| `/api/reference` | Reference data |
| `/api/subscriptions` | Subscriptions |

---

## API Verification

The following workflows were previously smoke-tested against a MySQL/MariaDB database.

They should be reproduced in the local development environment before deployment.

### 1. Administrator login

```bash
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
```

### 2. Farmer authentication

Initiate login:

```bash
curl -X POST http://localhost:4000/api/auth/farmer/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"254700000002","idNumber":"30000002"}'
```

In development mode, the OTP response includes a development code.

Verify OTP:

```bash
curl -X POST http://localhost:4000/api/auth/farmer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"254700000002","idNumber":"30000002","code":"YOUR_OTP"}'
```

The same authentication pattern applies to veterinarians.

### 3. Create a service request

```bash
curl -X POST http://localhost:4000/api/service-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FARMER_TOKEN" \
  -d '{
    "county": "Kiambu",
    "subCounty": "Ruiru",
    "description": "Cow has a swollen leg",
    "animalOrCropType": "Cattle"
  }'
```

### 4. Veterinarian request management

Retrieve requests:

```bash
curl http://localhost:4000/api/vet/requests \
  -H "Authorization: Bearer YOUR_VET_TOKEN"
```

Accept a request:

```bash
curl -X PATCH http://localhost:4000/api/service-requests/REQUEST_ID/accept \
  -H "Authorization: Bearer YOUR_VET_TOKEN"
```

Complete a request:

```bash
curl -X PATCH http://localhost:4000/api/service-requests/REQUEST_ID/complete \
  -H "Authorization: Bearer YOUR_VET_TOKEN"
```

### 5. M-Pesa payment simulation

Initiate an STK Push:

```bash
curl -X POST http://localhost:4000/api/mpesa/stk-push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FARMER_TOKEN" \
  -d '{
    "requestId": "REQUEST_ID",
    "amount": 1500,
    "phone": "254700000002"
  }'
```

Simulate a successful payment callback in development:

```bash
curl -X POST http://localhost:4000/api/mpesa/simulate-callback \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutRequestId": "CHECKOUT_REQUEST_ID",
    "success": true
  }'
```

### 6. Administrative analytics

Retrieve the dashboard summary:

```bash
curl http://localhost:4000/api/admin/dashboard/summary \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Real-Time Communication

The application uses Socket.IO for real-time chat.

Connections are authenticated using JWT access tokens.

### Connection

```javascript
const socket = io("http://localhost:4000", {
  auth: {
    token: accessToken
  }
});
```

### Join a service request room

```javascript
socket.emit("join_request_room", {
  requestId
});
```

### Send a message

```javascript
socket.emit("send_message", {
  requestId,
  message: "Your message here"
});
```

### Receive messages

```javascript
socket.on("receive_message", (message) => {
  console.log(message);
});
```

Messages are persisted in the database and can subsequently be retrieved through the chat API.

---

## Development Integrations

Some external integrations are currently simulated for local development.

| Integration | Current implementation | Production requirement |
|---|---|---|
| SMS / OTP | Development OTP logged to console | Integrate an SMS gateway |
| M-Pesa | Mocked STK Push | Implement and verify real Daraja API integration |
| Image storage | Local filesystem | Configure persistent or cloud object storage |
| Database | MySQL/MariaDB | Configure production database infrastructure |

### SMS / OTP

The current implementation logs OTP codes to the server console.

The integration point is:

`src/utils/otp.ts`

A production SMS provider such as Africa's Talking or Twilio can be integrated here.

### M-Pesa

The payment service currently simulates STK Push responses.

Implementation location:

`src/modules/payments/payments.service.ts`

The `callRealDarajaStkPush` integration point is currently a stub.

The development-only `/api/mpesa/simulate-callback` endpoint must be removed or securely disabled before production.

### File Storage

Uploaded images are currently stored locally.

Implementation location:

`src/modules/uploads/uploads.middleware.ts`

Production deployment should use persistent storage or a cloud object storage provider.

---

## Production Readiness

Before production deployment, verify the following:

- [ ] Replace development OTP delivery with a real SMS provider.
- [ ] Implement and test real M-Pesa Daraja integration.
- [ ] Secure M-Pesa callback verification.
- [ ] Disable development-only payment simulation endpoints.
- [ ] Configure production JWT secrets.
- [ ] Review authentication and authorization rules.
- [ ] Configure persistent image storage.
- [ ] Extend county and sub-county reference data to cover all 47 Kenyan counties.
- [ ] Configure production CORS origins.
- [ ] Configure HTTPS and reverse proxy.
- [ ] Configure database backups and recovery.
- [ ] Verify application logging and monitoring.
- [ ] Execute end-to-end production acceptance tests.

---

## Known Simplifications

The following implementation decisions are documented.

### UUID identifiers

Application-generated IDs use `crypto.randomUUID()` instead of Prisma's default CUID identifiers.

### Cross-role references

Some records, including chat messages, notifications, OTP codes and refresh tokens, use plain string user identifiers rather than direct foreign keys.

This supports references to both farmers and veterinarians, with the application resolving the associated user through the role field.

### Reference data

The current county and sub-county dataset is a representative subset of Kenya's 47 counties.

It should be expanded and verified before launch.

---

## Project Status

Minimi Agri Backend provides the foundation for the farmer-veterinarian connection platform.

The next development phase focuses on:

1. Reproducing the verified workflows locally.
2. Completing external service integrations.
3. Reviewing security and production configurations.
4. Conducting full application acceptance testing.
5. Preparing deployment infrastructure.

**Minimi Agri | Backend API**
