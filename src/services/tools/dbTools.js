import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';
import { WeatherSnapshot } from '../../models/WeatherSnapshot.js';
import { ForecastResult } from '../../models/ForecastResult.js';
import { Recommendation } from '../../models/Recommendation.js';
import { Alert } from '../../models/Alert.js';

const plantIdSchema = z.string().min(1);

const saveWeatherSnapshotTool = tool(
  async ({ plantId, source, hourly }) => {
    const doc = await WeatherSnapshot.create({
      plantId: new mongoose.Types.ObjectId(plantId),
      source,
      hourly: (hourly || []).map((h) => ({
        ...h,
        time: new Date(h.time),
      })),
    });
    return JSON.stringify(doc.toJSON());
  },
  {
    name: 'saveWeatherSnapshotTool',
    description: 'Persist a reconciled WeatherSnapshot for a plant.',
    schema: z.object({
      plantId: plantIdSchema,
      source: z.string().optional(),
      hourly: z
        .array(
          z.object({
            time: z.string(),
            cloudCoverPct: z.number().optional(),
            ghiWm2: z.number().optional(),
            dniWm2: z.number().optional(),
            rainProbabilityPct: z.number().optional(),
            temperatureC: z.number().optional(),
            humidityPct: z.number().optional(),
            windSpeedMs: z.number().optional(),
            windDirectionDeg: z.number().optional(),
            windGustMs: z.number().optional(),
            turbulenceIndex: z.number().optional(),
          })
        )
        .default([]),
    }),
  }
);

const getLatestForecastTool = tool(
  async ({ plantId, horizonHours }) => {
    const doc = await ForecastResult.findOne({ plantId, horizonHours }).sort({ generatedAt: -1 });
    return JSON.stringify(doc ? doc.toJSON() : null);
  },
  {
    name: 'getLatestForecastTool',
    description: 'Fetch the latest ForecastResult for a plant and horizonHours.',
    schema: z.object({ plantId: plantIdSchema, horizonHours: z.number().int().min(1).max(72) }),
  }
);

const saveForecastResultTool = tool(
  async ({ plantId, horizonHours, points, riskWindows }) => {
    const doc = await ForecastResult.create({
      plantId: new mongoose.Types.ObjectId(plantId),
      generatedAt: new Date(),
      horizonHours,
      points: (points || []).map((p) => ({ ...p, time: new Date(p.time) })),
      riskWindows: (riskWindows || []).map((w) => ({
        ...w,
        start: w.start ? new Date(w.start) : w.start,
        end: w.end ? new Date(w.end) : w.end,
      })),
    });
    return JSON.stringify(doc.toJSON());
  },
  {
    name: 'saveForecastResultTool',
    description: 'Persist a ForecastResult for a plant.',
    schema: z.object({
      plantId: plantIdSchema,
      horizonHours: z.number().int().min(1).max(72),
      points: z
        .array(
          z.object({
            time: z.string(),
            expectedMW: z.number().optional(),
            lowerBoundMW: z.number().optional(),
            upperBoundMW: z.number().optional(),
            confidencePct: z.number().optional(),
          })
        )
        .default([]),
      riskWindows: z
        .array(
          z.object({
            start: z.string().optional(),
            end: z.string().optional(),
            type: z.enum(['over_generation', 'under_generation', 'operational_risk']).optional(),
          })
        )
        .default([]),
    }),
  }
);

const getLatestRecommendationTool = tool(
  async ({ plantId }) => {
    const doc = await Recommendation.findOne({ plantId }).sort({ generatedAt: -1 });
    return JSON.stringify(doc ? doc.toJSON() : null);
  },
  {
    name: 'getLatestRecommendationTool',
    description: 'Fetch the latest Recommendation for a plant.',
    schema: z.object({ plantId: plantIdSchema }),
  }
);

const saveRecommendationTool = tool(
  async ({ plantId, action, amountMW, durationHours, reasoning, constraintsConsidered }) => {
    const doc = await Recommendation.create({
      plantId: new mongoose.Types.ObjectId(plantId),
      generatedAt: new Date(),
      action,
      amountMW,
      durationHours,
      reasoning,
      constraintsConsidered: constraintsConsidered || [],
    });
    return JSON.stringify(doc.toJSON());
  },
  {
    name: 'saveRecommendationTool',
    description: 'Persist a Recommendation for a plant.',
    schema: z.object({
      plantId: plantIdSchema,
      action: z.enum([
        'charge_battery',
        'discharge_battery',
        'curtail',
        'export',
        'activate_backup',
        'hold',
      ]),
      amountMW: z.number().optional(),
      durationHours: z.number().optional(),
      reasoning: z.string().optional(),
      constraintsConsidered: z.array(z.string()).default([]),
    }),
  }
);

const createAlertTool = tool(
  async ({ plantId, severity, type, message }) => {
    const doc = await Alert.create({
      plantId: new mongoose.Types.ObjectId(plantId),
      severity,
      type,
      message,
      createdAt: new Date(),
      acknowledged: false,
    });
    return JSON.stringify(doc.toJSON());
  },
  {
    name: 'notificationTool',
    description: 'Create a new alert (writes to alerts collection).',
    schema: z.object({
      plantId: plantIdSchema,
      severity: z.enum(['low', 'medium', 'high']),
      type: z.enum(['curtailment_risk', 'shortfall_risk', 'storage_limit', 'sensor_fault', 'extreme_weather']),
      message: z.string(),
    }),
  }
);

export {
  createAlertTool,
  getLatestForecastTool,
  getLatestRecommendationTool,
  saveForecastResultTool,
  saveRecommendationTool,
  saveWeatherSnapshotTool,
};
