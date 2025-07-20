import express from "express";
import cookieParser from "cookie-parser";

const app= express();
app.use(express.json({limit:"20kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());


// routes
import { userRoutes } from "./routes/user.routes.js";
app.use("/api/v1/user",userRoutes);
export {app};