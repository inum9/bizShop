// src/routes/dashboardRoutes.js
import express from 'express';
import { getStoreDashboardStats } from '../controller/dashboard.controller.js';

import { veriJwt } from '../middleware/Auth.middleware.js';

const dashrouter = express.Router();veriJwt

// Apply protection and role restriction to all dashboard routes
dashrouter.use(veriJwt);
 // Only store owners can view their dashboard

// Route for getting dashboard statistics
dashrouter.get('/stats', getStoreDashboardStats);

export default dashrouter;