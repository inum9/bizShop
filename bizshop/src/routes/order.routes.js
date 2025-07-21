// src/routes/orderRoutes.js
import express from 'express';
import {
  createOrder,

  getSingleOrder,
  getAllStoreOrders,
  updateOrderStatus,
} from '../controller/order.controller.js'; // Import controller functions
import { veriJwt } from '../middleware/Auth.middleware.js'; // Import auth middlewares

const router = express.Router();

// 1. Route for placing a new order:
//    - Accessible by any authenticated user (customer).
//    - Uses `protect` middleware to ensure the user is logged in.
router.post('/', veriJwt, createOrder);

// 2. Routes for customers to view their own orders:
//    - `my-orders`: Get all orders placed by the currently authenticated user.
//    - `:id`: Get a specific order by ID. The controller will handle authorization
// //      to ensure the user can only view their own orders or their store's orders.
// router.get('/my-orders', veriJwt, getMyOrders);
router.get('/:id', veriJwt, getSingleOrder);

// 3. Routes for store owners to manage orders:
//    - `store/all`: Get all orders for the authenticated store owner's store.
//    - `:id/status`: Update the status of a specific order.
//    - Both require `protect` and `restrictTo('storeOwner')` middleware.
router.get('/store/all', veriJwt , getAllStoreOrders);
router.patch('/:id/status', veriJwt , updateOrderStatus);


export default router;