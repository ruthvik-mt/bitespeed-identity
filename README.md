# Bitespeed Identity Reconciliation

A Node.js + TypeScript web service that identifies and reconciles customer identities across multiple purchases using shared email/phone number information.

## 🚀 Hosted Endpoint

> **Base URL:** `https://bitespeed-identity.onrender.com`
>
> **Identify Endpoint:** `POST https://bitespeed-identity.onrender.com/identify`

---

## 📋 API Reference

### `POST /identify`

Consolidates contact information for a customer.

**Request Body (JSON):**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
At least one of `email` or `phoneNumber` must be provided.

**Response (200 OK):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [23, 45]
  }
}
```

### Example

```bash
curl -X POST https://bitespeed-identity.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

---

## 🧠 How It Works

The service implements the following logic:

1. **No match found** → Creates a new `primary` contact and returns it.
2. **Match found, no new info** → Returns the consolidated contact group.
3. **Match found, new info** → Creates a new `secondary` contact linked to the oldest primary.
4. **Two separate primaries linked** → Demotes the newer primary to `secondary`, merges all their contacts under the oldest primary.

---

## 🗄️ Database Schema

PostgreSQL database with the `Contact` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment ID |
| `phoneNumber` | TEXT | Optional phone number |
| `email` | TEXT | Optional email address |
| `linkedId` | INTEGER | FK to primary contact's ID |
| `linkPrecedence` | TEXT | `"primary"` or `"secondary"` |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL database (or use a free cloud DB like [Neon](https://neon.tech))

### Setup

```bash
# Clone the repo
git clone https://github.com/ruthvik-mt/bitespeed-identity.git
cd bitespeed-identity

# Install dependencies
npm install

# Set environment variable
export DATABASE_URL="your_postgres_connection_string"

# Run in development mode
npm run dev
```

Server starts at `http://localhost:3000`

### Build & Run Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
bitespeed-identity/
├── src/
│   ├── index.ts            # Express app + route definitions
│   ├── database.ts         # PostgreSQL setup + Contact interface
│   └── identifyService.ts  # Core identity reconciliation logic
├── dist/                   # Compiled JS output
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🌐 Deployment (Render.com)

This app is deployed on [Render](https://render.com) as a free web service with a free PostgreSQL database.

**Environment:** Node.js  
**Build Command:** `npm install && npm run build`  
**Start Command:** `npm start`  
**Environment Variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — `production`

---

## Tech Stack

- **Runtime:** Node.js 18
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg`)
- **Hosting:** Render.com