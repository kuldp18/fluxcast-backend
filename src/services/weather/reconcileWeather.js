const FIELDS = [
  'cloudCoverPct',
  'ghiWm2',
  'dniWm2',
  'rainProbabilityPct',
  'temperatureC',
  'humidityPct',
  'windSpeedMs',
  'windDirectionDeg',
  'windGustMs',
  'turbulenceIndex',
];

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Reconcile multiple provider hourly arrays into one dataset.
 *
 * @param {{ providers: Array<{ name: string, weight: number, hourly: any[] }> }} input
 */
function reconcileWeather({ providers }) {
  const usable = (providers || []).filter((p) => Array.isArray(p.hourly) && p.hourly.length > 0);
  if (usable.length === 0) {
    return { source: 'none', hourly: [] };
  }

  // Use the provider with the most timestamps as the base.
  const base = [...usable].sort((a, b) => b.hourly.length - a.hourly.length)[0];

  const map = new Map();
  for (const row of base.hourly) {
    const t = row?.time;
    if (!t) continue;
    map.set(t, { time: t, _w: Object.create(null), ...row });
    for (const f of FIELDS) {
      if (isNum(row[f])) map.get(t)._w[f] = base.weight;
    }
  }

  for (const p of usable) {
    if (p === base) continue;
    for (const row of p.hourly) {
      const t = row?.time;
      if (!t) continue;
      if (!map.has(t)) map.set(t, { time: t, _w: Object.create(null) });
      const cur = map.get(t);

      for (const f of FIELDS) {
        const vNew = row[f];
        if (!isNum(vNew)) continue;

        const vCur = cur[f];
        const wCur = cur._w[f] || 0;
        const wNew = p.weight;

        if (!isNum(vCur) || wCur <= 0) {
          cur[f] = vNew;
          cur._w[f] = wNew;
        } else {
          // Weighted blend to smooth disagreements.
          cur[f] = (vCur * wCur + vNew * wNew) / (wCur + wNew);
          cur._w[f] = wCur + wNew;
        }
      }
    }
  }

  const hourly = Array.from(map.values())
    .map((r) => {
      const out = { time: r.time };
      for (const f of FIELDS) {
        if (isNum(r[f])) out[f] = r[f];
      }
      return out;
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const source = usable.map((p) => p.name).join('+') + ' (reconciled)';

  return { source, hourly };
}

export { reconcileWeather };
