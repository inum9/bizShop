import { Router } from "express";
import {veriJwt} from "../middleware/Auth.middleware.js";
import { createProduct } from "../controller/product.controller.js";
const route= Router();
route.route("/create-product").post(veriJwt,createProduct);

export {route as productRoutes};