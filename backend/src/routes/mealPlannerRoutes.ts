import { Router } from "express";
import {
  getWeeklyMealPlan,
  saveWeeklyMealPlan,
  deleteMealPlan,
} from "../controllers/mealPlannerController";

const router = Router();

// GET the user's weekly plan
router.get("/", getWeeklyMealPlan);

// POST or update a plan for the week
router.post("/", saveWeeklyMealPlan);

// DELETE a full week's plan
router.delete("/:weekStart", deleteMealPlan);

export default router;
