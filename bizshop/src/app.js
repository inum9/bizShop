import express from "express";
import cookieParser from "cookie-parser";

const app= express();
app.use(express.json({limit:"20kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.static('public'));


// routes
import { userRoutes } from "./routes/user.routes.js";
import { storeRouter } from "./routes/store.router.js";
import  {productRoutes} from "../src/routes/product.routes.js"
import router from "./routes/order.routes.js";
import { billingRouter } from "./routes/Billing.routes.js";
import  router from "../src/routes/dashboard.routes.js"
app.use("/api/v1/user",userRoutes);
app.use("/api/v1/store",storeRouter);
app.use("/api/v1/product",productRoutes);
app.use("/api/v1/order",router);
app.use("/api/v1/payment",billingRouter);
app.use("/api/v1/dashboard",router);
export {app};