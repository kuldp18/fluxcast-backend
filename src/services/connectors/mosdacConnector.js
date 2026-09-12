/**
 * MOSDAC does not have a simple public JSON API like Open-Meteo.
 * This connector is a placeholder so toolchains can fall back gracefully.
 */
async function fetchMosdacHourly() {
  return {
    source: 'mosdac (unavailable)',
    hourly: [],
  };
}

export { fetchMosdacHourly };
