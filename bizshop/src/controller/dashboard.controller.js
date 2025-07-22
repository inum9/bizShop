// src/controllers/dashboardController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import Order from '../model/order.model.js';     // For total sales, orders, and customers
import Product from '../model/product.model.js'; // For total products
import User from '../models/User.js';       // To get distinct customer count (optional, can be done via orders)

/**
 * @desc    Get dashboard statistics for the authenticated store owner's store
 * @route   GET /api/v1/dashboard/stats
 * @access  Protected (storeOwner)
 */
export const getStoreDashboardStats = asyncHandler(async (req, res, next) => {
  // 1. Ensure user is a store owner and has an associated store
  if (!req.user || req.user.role !== 'storeOwner' || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can view dashboard stats.');
  }

  const storeId = req.user.storeId;

  // 2. Fetch Dashboard Statistics
  // All these operations are parallel, so we can use Promise.all for efficiency
  const [
    totalSalesResult,
    totalOrdersCount,
    totalProductsCount,
    totalCustomersCountResult, // Aggregation for distinct customers
    recentOrders,
    topSellingProducts
  ] = await Promise.all([
    // a) Total Sales
    Order.aggregate([
      { $match: { store: storeId, isPaid: true } }, // Match paid orders for this store
      { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } } // Sum totalPrice
    ]),

    // b) Total Orders Count
    Order.countDocuments({ store: storeId }), // Count all orders for this store

    // c) Total Products Count
    Product.countDocuments({ store: storeId }), // Count all products for this store

    // d) Total Customers Count (distinct users who placed orders in this store)
    Order.aggregate([
      { $match: { store: storeId } }, // Match orders for this store
      { $group: { _id: '$user' } }, // Group by user to get distinct user IDs
      { $count: 'totalCustomers' } // Count the distinct users
    ]),

    // e) Recent Orders (e.g., last 5 orders)
    Order.find({ store: storeId })
      .sort('-createdAt')
      .limit(5)
      .populate('user', 'name email') // Populate customer info
      .select('orderItems totalPrice orderStatus createdAt'),

    // f) Top Selling Products (e.g., top 3 by total quantity sold)
    Order.aggregate([
      { $match: { store: storeId, isPaid: true } }, // Match paid orders for this store
      { $unwind: '$orderItems' }, // Deconstruct the orderItems array
      {
        $group: {
          _id: '$orderItems.product', // Group by product ID
          totalQuantitySold: { $sum: '$orderItems.quantity' }, // Sum quantities
          totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] } } // Sum revenue
        }
      },
      { $sort: { totalQuantitySold: -1 } }, // Sort by quantity sold, descending
      { $limit: 3 }, // Get top 3
      {
        $lookup: { // Join with products collection to get product details
          from: 'products', // The collection name (Mongoose pluralizes model names)
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' }, // Deconstruct productDetails array
      {
        $project: { // Shape the output
          _id: '$productDetails._id',
          name: '$productDetails.name',
          // Images field removed from Product model, so remove here too
          totalQuantitySold: 1,
          totalRevenue: 1
        }
      }
    ])
  ]);

  // Extract the actual values (aggregations return arrays)
  const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].totalSales : 0;
  const totalCustomers = totalCustomersCountResult.length > 0 ? totalCustomersCountResult[0].totalCustomers : 0;

  // 3. Prepare and send the dashboard data
  const dashboardStats = {
    totalSales: totalSales.toFixed(2), // Format to 2 decimal places
    totalOrders: totalOrdersCount,
    totalProducts: totalProductsCount,
    totalCustomers: totalCustomers,
    recentOrders,
    topSellingProducts
  };

  res.status(200).json(
    new ApiResponse(
      200,
      dashboardStats,
      'Dashboard statistics fetched successfully!'
    )
  );
});