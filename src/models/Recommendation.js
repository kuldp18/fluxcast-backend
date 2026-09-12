import mongoose from 'mongoose';

const RecommendationSchema = new mongoose.Schema(
  {
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    action: {
      type: String,
      enum: ['charge_battery', 'discharge_battery', 'curtail', 'export', 'activate_backup', 'hold'],
    },
    amountMW: { type: Number },
    durationHours: { type: Number },
    reasoning: { type: String },
    constraintsConsidered: { type: [String], default: [] },
  },
  { timestamps: false }
);

RecommendationSchema.index({ plantId: 1, generatedAt: -1 });

RecommendationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    ret.plantId = String(ret.plantId);
    ret.generatedAt = new Date(ret.generatedAt).toISOString();
    return ret;
  },
});

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);

export { Recommendation };
