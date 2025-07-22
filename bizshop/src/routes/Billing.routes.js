import {Router} from "express";
import {veriJwt} from "../middleware/Auth.middleware.js"
import { createRazorpayPayment } from "../controller/RazorPay.controller.js";
const billingRouter=Router();
billingRouter.post('/create-order', veriJwt, createRazorpayPayment);

export{billingRouter};
