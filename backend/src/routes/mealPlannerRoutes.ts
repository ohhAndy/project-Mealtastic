import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as mealPlannerCtrl from "../controllers/mealPlannerController";

const router = Router();

// POST /api/meal-planner/generate
router.post('/generate', isAuthenticated, mealPlannerCtrl.generateWeeklyMealPlan);

// GET /api/meal-planner
router.get('/', isAuthenticated, mealPlannerCtrl.getMealPlan);

// PATCH /api/meal-planner/entry/:id
router.patch('/entry/:id', isAuthenticated, mealPlannerCtrl.updateMealPlanEntry);

// DELETE /api/meal-planner/:id
router.delete('/:id', isAuthenticated, mealPlannerCtrl.deleteMealPlan);

export default router;
