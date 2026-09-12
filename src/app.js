import express from 'express';
import cors from 'cors';
import { openApiValidatorSetup } from './middleware/openApiValidatorSetup.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { authRoutes } from './routes/auth.routes.js';
import { plantsRoutes } from './routes/plants.routes.js';
import { mongoose } from './config/db.js';

function createApp() {
  const app = express();

  app.use(
    cors({
      // Make sure browser clients can send Bearer tokens.
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // Outside of /v1: deployment health check.
  app.get('/health', (req, res) => {
    const dbReady = mongoose.connection?.readyState === 1;
    res.status(200).json({ ok: true, db: dbReady ? 'connected' : 'disconnected' });
  });

  // Versioned API.
  const api = express.Router();
  api.use(openApiValidatorSetup());

  // Public route group.
  api.use('/auth', authRoutes);

  // Everything else requires JWT.
  api.use(authMiddleware);
  api.use('/plants', plantsRoutes);

  app.use('/v1', api);

  // Fallthrough 404 in API.
  app.use('/v1', (req, res) => {
    res.status(404).json({ error: true, message: 'Resource not found' });
  });

  app.use(errorHandler);

  return app;
}

export { createApp };
