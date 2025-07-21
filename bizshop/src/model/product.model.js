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
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
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
    // --- REMOVED: images field ---
    category: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be above 0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'A product must belong to a store'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ store: 1, name: 1 }, { unique: true });
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;