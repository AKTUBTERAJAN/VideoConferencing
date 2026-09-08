import { Router } from 'express';
import { login, register, getUserProfile, getUserHistory, addToHistory } from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/get_user_profile").get(getUserProfile);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);

export default router;


