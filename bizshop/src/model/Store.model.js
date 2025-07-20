// src/models/Store.js
import mongoose from 'mongoose';
import validator from 'validator'; // For email validation (optional)

const storeSchema = new mongoose.Schema(
  {
    // Basic store information
    name: {
      type: String,
      required: [true, 'A store must have a name'],
      unique: true, // Each store name should be unique across the platform
      trim: true,
      maxlength: [100, 'A store name must not exceed 100 characters'],
      minlength: [3, 'A store name must be at least 3 characters long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'A store description must not exceed 500 characters'],
    },
    logo: {
      type: String, // URL to the store's logo image (e.g., Cloudinary URL or local path)
      default: 'https://placehold.co/150x150/cccccc/333333?text=Store+Logo', // Placeholder
    },
    // Contact information for the store
    email: {
      type: String,
      lowercase: true,
     
    },
    phone: String,
    address: String,

    // Store URL/Subdomain (e.g., chetanstore.bizshop.com)
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      // This will be generated automatically before saving
    },

    // Reference to the User who owns this store (multi-tenancy)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A store must have an owner'],
      unique: true, // IMPORTANT: Assuming one user can own only one store for simplicity
    },

    // Store status (e.g., active, suspended)
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    // Customization options for the store's frontend (basic example)
    themeColor: {
      type: String,
      default: '#3498db', // Default blue
    },
    // Add more fields for store settings as needed (e.g., currency, timezone)
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Mongoose Middleware (Pre-save hooks) ---

// Generate a slug from the store name before saving
storeSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) { // Generate slug on new creation or name change
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with single hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim(); // Trim leading/trailing whitespace/hyphens
  }
  next();
});

const Store = mongoose.model('Store', storeSchema);

export default Store;