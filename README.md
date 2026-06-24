# Crypto Forex Payment API

Node.js REST API for payment operations in a cryptocurrency and forex trading platform. It includes API authentication, request validation, idempotent payment creation, mock quote generation, wallet balance updates, and signed provider webhooks.

This project is intentionally runnable without real banking, custody, exchange, or market-data integrations. The in-memory store and mock rates are adapter points for production infrastructure.

## Stack

- Node.js with Express
- Zod request validation
- Decimal.js money arithmetic
- Helmet, CORS, rate limiting
- Pino HTTP logging
- Node test runner with Supertest
- ESLint flat config

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Default local API token:

```text
dev-secret-token
```

Send authenticated requests with:

```http
Authorization: Bearer dev-secret-token
```

## Scripts

```bash
npm start
npm run dev
npm test
npm run lint
```

The REST contract is documented in `openapi.yaml`.

## Resource Model

Base URL:

```text
http://localhost:3000
```

### Health

```http
GET /health
```

### Currencies

```http
GET /api/v1/currencies
GET /api/v1/currencies?type=fiat
GET /api/v1/currencies?type=crypto
```

### Wallet Balances

```http
GET /api/v1/wallets/{customerId}/balances
```

### Quotes

Create a short-lived conversion quote:

```http
POST /api/v1/quotes
Authorization: Bearer dev-secret-token
Content-Type: application/json

{
  "customerId": "cust_demo",
  "sourceAsset": "USD",
  "targetAsset": "EUR",
  "sourceAmount": "100.00"
}
```

Fetch a quote:

```http
GET /api/v1/quotes/{quoteId}
```

### Payments

Create a fiat deposit:

```http
POST /api/v1/payments
Authorization: Bearer dev-secret-token
Idempotency-Key: deposit-001
Content-Type: application/json

{
  "type": "deposit",
  "customerId": "cust_demo",
  "asset": "USD",
  "amount": "1000.00",
  "rail": "bank_transfer",
  "source": {
    "externalReference": "bank-ref-001"
  }
}
```

Create a crypto withdrawal:

```http
POST /api/v1/payments
Authorization: Bearer dev-secret-token
Idempotency-Key: withdrawal-001
Content-Type: application/json

{
  "type": "withdrawal",
  "customerId": "cust_demo",
  "asset": "BTC",
  "amount": "0.10000000",
  "rail": "crypto_network",
  "destination": {
    "walletAddress": "bc1qexampleaddress000000000000000000000",
    "network": "bitcoin"
  }
}
```

Create a conversion payment with a quote:

```http
POST /api/v1/payments
Authorization: Bearer dev-secret-token
Idempotency-Key: conversion-001
Content-Type: application/json

{
  "type": "conversion",
  "customerId": "cust_demo",
  "sourceAsset": "USD",
  "targetAsset": "EUR",
  "sourceAmount": "100.00",
  "quoteId": "quote_..."
}
```

List payments:

```http
GET /api/v1/payments
GET /api/v1/payments?customerId=cust_demo&status=completed&type=conversion
```

Read or cancel a payment:

```http
GET /api/v1/payments/{paymentId}
POST /api/v1/payments/{paymentId}/cancel
```

### Provider Webhooks

Webhooks are authenticated using HMAC SHA-256 over the raw request body:

```http
x-webhook-signature: sha256=<hex-hmac>
```

Complete a payment:

```http
POST /api/v1/webhooks/providers/{provider}
Content-Type: application/json
x-webhook-signature: sha256=<signature>

{
  "eventId": "evt_001",
  "type": "payment.completed",
  "paymentId": "pay_...",
  "providerReference": "provider-ref-001"
}
```

Fail a payment:

```json
{
  "eventId": "evt_002",
  "type": "payment.failed",
  "paymentId": "pay_...",
  "failureReason": "Provider rejected the transfer."
}
```

## Response Format

Successful responses:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": [],
    "requestId": "..."
  }
}
```

## Production Notes

Before using this for real money movement:

- Replace the in-memory store with a transactional database.
- Use real PSP, custody, blockchain indexing, and market-data adapters.
- Move API auth to OAuth2/JWT or mTLS with scoped permissions.
- Add customer KYC/AML status checks before withdrawals and conversions.
- Add double-entry ledger tables for all wallet mutations.
- Add audit trails, reconciliation jobs, provider retry queues, and alerting.
- Keep webhook secrets and API credentials in a managed secret store.
