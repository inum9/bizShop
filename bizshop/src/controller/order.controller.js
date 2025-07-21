// src/controllers/orderController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import Order from '../model/order.model.js';     // Order model
import Product from '../model/product.model.js'; // Product model (for stock update and price check)
    import Store from '../model/Store.model.js';
const calculateOrderTotals = (orderItems) => {
  let itemsPrice = 0;
  for (const item of orderItems) {
    itemsPrice += item.price * item.quantity;
  }
  // For simplicity, let's assume fixed tax and shipping for now
  const taxPrice = parseFloat((itemsPrice * 0.18).toFixed(2)); // 18% tax example, fixed to 2 decimals
  const shippingPrice = itemsPrice > 100 ? 0 : 5; // Free shipping over $100
  const totalPrice = parseFloat((itemsPrice + taxPrice + shippingPrice).toFixed(2));

  return { itemsPrice, taxPrice, shippingPrice, totalPrice };
};

/**
 * @desc    Create a new order
 * @route   POST /api/v1/orders
 * @access  Protected (any authenticated user can place an order)
 * @body    { orderItems: [{productId, quantity}], shippingAddress: {address, city, postalCode, country}, paymentMethod }
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  // 1. Ensure user is authenticated (handled by `protect` middleware)
  const { orderItems, shippingAddress, paymentMethod } = req.body;

  // 2. Validate essential input fields
  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, 'No order items provided.');
  }
  if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
    throw new ApiError(400, 'Shipping address details are incomplete.');
  }
  if (!paymentMethod) {
    throw new ApiError(400, 'Payment method is required.');
  }
  if (!['COD', 'Razorpay'].includes(paymentMethod)) { // Validate payment method enum
    throw new ApiError(400, 'Invalid payment method provided. Must be COD or Razorpay.');
  }


  // 3. Process order items: Validate products, check stock, and get real-time price/details
  const itemsForOrder = [];
  let commonStoreId = null; // All items in one order must belong to the same store

  for (const item of orderItems) {
    // Ensure productId and quantity are provided for each item
    if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new ApiError(400, 'Each order item must have a valid productId and a positive quantity.');
    }
    const product = await Product.findById(item.productId);

    // Ensure product exists
    if (!product) {
      throw new ApiError(404, `Product with ID ${item.productId} not found.`);
    }

    // Ensure products belong to the same store for a single order
    if (commonStoreId === null) {
      commonStoreId = product.store;
    } else if (product.store.toString() !== commonStoreId.toString()) {
      throw new ApiError(400, 'All products in one order must belong to the same store.');
    }

    // Check stock availability
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for product: "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`);
    }

    // Prepare order item snapshot (important for historical accuracy if product details change)
    itemsForOrder.push({
      product: product._id,
      name: product.name,
      // The 'image' field is intentionally removed from orderItemSchema as per your request.
      price: product.price, // Use actual product price, not from req.body
      quantity: item.quantity,
    });

    // Decrement product stock (transactional approach highly recommended for production)
    product.stock -= item.quantity;
    await product.save({ validateBeforeSave: false }); // Save updated stock
  }

  // 4. Calculate total prices
  const { taxPrice, shippingPrice, totalPrice } = calculateOrderTotals(itemsForOrder);

  // 5. Create the order document
  const order = await Order.create({
    user: req.user._id, // User who placed the order
    store: commonStoreId, // Store to which all products in this order belong
    orderItems: itemsForOrder,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
    totalPrice,
    // isPaid and paidAt logic will be more complex with Razorpay webhooks
    isPaid: paymentMethod === 'COD' ? false : false, // For COD, mark true upon delivery. For Razorpay, mark true on webhook.
    paidAt: null, // Set upon payment confirmation
    orderStatus: 'Processing', // Initial status
  });

  res.status(201).json(
    new ApiResponse(201, order, 'Order placed successfully!')
  );
});

/**
 * @desc    Get all orders for the authenticated user (customer)
 * @route   GET /api/v1/orders/my-orders
 * @access  Protected (user, storeOwner)
 */
export const getMyOrders = asyncHandler(async (req, res, next) => {
  // Find orders where the 'user' field matches the authenticated user's ID
  const orders = await Order.find({ user: req.user._id }).populate({
    path: 'orderItems.product', // Populate product details for each item
    select: 'name', // Select specific fields from product, 'images' removed as per new spec
  }).populate({
    path: 'store', // Populate store details
    select: 'name slug', // Select specific fields from store, 'logo' removed as per new spec
  });

  res.status(200).json(
    new ApiResponse(200, orders, 'My orders fetched successfully!')
  );
});

