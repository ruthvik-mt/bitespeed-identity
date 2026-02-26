# Bitespeed Identity Reconciliation

A REST API service built for the Bitespeed backend task. It identifies and links customer contacts across multiple purchases, even when different emails or phone numbers are used.

## Live Endpoint

**Base URL:** `https://bitespeed-identity-ss9r.onrender.com`

```
POST https://bitespeed-identity-ss9r.onrender.com/identify
```

## API

### POST /identify

**Request body:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
At least one of `email` or `phoneNumber` is required.

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

## How it works

- If no existing contact matches the request, a new primary contact is created.
- If a match is found with new information, a secondary contact is created and linked to the primary.
- If the request links two previously separate primary contacts, the newer one is demoted to secondary and all its contacts are merged under the older primary.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (hosted on Render)

## Project Structure

```
src/
  index.ts           - Express server and route setup
  database.ts        - PostgreSQL connection and schema
  identifyService.ts - Identity reconciliation logic
```

## Running locally

```bash
git clone https://github.com/ruthvik-mt/bitespeed-identity.git
cd bitespeed-identity
npm install
```

Set your environment variable:
```bash
export DATABASE_URL="your_postgres_connection_string"
```

Then:
```bash
npm run dev
```

## Deployment

Hosted on Render.com with a free PostgreSQL instance.

Build command: `npm install && npm run build`  
Start command: `npm start`

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - set to `production`