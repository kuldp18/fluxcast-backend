import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema(
  {
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    generationMW: { type: Number, required: true },
    sensorStatus: { type: String, enum: ['ok', 'degraded', 'offline'], default: 'ok' },
    outage: { type: Boolean, default: false },
  },
  { timestamps: false }
);

TelemetrySchema.index({ plantId: 1, timestamp: 1 });

const Telemetry = mongoose.model('Telemetry', TelemetrySchema);

export { Telemetry };
