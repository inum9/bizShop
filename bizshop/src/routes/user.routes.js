import {Router} from "express";
import { login, logOut, refreshAccessToken, signup } from "../controller/user.controller.js";
import { veriJwt } from "../middleware/Auth.middleware.js";
const router= Router();
router.route("/register").post(signup);
router.route("/login").get(login);
//secured routes
router.route("/logout").post(veriJwt,logOut)
router.route("/refresh-Access-token").put(veriJwt,refreshAccessToken);

export{ router as userRoutes};