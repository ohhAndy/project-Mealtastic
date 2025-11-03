import { Router } from "express";
import passport from "../config/passport";
import * as authCtrl from "../controllers/authController";
import { sanitizeName, checkEmail } from "../middlewares/validate"

const router = Router();

router.post('/register', sanitizeName, checkEmail, authCtrl.register);
router.post('/login', checkEmail, authCtrl.login);
router.post('/logout', authCtrl.logout);
// router.get('/profile', authCtrl.profile);
router.get('/google', passport.authenticate("google", { scope: ["profile", "email"] }));
router.get('/google/callback', passport.authenticate("google", { failureRedirect: "/" }), authCtrl.googleRedirect);
export default router;
