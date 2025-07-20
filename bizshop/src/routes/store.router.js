import { Router } from "express";
import { veriJwt } from "../middleware/Auth.middleware.js";
import { createStore, deactivateMyStore, getMyStore, updateMystore } from "../controller/store.controller.js";
const router=Router();

router.route("/create-store").post(veriJwt,createStore)
router.route("/get-store").get(veriJwt,getMyStore)
router.route("/update-store").put(veriJwt,updateMystore);
router.route("/delete-store").delete(veriJwt,deactivateMyStore)
export{router as storeRouter}