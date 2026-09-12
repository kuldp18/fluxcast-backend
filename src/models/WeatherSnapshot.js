import mongoose from 'mongoose';

const WeatherHourlySchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    cloudCoverPct: { type: Number },
    ghiWm2: { type: Number },
    // Internal-only: global tilted irradiance (if requested from Open-Meteo).
    gtiWm2: { type: Number },
    // Internal-only: precipitation amount and radiation components
    precipitationMm: { type: Number },
    directRadiationWm2: { type: Number },
    diffuseRadiationWm2: { type: Number },
    dniWm2: { type: Number },
    rainProbabilityPct: { type: Number },
    temperatureC: { type: Number },
    humidityPct: { type: Number },
    windSpeedMs: { type: Number },
    windDirectionDeg: { type: Number },
    windGustMs: { type: Number },
    turbulenceIndex: { type: Number },
  },
  { _id: false }
);

const WeatherSnapshotSchema = new mongoose.Schema(
  {
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    source: { type: String },
    hourly: { type: [WeatherHourlySchema], default: [] },
  },
  { timestamps: true }
);

WeatherSnapshotSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.plantId = String(ret.plantId);
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;

    ret.hourly = (ret.hourly || []).map((h) => {
      const out = { ...h, time: new Date(h.time).toISOString() };
      // Don't expose internal-only fields.
      delete out.gtiWm2;
      delete out.precipitationMm;
      delete out.directRadiationWm2;
      delete out.diffuseRadiationWm2;
      return out;
    });

    return ret;
  },
});

const WeatherSnapshot = mongoose.model('WeatherSnapshot', WeatherSnapshotSchema);

export { WeatherSnapshot };
