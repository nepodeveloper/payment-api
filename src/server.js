import { createApp } from './app.js';
import { env } from './config/env.js';
import { store } from './repositories/in-memory-store.js';

const app = createApp();
store.startSweeper();
const server = app.listen(env.PORT, () => {
  console.info(`Payment API listening on port ${env.PORT}`);
});

function shutdown(signal) {
  console.info(`${signal} received. Shutting down payment API.`);
  store.stopSweeper();
  server.close(() => {
    console.info('Payment API stopped.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
