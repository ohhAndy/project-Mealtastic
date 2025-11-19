import { Router } from "express";
import * as preferenceCtrl from "../controllers/preferencesController";
import { isAuthenticated } from "../middlewares/auth";
import { checkPreferences } from "../middlewares/validate";

const router = Router();

router.get('/', isAuthenticated, preferenceCtrl.getUserPreferences);
router.post('/', isAuthenticated, checkPreferences, preferenceCtrl.updateUserPreferences);
export default router;