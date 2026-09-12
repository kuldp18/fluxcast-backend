import mongoose from 'mongoose';

const ForecastJobSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    horizonHours: { type: Number, required: true },
    status: { type: String, required: true, enum: ['queued', 'running', 'completed', 'failed'] },
    errorMessage: { type: String },
  },
  { timestamps: false }
);

ForecastJobSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    ret.plantId = String(ret.plantId);
    ret.createdAt = new Date(ret.createdAt).toISOString();
    return ret;
  },
});

const ForecastJob = mongoose.model('ForecastJob', ForecastJobSchema);

export { ForecastJob };
