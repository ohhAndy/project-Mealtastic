import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as mealPlannerCtrl from "../controllers/mealPlannerController";
import { checkIdUUID, checkRecipeId, checkWeekStart } from "../middlewares/validate";

const router = Router();

// POST /api/meal-planner/generate
router.post('/generate', isAuthenticated, mealPlannerCtrl.generateWeeklyMealPlan);

// GET /api/meal-planner
router.get('/', isAuthenticated, checkWeekStart, mealPlannerCtrl.getMealPlan);

// PATCH /api/meal-planner/entry/:id
router.patch('/entry/:id', isAuthenticated, checkIdUUID, checkRecipeId, mealPlannerCtrl.updateMealPlanEntry);

// DELETE /api/meal-planner/:id
router.delete('/:id', isAuthenticated, checkIdUUID, mealPlannerCtrl.deleteMealPlan);

export default router;
