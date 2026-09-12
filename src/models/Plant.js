import mongoose from 'mongoose';

const PlantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['solar', 'wind'] },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    capacityMW: { type: Number, required: true },
    commissionedDate: { type: Date },
    solarSpec: {
      panelTiltDeg: { type: Number },
      panelAzimuthDeg: { type: Number },
    },
    windSpec: {
      hubHeightM: { type: Number },
      rotorDiameterM: { type: Number },
    },
    hasLimitedHistory: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

PlantSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.updatedAt; // not in OpenAPI schema

    // OpenAPI uses `format: date` for commissionedDate.
    if (ret.commissionedDate) {
      const d = new Date(ret.commissionedDate);
      ret.commissionedDate = Number.isNaN(d.getTime())
        ? ret.commissionedDate
        : d.toISOString().slice(0, 10);
    }

    return ret;
  },
});

const Plant = mongoose.model('Plant', PlantSchema);

export { Plant };
