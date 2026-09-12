import express from 'express';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { Plant } from '../models/Plant.js';
import { Telemetry } from '../models/Telemetry.js';
import { WeatherSnapshot } from '../models/WeatherSnapshot.js';
import { getReconciledWeather } from '../services/weather/weatherService.js';
import { ForecastResult } from '../models/ForecastResult.js';
import { ForecastJob } from '../models/ForecastJob.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;

    const [total, plants] = await Promise.all([
      Plant.countDocuments(filter),
      Plant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({ total, plants: plants.map((p) => p.toJSON()) });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const plant = await Plant.create(req.body);
    return res.status(201).json(plant.toJSON());
  } catch (err) {
    return next(err);
  }
});

router.get('/:plantId', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    return res.status(200).json(plant.toJSON());
  } catch (err) {
    return next(err);
  }
});

router.patch('/:plantId', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const plant = await Plant.findByIdAndUpdate(plantId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plant) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    return res.status(200).json(plant.toJSON());
  } catch (err) {
    return next(err);
  }
});

router.delete('/:plantId', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const plant = await Plant.findByIdAndDelete(plantId);
    if (!plant) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/:plantId/telemetry', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const days = Math.max(1, Math.min(30, Number(req.query.days || 4)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const points = await Telemetry.find({ plantId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .lean();

    // Response shape must match TelemetryPoint (no plantId field).
    return res.status(200).json(
      points.map((p) => ({
        timestamp: new Date(p.timestamp).toISOString(),
        generationMW: p.generationMW,
        sensorStatus: p.sensorStatus,
        outage: p.outage,
      }))
    );
  } catch (err) {
    return next(err);
  }
});

router.post('/:plantId/telemetry', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const plantExists = await Plant.exists({ _id: plantId });
    if (!plantExists) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const payload = {
      plantId,
      timestamp: new Date(req.body.timestamp),
      generationMW: req.body.generationMW,
      sensorStatus: req.body.sensorStatus,
      outage: req.body.outage,
    };

    await Telemetry.create(payload);
    return res.status(201).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/:plantId/weather', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const plant = await Plant.findById(plantId).lean();
    if (!plant) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const hours = Math.max(1, Math.min(72, Number(req.query.hours || 72)));

    const { source, hourly } = await getReconciledWeather({
      latitude: plant.latitude,
      longitude: plant.longitude,
      hours,
    });

    const doc = await WeatherSnapshot.create({
      plantId,
      source,
      hourly: (hourly || []).map((h) => ({
        ...h,
        time: new Date(h.time),
      })),
    });

    return res.status(200).json(doc.toJSON());
  } catch (err) {
    return next(err);
  }
});

router.get('/:plantId/forecast', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const horizon = Number(req.query.horizon || 24);
    if (![24, 48, 72].includes(horizon)) {
      return res.status(400).json({ error: true, message: 'Invalid horizon' });
    }

    const plantExists = await Plant.exists({ _id: plantId });
    if (!plantExists) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    let doc = await ForecastResult.findOne({ plantId, horizonHours: horizon }).sort({
      generatedAt: -1,
    });

    if (!doc) return res.status(404).json({ error: true, message: 'Resource not found' });

    return res.status(200).json(doc.toJSON());
  } catch (err) {
    return next(err);
  }
});

router.post('/:plantId/forecast', async (req, res, next) => {
  try {
    const { plantId } = req.params;
    if (!mongoose.isValidObjectId(plantId)) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const horizon = Number(req.body?.horizon || 24);
    if (![24, 48, 72].includes(horizon)) {
      return res.status(400).json({ error: true, message: 'Invalid horizon' });
    }

    const plant = await Plant.findById(plantId).lean();
    if (!plant) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }

    const jobId = crypto.randomUUID();

    // Record the job. A worker/graph should pick this up and persist ForecastResult.
    // We intentionally do not generate "dummy" forecasts here.
    await ForecastJob.create({
      _id: jobId,
      plantId,
      horizonHours: horizon,
      status: 'queued',
      createdAt: new Date(),
    });

    return res.status(202).json({ jobId, status: 'queued' });
  } catch (err) {
    return next(err);
  }
});

export const plantsRoutes = router;
