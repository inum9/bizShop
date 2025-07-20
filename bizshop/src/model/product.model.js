// src/models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A product must have a name'],
      trim: true,
      maxlength: [100, 'A product name must not exceed 100 characters'],
      minlength: [3, 'A product name must be at least 3 characters long'],
    },
    description: {
      type: String,
      required: [true, 'A product must have a description'],
      trim: true,
      maxlength: [1000, 'A product description must not exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
      min: [0, 'Price must be a positive number'],
    },
    // Optional: discounted price
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // 'this' points to current document on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'A product must have a stock quantity'],
      min: [0, 'Stock must be a non-negative number'],
      default: 0,
    },
    images: [
      {
        url: {
          type: String, // URL to the image (e.g., Cloudinary URL or local path)
          required: [true, 'A product must have at least one image'],
        },
        public_id: String, // If using Cloudinary or similar service
      },
    ],
    // Optional: Category for filtering/organization
    category: {
      type: String,
      trim: true,
    },
    // Optional: Brand
    brand: {
      type: String,
      trim: true,
    },
    // Average rating (virtual or calculated)
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be above 0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // Round to 1 decimal place
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    // Reference to the Store this product belongs to (Multi-tenancy)
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'A product must belong to a store'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true }, // Include virtuals when converting to object
  }
);

// Optional: Indexing for better query performance
productSchema.index({ store: 1, name: 1 }, { unique: true }); // A store cannot have two products with the same name
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });

// Virtual populate for reviews (if you add a Review model later)
// productSchema.virtual('reviews', {
//   ref: 'Review',
//   foreignField: 'product',
//   localField: '_id'
// });

const Product = mongoose.model('Product', productSchema);

export default Product;