import mongoose from 'mongoose';
import { MONGO_CONNECT_RETRIES, MONGO_CONNECT_TIMEOUT_MS } from './env.js';

/**
 * @param {{ mongoUri: string }} opts
 */
async function connectDb({ mongoUri }) {
  mongoose.set('strictQuery', true);

  // Atlas TLS handshakes can fail transiently on some networks.
  // Retry before failing the process.
  let lastErr;
  const retries = Number.isFinite(MONGO_CONNECT_RETRIES) ? MONGO_CONNECT_RETRIES : 8;
  const connectTimeoutMs = Number.isFinite(MONGO_CONNECT_TIMEOUT_MS) ? MONGO_CONNECT_TIMEOUT_MS : 15_000;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: connectTimeoutMs,
        connectTimeoutMS: connectTimeoutMs,
      });
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      // eslint-disable-next-line no-console
      console.error(
        `MongoDB connect failed (attempt ${attempt}/${retries}): ${err?.message || err}`
      );
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, Math.min(10_000, 500 * attempt)));
    }
  }

  throw lastErr;
}

export { connectDb, mongoose };
