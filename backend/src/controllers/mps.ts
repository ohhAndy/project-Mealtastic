import { Request, Response } from "express";
import pool from "../db";

/**
 * Helper: get all candidate recipes for a user based on preferences + saved recipes
 */
async function getRecipesForUser(userId: string) {
  const prefQuery = await pool.query(
    `SELECT calorie_min, calorie_max, exclude_ingredients 
     FROM user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  const prefs = prefQuery.rows[0] || {};
  const calorieMin = prefs.calorie_min || 0;
  const calorieMax = prefs.calorie_max || 99999;
  const excludes = prefs.exclude_ingredients || [];

  const result = await pool.query(
    `
      SELECT r.*
      FROM saved_recipes sr
      JOIN recipes r ON sr.recipe_id = r.id
      WHERE sr.user_id = $1 
      AND r.calories BETWEEN $2 AND $3
      AND NOT EXISTS (
        SELECT 1 FROM UNNEST($4::text[]) AS ex
        WHERE r.cached_data::text ILIKE '%' || ex || '%'
      )
    `,
    [userId, calorieMin, calorieMax, excludes]
  );

  return result.rows;
}

// ===============================================
// POST /api/meal-planner/generate
// ===============================================
export async function generateWeeklyMealPlan(req: Request, res: Response) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const startDate = new Date();
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(startDate.setDate(diff));
    const formattedWeekStart = weekStart.toISOString().split("T")[0];

    const recipes = await getRecipesForUser(userId);
    if (recipes.length === 0)
      return res.status(400).json({ message: "You must save recipes first." });

    const mealTypes = ["breakfast", "lunch", "dinner"];
    const selectedMeals = {
      breakfast: recipes.find((r) => r.cached_data?.mealType === "breakfast"),
      lunch: recipes.find((r) => r.cached_data?.mealType === "lunch"),
      dinner: recipes.find((r) => r.cached_data?.mealType === "dinner"),
    };

    if (!selectedMeals.breakfast || !selectedMeals.lunch || !selectedMeals.dinner) {
      return res.status(400).json({
        message:
          "Saved recipes must include at least one breakfast, lunch, and dinner recipe.",
      });
    }

    const plan = await pool.query(
      `
      INSERT INTO meal_plans (user_id, week_start, generated)
      VALUES ($1, $2, true)
      RETURNING id, week_start
      `,
      [userId, formattedWeekStart]
    );

    const planId = plan.rows[0].id;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);

      await Promise.all(
        mealTypes.map((mealType) => {
          const recipeId = selectedMeals[mealType].id;
          return pool.query(
            `INSERT INTO meal_plan_entries (plan_id, date, meal_type, recipe_id)
             VALUES ($1, $2, $3, $4)`,
            [planId, dayDate.toISOString().split("T")[0], mealType, recipeId]
          );
        })
      );
    }

    return res.status(201).json({
      plan_id: planId,
      week_start: formattedWeekStart,
      message: "Weekly plan generated",
    });
  } catch (err) {
    console.error("Meal plan generation failed:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ===============================================
// GET /api/meal-planner
// ===============================================
export async function getMealPlan(req: Request, res: Response) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const planQuery = await pool.query(
      `SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1`,
      [userId]
    );

    if (planQuery.rows.length === 0)
      return res.status(404).json({ message: "No meal plan found" });

    const plan = planQuery.rows[0];

    const entries = await pool.query(
      `
      SELECT mpe.*, r.title, r.image_url
      FROM meal_plan_entries mpe
      LEFT JOIN recipes r ON mpe.recipe_id = r.id
      WHERE plan_id = $1
      ORDER BY date ASC
      `,
      [plan.id]
    );

    return res.status(200).json({
      plan_id: plan.id,
      week_start: plan.week_start,
      entries: entries.rows,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

// ===============================================
// PATCH /api/meal-planner/entry/:id
// ===============================================
export async function updateMealPlanEntry(req: Request, res: Response) {
  const entryId = req.params.id;
  const { recipe_id } = req.body;

  try {
    await pool.query(
      `UPDATE meal_plan_entries SET recipe_id = $1 WHERE id = $2`,
      [recipe_id, entryId]
    );

    return res.status(200).json({ message: "Meal entry updated" });
  } catch (err) {
    console.error("updateMealPlanEntry error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ===============================================
// DELETE /api/meal-planner/:id
// ===============================================
export async function deleteMealPlan(req: Request, res: Response) {
  const planId = req.params.id;

  try {
    await pool.query(`DELETE FROM meal_plans WHERE id = $1`, [planId]);
    return res.status(200).json({ message: "Meal plan deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}
