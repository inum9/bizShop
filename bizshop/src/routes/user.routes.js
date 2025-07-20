import {Router} from "express";
import { login, logOut, signup } from "../controller/user.controller.js";
import { veriJwt } from "../middleware/Auth.middleware.js";
const router= Router();
router.route("/register").post(signup);
router.route("/login").get(login);
router.route("/logout").post(veriJwt,logOut)

export{ router as userRoutes};