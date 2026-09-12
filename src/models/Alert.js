import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    type: {
      type: String,
      enum: ['curtailment_risk', 'shortfall_risk', 'storage_limit', 'sensor_fault', 'extreme_weather'],
      required: true,
    },
    message: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: false }
);

AlertSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    ret.plantId = String(ret.plantId);
    ret.createdAt = new Date(ret.createdAt).toISOString();
    return ret;
  },
});

const Alert = mongoose.model('Alert', AlertSchema);

export { Alert };
