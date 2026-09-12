import axios from 'axios';

function yyyymmdd(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function parsePowerHourKey(key) {
  // Key format: YYYYMMDDHH
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(4, 6));
  const day = Number(key.slice(6, 8));
  const hour = Number(key.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

/**
 * Best-effort NASA POWER hourly weather. This is not GIS layers, but provides
 * satellite/model-derived radiation and meteorological fields.
 *
 * @param {{ latitude: number, longitude: number, hours: number }} params
 */
async function fetchNasaPowerHourly({ latitude, longitude, hours }) {
  const horizon = Math.max(1, Math.min(72, Number(hours || 72)));
  const start = new Date();
  const end = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  // NASA POWER needs date range, not "next N hours".
  const params = [
    'T2M',
    'RH2M',
    'WS10M',
    'WD10M',
    'ALLSKY_SFC_SW_DWN',
  ].join(',');

  const url = 'https://power.larc.nasa.gov/api/temporal/hourly/point';
  const resp = await axios.get(url, {
    timeout: 15_000,
    params: {
      latitude,
      longitude,
      start: yyyymmdd(start),
      end: yyyymmdd(end),
      community: 'RE',
      parameters: params,
      format: 'JSON',
    },
  });

  const p = resp.data?.properties?.parameter || {};
  const keys = new Set();
  for (const v of Object.values(p)) {
    for (const k of Object.keys(v || {})) keys.add(k);
  }

  const sortedKeys = Array.from(keys).sort();

  const hourly = sortedKeys
    .map((k) => {
      const time = parsePowerHourKey(k);

      const t2m = p?.T2M?.[k];
      const rh2m = p?.RH2M?.[k];
      const ws10m = p?.WS10M?.[k];
      const wd10m = p?.WD10M?.[k];
      const sw = p?.ALLSKY_SFC_SW_DWN?.[k];

      // POWER provides ALLSKY_SFC_SW_DWN as energy (kWh/m^2) for the hour.
      // Convert to a W/m^2 average over the hour (best-effort): kWh/m^2 -> Wh/m^2 -> W/m^2.
      const ghiWm2 = typeof sw === 'number' ? sw * 1000 : undefined;

      return {
        time: time.toISOString(),
        temperatureC: typeof t2m === 'number' ? t2m : undefined,
        humidityPct: typeof rh2m === 'number' ? rh2m : undefined,
        windSpeedMs: typeof ws10m === 'number' ? ws10m : undefined,
        windDirectionDeg: typeof wd10m === 'number' ? wd10m : undefined,
        ghiWm2,
      };
    })
    .filter((h) => !Number.isNaN(new Date(h.time).getTime()))
    .slice(0, horizon);

  return {
    source: 'nasa-power',
    hourly,
  };
}

export { fetchNasaPowerHourly };
