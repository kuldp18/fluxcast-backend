import axios from 'axios';

function toIsoTime(t) {
  // Prefer unix timestamps to avoid timezone parsing ambiguity.
  if (typeof t === 'number' && Number.isFinite(t)) return new Date(t * 1000).toISOString();
  return new Date(t).toISOString();
}

/**
 * Fetch hourly forecast from Open-Meteo.
 * Returns a normalized object shaped like the OpenAPI WeatherSnapshot.
 *
 * Uses the Fluxcast-required request params:
 * - forecast_hours
 * - timezone=auto
 * - temperature_unit=celsius
 * - wind_speed_unit=ms
 * - precipitation_unit=mm
 * - cell_selection=land
 *
 * @param {{ latitude: number, longitude: number, hours: number, elevation?: number }} params
 */
async function fetchOpenMeteoHourly({ latitude, longitude, hours, elevation }) {
  const horizon = Math.max(1, Math.min(72, Number(hours || 72)));

  // Open-Meteo hourly fields:
  // https://open-meteo.com/en/docs
  // Minimal solar+met variables required by the platform (lowercase_with_underscores).
  const hourlyVars = [
    'temperature_2m',
    'relative_humidity_2m',
    'cloud_cover',
    'precipitation_probability',
    'precipitation',
    'shortwave_radiation',
    'direct_radiation',
    'diffuse_radiation',
    'direct_normal_irradiance',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
  ];

  const hourly = hourlyVars.join(',');

  const url = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';
  const apiKey = process.env.OPEN_METEO_API_KEY;
  const resp = await axios.get(url, {
    timeout: 15_000,
    params: {
      latitude,
      longitude,
      hourly,
      forecast_hours: horizon,
      timezone: 'auto',
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms',
      precipitation_unit: 'mm',
      cell_selection: 'land',
      timeformat: 'unixtime',
      ...(Number.isFinite(Number(elevation)) ? { elevation: Number(elevation) } : {}),
      ...(apiKey ? { apikey: apiKey } : {}),
    },
  });

  const data = resp.data;
  const times = data?.hourly?.time || [];
  const temp = data?.hourly?.temperature_2m || [];
  const rh = data?.hourly?.relative_humidity_2m || [];
  const cloud = data?.hourly?.cloud_cover || [];
  const pop = data?.hourly?.precipitation_probability || [];
  const precip = data?.hourly?.precipitation || [];
  const swr = data?.hourly?.shortwave_radiation || [];
  const directRad = data?.hourly?.direct_radiation || [];
  const diffuseRad = data?.hourly?.diffuse_radiation || [];
  const dni = data?.hourly?.direct_normal_irradiance || [];
  const windSpd = data?.hourly?.wind_speed_10m || [];
  const windDir = data?.hourly?.wind_direction_10m || [];
  const gust = data?.hourly?.wind_gusts_10m || [];

  const hourlyOut = times.map((t, i) => ({
    time: toIsoTime(t),
    temperatureC: temp[i],
    humidityPct: rh[i],
    cloudCoverPct: cloud[i],
    rainProbabilityPct: pop[i],
    // Extra inputs for modeling/debugging (kept internal by API serializer)
    precipitationMm: precip[i],
    ghiWm2: swr[i],
    directRadiationWm2: directRad[i],
    diffuseRadiationWm2: diffuseRad[i],
    dniWm2: dni[i],
    windSpeedMs: windSpd[i],
    windDirectionDeg: windDir[i],
    windGustMs: gust[i],
    // turbulenceIndex not provided by Open-Meteo; omit.
  }));

  return {
    source: 'open-meteo',
    hourly: hourlyOut,
  };
}

export { fetchOpenMeteoHourly };
