// src/models/Order.js
import mongoose from 'mongoose';

// --- Embedded Schema for Individual Items within an Order ---
// This schema describes each product that is part of an order.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Reference to the Product model
      required: [true, 'Order item must belong to a product'],
    },
    name: { // Snapshot of product name at time of order
      type: String,
      required: true,
    },
   
    price: { // Snapshot of product's price at time of order (important for historical accuracy)
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Order item must have a quantity'],
      min: [1, 'Quantity must be at least 1'],
    },
  },
  { _id: false } // We don't need a separate _id for subdocuments
);

// --- Main Order Schema ---
const orderSchema = new mongoose.Schema(
  {
    // Reference to the customer who placed the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'An order must belong to a user'],
    },
    // Reference to the store where the order was placed (multi-tenancy)
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'An order must belong to a store'],
    },
    // Array of order items (using the embedded schema)
    orderItems: [orderItemSchema],

    // Shipping address details
    shippingAddress: {
      address: { type: String, required: [true, 'Shipping address is required'] },
      city: { type: String, required: [true, 'City is required'] },
      postalCode: { type: String, required: [true, 'Postal code is required'] },
      country: { type: String, required: [true, 'Country is required'] },
    },

    // Payment details
    paymentMethod: {
      type: String,
      enum: ['COD', 'Razorpay'], // Cash on Delivery or Razorpay
      default: 'COD',
      required: [true, 'Payment method is required'],
    },
    paymentResult: { // Details from payment gateway (e.g., Razorpay payment ID)
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    // Order status
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    // Timestamps for delivery/payment
    paidAt: Date, // When the order was paid (for non-COD)
    deliveredAt: Date, // When the order was delivered

    // Boolean flags for easy checking
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Optional: Indexing for better query performance
orderSchema.index({ user: 1 }); // Query orders by user
orderSchema.index({ store: 1 }); // Query orders by store
orderSchema.index({ orderStatus: 1 }); // Query orders by status

const Order = mongoose.model('Order', orderSchema);

export default Order;