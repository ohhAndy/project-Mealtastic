import { Request, Response, NextFunction } from "express";
import pool from "../db";

/**
 * GET /api/meal-planner?weekStart=YYYY-MM-DD
 * Returns a user's meal plan for the specified week.
 */
export async function getWeeklyMealPlan(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  const weekStart = req.query.weekStart as string;

  if (!weekStart)
    return res.status(400).end("Missing weekStart");

  try {
    const planResult = await pool.query(
      `SELECT id FROM meal_plans WHERE user_id = $1 AND week_start = $2 LIMIT 1;`,
      [userId, weekStart]
    );

    if (planResult.rows.length === 0)
      return res.json({ week_start: weekStart, entries: [] });

    const planId = planResult.rows[0].id;

    const entriesResult = await pool.query(
      `SELECT mpe.*, r.title, r.image_url, r.prep_time 
       FROM meal_plan_entries mpe
       LEFT JOIN recipes r ON mpe.recipe_id = r.id
       WHERE mpe.plan_id = $1
       ORDER BY mpe.date, mpe.meal_type;`,
      [planId]
    );

    res.json({ week_start: weekStart, entries: entriesResult.rows });
  } catch (err) {
    console.error("Error fetching meal plan:", err);
    return res.status(500).end("Error fetching meal plan");
  }
}

/**
 * POST /api/meal-planner
 * Saves or updates a user's weekly meal plan.
 */
export async function saveWeeklyMealPlan(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  const { weekStart, meals } = req.body;

  if (!weekStart || !meals)
    return res.status(400).end("Missing required fields");

  try {
    // 1. Upsert meal_plan for this week
    const planResult = await pool.query(
      `INSERT INTO meal_plans (user_id, week_start)
       VALUES ($1, $2)
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET updated_at = NOW()
       RETURNING id;`,
      [userId, weekStart]
    );
    const planId = planResult.rows[0].id;

    // 2. Remove existing entries
    await pool.query(`DELETE FROM meal_plan_entries WHERE plan_id = $1;`, [planId]);

    // 3. Insert all new meals
    const insertPromises = meals.map((meal: any) =>
      pool.query(
        `INSERT INTO meal_plan_entries (plan_id, date, meal_type, recipe_id)
         VALUES ($1, $2, $3, $4);`,
        [planId, meal.date, meal.meal_type, meal.recipe_id]
      )
    );
    await Promise.all(insertPromises);

    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving meal plan:", err);
    return res.status(500).end("Error saving meal plan");
  }
}

/**
 * DELETE /api/meal-planner/:weekStart
 * Deletes a user's entire meal plan for the week.
 */
export async function deleteMealPlan(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  const weekStart = req.params.weekStart;

  if (!weekStart)
    return res.status(400).end("Missing weekStart");

  try {
    await pool.query(
      `DELETE FROM meal_plans WHERE user_id = $1 AND week_start = $2;`,
      [userId, weekStart]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting meal plan:", err);
    return res.status(500).end("Error deleting meal plan");
  }
}