/**
 * @desc    Get all orders for the authenticated store owner's store
 * @route   GET /api/v1/orders/store/all
 * @access  Protected (storeOwner)
 * @notes   This will display all orders for the store owned by req.user.storeId.
 * Includes filtering, sorting, pagination.
 */
export const getAllStoreOrders = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can view orders.');
  }

  const storeId = req.user.storeId;

  // Build query object to filter by storeId
  const queryObj = { ...req.query, store: storeId };

  // Exclude fields related to pagination, sorting, field limiting from the filter
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  // Advanced filtering (e.g., orderStatus)
  let queryString = JSON.stringify(queryObj);
  queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  const filter = JSON.parse(queryString);

  let query = Order.find(filter).populate({
    path: 'user', // Populate user (customer) details
    select: 'name email',
  }).populate({
    path: 'orderItems.product', // Populate product details within order items
    select: 'name', // Still selecting images from the Product model
  });

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt'); // Default sort by newest first
  }

  // Field Limiting (selecting specific fields)
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v'); // Exclude __v field by default
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const totalOrders = await Order.countDocuments(filter);

  if (req.query.page && skip >= totalOrders && totalOrders > 0) {
    throw new ApiError(404, 'This page does not exist');
  }

  const orders = await query;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        total: totalOrders,
        results: orders.length,
        page,
        limit,
        orders,
      },
      'Store orders fetched successfully!'
    )
  );
});


/**
 * @desc    Get a single order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Protected (user can view their own, storeOwner can view their store's)
 */
export const getSingleOrder = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;

  // Find order by ID
  let order = await Order.findById(orderId)
    .populate({
      path: 'user',
      select: 'name email',
    })
    .populate({
      path: 'store',
      select: 'name slug', // Select specific fields from store
    })
    .populate({
      path: 'orderItems.product', // Populate product details within order items
      select: 'name', // Still selecting images from the Product model
    });

  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  // Authorization check: Ensure user is either the customer who placed the order OR the owner of the store
  // req.user.storeId must be populated in `protect` middleware for storeOwner check
  const isCustomer = order.user._id.toString() === req.user._id.toString();
  const isStoreOwner = req.user.role === 'storeOwner' && req.user.storeId && order.store._id.toString() === req.user.storeId.toString();

  if (!isCustomer && !isStoreOwner) {
    throw new ApiError(403, 'Forbidden: You do not have permission to view this order.');
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order fetched successfully!')
  );
});

/**
 * @desc    Update order status (e.g., Processing -> Shipped -> Delivered)
 * @route   PATCH /api/v1/orders/:id/status
 * @access  Protected (storeOwner)
 */
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  // Ensure user is a store owner with an associated store
  if (!req.user || req.user.role !== 'storeOwner' || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can update order status.');
  }

  const orderId = req.params.id;
  const { orderStatus, isPaid, deliveredAt } = req.body; // Can update status, paid status, delivered date

  // Find the order by ID and ensure it belongs to the authenticated store owner's store
  let order = await Order.findOne({ _id: orderId, store: req.user.storeId });

  if (!order) {
    throw new ApiError(404, 'Order not found or you do not have permission to update it.');
  }

  // Update order status if provided and valid
  if (orderStatus && Order.schema.path('orderStatus').enumValues.includes(orderStatus)) {
    order.orderStatus = orderStatus;
  } else if (orderStatus) { // If status is provided but invalid
    throw new ApiError(400, 'Invalid order status provided.');
  }

  // Handle payment status update (for manual confirmation or COD)
  // Logic here assumes manual updates. For Razorpay, payment confirmation comes via webhook.
  if (typeof isPaid === 'boolean' && isPaid === true && !order.isPaid) {
    order.isPaid = true;
    order.paidAt = new Date();
  }

  // Handle delivery status update
  if (orderStatus === 'Delivered' && !order.isDelivered) {
      order.isDelivered = true;
      order.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date(); // Use provided date or current date
  }
  // If `deliveredAt` is explicitly provided and not null, update it
  else if (deliveredAt !== undefined) {
      order.deliveredAt = deliveredAt ? new Date(deliveredAt) : undefined;
  }

  await order.save({ runValidators: true }); // Run validators on save

  res.status(200).json(
    new ApiResponse(200, order, 'Order status updated successfully!')
  );
});