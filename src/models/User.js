import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['grid_operator', 'utility_admin', 'plant_owner', 'admin'],
    },
  },
  { timestamps: true }
);

UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model('User', UserSchema);

export { User };
