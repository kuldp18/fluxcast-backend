import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

// In dev, allow a default JWT secret for faster local iteration.
// In prod, require it.
const JWT_SECRET =
  process.env.JWT_SECRET || (NODE_ENV === 'production' ? required('JWT_SECRET') : 'dev-secret');

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = required('MONGO_URI');
const OPENAPI_VALIDATE_RESPONSES = process.env.OPENAPI_VALIDATE_RESPONSES === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MONGO_CONNECT_RETRIES = Number(process.env.MONGO_CONNECT_RETRIES || 8);
const MONGO_CONNECT_TIMEOUT_MS = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15_000);

export {
  JWT_SECRET,
  MONGO_CONNECT_RETRIES,
  MONGO_CONNECT_TIMEOUT_MS,
  MONGO_URI,
  NODE_ENV,
  OPENAPI_VALIDATE_RESPONSES,
  OPENAI_API_KEY,
  PORT,
};
