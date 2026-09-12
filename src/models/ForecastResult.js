import mongoose from 'mongoose';

const ForecastPointSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    expectedMW: { type: Number },
    lowerBoundMW: { type: Number },
    upperBoundMW: { type: Number },
    confidencePct: { type: Number },
  },
  { _id: false }
);

const RiskWindowSchema = new mongoose.Schema(
  {
    start: { type: Date },
    end: { type: Date },
    type: { type: String, enum: ['over_generation', 'under_generation', 'operational_risk'] },
  },
  { _id: false }
);

const ForecastResultSchema = new mongoose.Schema(
  {
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    horizonHours: { type: Number, required: true },
    points: { type: [ForecastPointSchema], default: [] },
    riskWindows: { type: [RiskWindowSchema], default: [] },
  },
  { timestamps: false }
);

ForecastResultSchema.index({ plantId: 1, generatedAt: -1 });

ForecastResultSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    ret.plantId = String(ret.plantId);
    ret.generatedAt = new Date(ret.generatedAt).toISOString();
    ret.points = (ret.points || []).map((p) => ({
      ...p,
      time: new Date(p.time).toISOString(),
    }));
    ret.riskWindows = (ret.riskWindows || []).map((w) => ({
      ...w,
      start: w.start ? new Date(w.start).toISOString() : w.start,
      end: w.end ? new Date(w.end).toISOString() : w.end,
    }));
    return ret;
  },
});

const ForecastResult = mongoose.model('ForecastResult', ForecastResultSchema);

export { ForecastResult };
