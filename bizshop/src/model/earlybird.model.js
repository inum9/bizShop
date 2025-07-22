// src/models/EarlyBirdConfig.js
import mongoose from 'mongoose';

const earlyBirdConfigSchema = new mongoose.Schema(
  {
    // Total number of users allowed for the Early Bird offer
    maxUsers: {
      type: Number,
      required: [true, 'Max users for Early Bird must be defined'],
      min: [0, 'Max users cannot be negative'],
      default: 100, // Default to 100 early bird slots
    },
    // Number of users who have currently claimed the Early Bird offer
    usersClaimed: {
      type: Number,
      default: 0,
      min: [0, 'Users claimed cannot be negative'],
    },
    // Is the Early Bird offer currently active/enabled?
    isActive: {
      type: Boolean,
      default: true,
    },
    // Type of discount: 'free' or 'discounted'
    offerType: {
        type: String,
        enum: ['free', 'discounted'],
        default: 'free',
    },
    // If 'discounted', specify the amount (e.g., 500 for 500 INR)
    discountedAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discounted amount cannot be negative'],
    },
    // The duration of the Early Bird plan (e.g., 30 days, 365 days)
    durationDays: {
        type: Number,
        default: 30, // Default to 30 days of Early Bird plan
        min: [1, 'Duration must be at least 1 day'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Ensure only one EarlyBirdConfig document can exist
earlyBirdConfigSchema.index({ _id: 1 }, { unique: true });

const EarlyBirdConfig = mongoose.model('EarlyBirdConfig', earlyBirdConfigSchema);

export default EarlyBirdConfig;