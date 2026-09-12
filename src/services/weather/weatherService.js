import { retry } from '../utils/retry.js';
import { fetchOpenMeteoHourly } from '../connectors/openMeteoConnector.js';
import { fetchMosdacHourly } from '../connectors/mosdacConnector.js';
import { fetchNasaPowerHourly } from '../connectors/nasaPowerConnector.js';
import { reconcileWeather } from './reconcileWeather.js';

async function safeFetch(name, weight, fn) {
  try {
    const out = await retry(fn, { retries: 2, baseDelayMs: 500 });
    return { ok: true, name, weight, hourly: out?.hourly || [] };
  } catch (err) {
    return { ok: false, name, weight, error: err };
  }
}

/**
 * @param {{ latitude: number, longitude: number, hours: number, elevation?: number }} params
 */
async function getReconciledWeather({ latitude, longitude, hours, elevation }) {
  const horizon = Math.max(1, Math.min(72, Number(hours || 72)));

  const [openMeteo, mosdac, nasa] = await Promise.all([
    safeFetch('open-meteo', 0.55, () =>
      fetchOpenMeteoHourly({ latitude, longitude, hours: horizon, elevation })
    ),
    safeFetch('mosdac', 0.25, () => fetchMosdacHourly({ latitude, longitude, hours: horizon })),
    safeFetch('nasa-power', 0.2, () => fetchNasaPowerHourly({ latitude, longitude, hours: horizon })),
  ]);

  const reconciled = reconcileWeather({
    providers: [
      { name: openMeteo.name, weight: openMeteo.weight, hourly: openMeteo.hourly },
      { name: mosdac.name, weight: mosdac.weight, hourly: mosdac.hourly },
      { name: nasa.name, weight: nasa.weight, hourly: nasa.hourly },
    ],
  });

  return {
    source: reconciled.source,
    hourly: reconciled.hourly.slice(0, horizon),
    providerStatus: { openMeteo, mosdac, nasa },
  };
}

export { getReconciledWeather };
