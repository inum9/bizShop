import {Router} from "express";
import { login, signup } from "../controller/user.controller.js";
const router= Router();
router.route("/register").post(signup);
router.route("/login").get(login);

export{ router as userRoutes};