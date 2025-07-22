 // src/routes/customerRoutes.js
import express from 'express';
import {getAllStoreOrders}  from '../controller/order.controller.js';
import { veriJwt } from '../middleware/Auth.middleware.js'; // Import auth middlewares

const OrderRouter = express.Router();

// Apply protection and role restriction to all customer routes
OrderRouter.use(veriJwt);
 // Only store owners can view their customer list

// Route for getting customer list for a store
OrderRouter.get('/store', getAllStoreOrders);

export default OrderRouter;