import {Router} from "express";
import { signup } from "../controller/user.controller.js";
const router= Router();
router.route("/register").post(signup)

export{ router as userRoutes};