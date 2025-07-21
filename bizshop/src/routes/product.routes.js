import { Router } from "express";
import {veriJwt} from "../middleware/Auth.middleware.js";
import { createProduct, getAllProducts, getProduct,  } from "../controller/product.controller.js";
const route= Router();
route.route("/create-product").post(veriJwt,createProduct);
route.route("/get-product").get(veriJwt,getAllProducts);
route.route("/getONE-product").post(veriJwt,getProduct);
route.route("/update-product");

export {route as productRoutes};