import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { fetchOpenMeteoHourly } from '../connectors/openMeteoConnector.js';
import { fetchMosdacHourly } from '../connectors/mosdacConnector.js';
import { fetchNasaPowerHourly } from '../connectors/nasaPowerConnector.js';

const weatherInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  hours: z.number().int().min(1).max(72).default(72),
  elevation: z.number().optional(),
});

const openMeteoTool = tool(
  async (input) => {
    const out = await fetchOpenMeteoHourly(input);
    return JSON.stringify(out);
  },
  {
    name: 'openMeteoTool',
    description:
      'Fetch hourly weather forecast (cloud cover, irradiance, wind, rain probability, temperature, humidity) for a given latitude/longitude and horizon in hours.',
    schema: weatherInputSchema,
  }
);

const mosdacTool = tool(
  async () => {
    const out = await fetchMosdacHourly();
    return JSON.stringify(out);
  },
  {
    name: 'mosdacTool',
    description:
      'Fetch ISRO MOSDAC satellite-derived weather signals for a location. Currently a stub returning an empty dataset so workflows can fall back.',
    schema: weatherInputSchema,
  }
);

const nasaGisTool = tool(
  async (input) => {
    // Best-effort using NASA POWER hourly endpoint.
    const out = await fetchNasaPowerHourly(input);
    return JSON.stringify(out);
  },
  {
    name: 'nasaGisTool',
    description:
      'Fetch supporting NASA satellite/model weather data for a location (best-effort via NASA POWER).',
    schema: weatherInputSchema,
  }
);

export { openMeteoTool, mosdacTool, nasaGisTool };
