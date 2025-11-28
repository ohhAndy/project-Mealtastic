import { Router } from "express";
import passport from "../config/passport";
import * as authCtrl from "../controllers/authController";
import { sanitizeName, checkEmail } from "../middlewares/validate";

const router = Router();

router.post("/register", sanitizeName, checkEmail, authCtrl.register);
router.post("/login", checkEmail, authCtrl.login);
router.post("/logout", authCtrl.logout);
router.get("/profile", authCtrl.profile);

// google authentication using chatgpt: https://chatgpt.com/s/t_6928e2c8e9b881919955bfd7023bdd17
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/calendar.events"],
    accessType: "offline",
    prompt: "consent"
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `/` }),
  (req, res) => {
    if (req.user && req.user.id) req.session.userId = req.user.id;
    authCtrl.googleRedirect(req, res);
  }
);
export default router;
