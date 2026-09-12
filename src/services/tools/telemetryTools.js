import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Telemetry } from '../../models/Telemetry.js';

const telemetryTool = tool(
  async ({ plantId, days }) => {
    const d = Math.max(1, Math.min(30, Number(days || 4)));
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    const points = await Telemetry.find({
      plantId: new mongoose.Types.ObjectId(plantId),
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .lean();

    return JSON.stringify(
      points.map((p) => ({
        timestamp: new Date(p.timestamp).toISOString(),
        generationMW: p.generationMW,
        sensorStatus: p.sensorStatus,
        outage: p.outage,
      }))
    );
  },
  {
    name: 'telemetryTool',
    description: "Read a plant's recent actual generation output and sensor status for the last N days.",
    schema: z.object({
      plantId: z.string().min(1),
      days: z.number().int().min(1).max(30).default(4),
    }),
  }
);

export { telemetryTool };
