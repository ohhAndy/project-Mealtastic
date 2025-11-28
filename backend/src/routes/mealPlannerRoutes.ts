// ramim (who dropped the course) probably used chatgpt for this file initially

import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as mealPlannerCtrl from "../controllers/mealPlannerController";
import { checkIdUUID, checkRecipeId, checkWeekStart } from "../middlewares/validate";

const router = Router();

router.post('/generate', isAuthenticated, mealPlannerCtrl.generateWeeklyMealPlan);
router.get('/', isAuthenticated, checkWeekStart, mealPlannerCtrl.getMealPlan);
router.patch('/entry/:id', isAuthenticated, checkIdUUID, checkRecipeId, mealPlannerCtrl.updateMealPlanEntry);
router.delete('/:id', isAuthenticated, checkIdUUID, mealPlannerCtrl.deleteMealPlan);
router.put('/export/ics', isAuthenticated, checkWeekStart, mealPlannerCtrl.exportMealPlanICS);

export default router;
