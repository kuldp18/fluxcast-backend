import axios from 'axios';

/**
 * Fetch hourly forecast from Open-Meteo.
 * Returns a normalized object shaped like the OpenAPI WeatherSnapshot.
 *
 * @param {{ latitude: number, longitude: number, hours: number }} params
 */
async function fetchOpenMeteoHourly({ latitude, longitude, hours }) {
  const horizon = Math.max(1, Math.min(72, Number(hours || 72)));

  // Open-Meteo hourly fields:
  // https://open-meteo.com/en/docs
  const hourly = [
    'cloud_cover',
    'shortwave_radiation',
    'direct_normal_irradiance',
    'precipitation_probability',
    'temperature_2m',
    'relative_humidity_2m',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
  ].join(',');

  const url = 'https://api.open-meteo.com/v1/forecast';
  const resp = await axios.get(url, {
    timeout: 15_000,
    params: {
      latitude,
      longitude,
      hourly,
      forecast_hours: horizon,
      timezone: 'UTC',
    },
  });

  const data = resp.data;
  const times = data?.hourly?.time || [];
  const cloud = data?.hourly?.cloud_cover || [];
  const swr = data?.hourly?.shortwave_radiation || [];
  const dni = data?.hourly?.direct_normal_irradiance || [];
  const pop = data?.hourly?.precipitation_probability || [];
  const temp = data?.hourly?.temperature_2m || [];
  const rh = data?.hourly?.relative_humidity_2m || [];
  const windSpd = data?.hourly?.wind_speed_10m || [];
  const windDir = data?.hourly?.wind_direction_10m || [];
  const gust = data?.hourly?.wind_gusts_10m || [];

  const hourlyOut = times.map((t, i) => ({
    time: new Date(t).toISOString(),
    cloudCoverPct: cloud[i],
    // Best-effort mapping: Open-Meteo shortwave radiation is a good proxy for GHI.
    ghiWm2: swr[i],
    dniWm2: dni[i],
    rainProbabilityPct: pop[i],
    temperatureC: temp[i],
    humidityPct: rh[i],
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
