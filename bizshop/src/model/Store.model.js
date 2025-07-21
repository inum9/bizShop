// src/models/Store.js
import mongoose from 'mongoose';
import validator from 'validator';

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A store must have a name'],
      unique: true,
      trim: true,
      maxlength: [100, 'A store name must not exceed 100 characters'],
      minlength: [3, 'A store name must be at least 3 characters long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'A store description must not exceed 500 characters'],
    },
    // --- REMOVED: logo field ---
    email: {
      type: String,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid store email'],
    },
    phone: String,
    address: String,
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A store must have an owner'],
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    themeColor: {
      type: String,
      default: '#3498db',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

storeSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

const Store = mongoose.model('Store', storeSchema);

export default Store;