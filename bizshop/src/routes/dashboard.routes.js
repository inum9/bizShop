// src/routes/dashboardRoutes.js
import express from 'express';
import { getStoreDashboardStats } from '../controllers/dashboardController.js';

import { veriJwt } from '../middleware/Auth.middleware.js';

const router = express.Router();veriJwt

// Apply protection and role restriction to all dashboard routes
router.use(veriJwt);
 // Only store owners can view their dashboard

// Route for getting dashboard statistics
router.get('/stats', getStoreDashboardStats);

export default router;