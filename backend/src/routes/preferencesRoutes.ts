import { Router } from "express";
import * as preferenceCtrl from "../controllers/preferencesController";
import { isAuthenticated } from "../middlewares/auth";

const router = Router();

router.get('/', isAuthenticated, preferenceCtrl.getUserPreferences);
router.post('/', isAuthenticated, preferenceCtrl.updateUserPreferences);
export default router;  