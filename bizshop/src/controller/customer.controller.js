 // src/controllers/customerController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

import Order from '../model/order.model.js'; // To find customers who placed orders

/**
 * @desc    Get a list of distinct customers who placed orders for the authenticated store owner's store
 * @route   GET /api/v1/customers/store
 * @access  Protected (storeOwner)
 * @notes   Provides basic customer info and aggregated order/sales data.
 */
export const getCustomersForStore = asyncHandler(async (req, res, next) => {
  // 1. Ensure user is a store owner and has an associated store
  if (!req.user || req.user.role !== 'storeOwner' || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can view customer lists.');
  }

  const storeId = req.user.storeId;

  // 2. Aggregate distinct customers who placed orders in this store
  const customers = await Order.aggregate([
    { $match: { store: storeId } }, // Filter orders for the current store
    {
      $group: {
        _id: '$user', // Group by user ID to get distinct customers
        totalOrders: { $sum: 1 }, // Count total orders per customer
        totalSales: { $sum: '$totalPrice' }, // Sum total sales per customer
        lastOrderDate: { $max: '$createdAt' } // Get date of last order
      }
    },
    {
      $lookup: { // Join with the users collection to get customer details
        from: 'users', // The collection name (Mongoose pluralizes 'User' to 'users')
        localField: '_id',
        foreignField: '_id',
        as: 'customerDetails'
      }
    },
    { $unwind: '$customerDetails' }, // Deconstruct the customerDetails array
    {
      $project: { // Shape the output
        _id: '$customerDetails._id',
        name: '$customerDetails.name',
        email: '$customerDetails.email',
        totalOrders: 1,
        totalSales: { $round: ['$totalSales', 2] }, // Round total sales to 2 decimal places
        lastOrderDate: 1,
        createdAt: '$customerDetails.createdAt' // Customer's registration date
      }
    },
    { $sort: { lastOrderDate: -1 } } // Sort by most recent order date
  ]);

  // If you also wanted to include users who *registered* but haven't ordered yet:
  // This would require a separate query or more complex aggregation,
  // possibly using $unionWith in MongoDB 4.4+.
  // For now, this focuses on *customers who placed orders*.

  res.status(200).json(
    new ApiResponse(
      200,
      customers,
      'Customer list fetched successfully!'
    )
  );
});