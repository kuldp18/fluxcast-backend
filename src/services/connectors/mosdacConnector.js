/**
 * MOSDAC does not have a simple public JSON API like Open-Meteo.
 * This connector is a placeholder so toolchains can fall back gracefully.
 */
import axios from 'axios';

/**
 * Optional integration hook:
 * If MOSDAC_JSON_URL is set, we will GET it and expect either:
 * - { hourly: [...] }
 * - { data: { hourly: [...] } }
 *
 * Otherwise we return an empty dataset.
 */
async function fetchMosdacHourly() {
  const url = process.env.MOSDAC_JSON_URL;
  if (!url) {
    return {
      source: 'mosdac (unavailable)',
      hourly: [],
    };
  }

  const resp = await axios.get(url, { timeout: 15_000 });
  const hourly = resp.data?.hourly || resp.data?.data?.hourly || [];
  return {
    source: 'mosdac',
    hourly: Array.isArray(hourly) ? hourly : [],
  };
}

export { fetchMosdacHourly };
