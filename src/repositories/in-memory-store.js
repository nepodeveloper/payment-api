import { SUPPORTED_ASSETS } from '../constants/currencies.js';

const seedWallets = {
  cust_demo: {
    USD: '50000.00',
    EUR: '10000.00',
    GBP: '5000.00',
    ZAR: '100000.00',
    JPY: '500000',
    BTC: '1.25000000',
    ETH: '10.00000000',
    USDT: '15000.000000',
    USDC: '15000.000000'
  }
};

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_RETENTION_MS = 5 * 60 * 1000;
const WEBHOOK_EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

function createZeroWallet() {
  return Object.fromEntries(SUPPORTED_ASSETS.map((asset) => [asset, '0']));
}

export class InMemoryStore {
  constructor() {
    this.sweeper = null;
    this.reset();
  }

  reset() {
    this.payments = new Map();
    this.idempotencyKeys = new Map();
    this.quotes = new Map();
    this.webhookEvents = new Map();
    this.wallets = new Map();

    for (const [customerId, balances] of Object.entries(seedWallets)) {
      this.wallets.set(customerId, {
        ...createZeroWallet(),
        ...balances
      });
    }
  }

  ensureWallet(customerId) {
    if (!this.wallets.has(customerId)) {
      this.wallets.set(customerId, createZeroWallet());
    }

    return this.wallets.get(customerId);
  }

  sweepExpired(now = Date.now()) {
    for (const [key, record] of this.idempotencyKeys) {
      if (now - new Date(record.createdAt).getTime() > IDEMPOTENCY_TTL_MS) {
        this.idempotencyKeys.delete(key);
      }
    }

    for (const [id, quote] of this.quotes) {
      const expiresAtMs = new Date(quote.expiresAt).getTime();
      const isResolved = Boolean(quote.usedAt) || expiresAtMs <= now;

      if (isResolved && now - expiresAtMs > QUOTE_RETENTION_MS) {
        this.quotes.delete(id);
      }
    }

    for (const [eventId, recordedAt] of this.webhookEvents) {
      if (now - recordedAt > WEBHOOK_EVENT_TTL_MS) {
        this.webhookEvents.delete(eventId);
      }
    }
  }

  startSweeper(intervalMs = SWEEP_INTERVAL_MS) {
    if (this.sweeper) {
      return this.sweeper;
    }

    this.sweeper = setInterval(() => this.sweepExpired(), intervalMs);

    if (typeof this.sweeper.unref === 'function') {
      this.sweeper.unref();
    }

    return this.sweeper;
  }

  stopSweeper() {
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }
}

export const store = new InMemoryStore();
