import { Request, Response, NextFunction } from "express";
import pool from "../db";

// Utility: get start of current week (Monday)
function getWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().split("T")[0];
}

/**
 * Generate a weekly meal plan based on user's saved recipes and preferences.
 */
export async function generateWeeklyMealPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    const weekStart = getWeekStart();

    // 1️⃣ Fetch user preferences
    const prefResult = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1;",
      [userId]
    );
    const preferences = prefResult.rows[0];

    // 2️⃣ Get user's saved recipes
    let recipeQuery = `
      SELECT r.*
      FROM recipes r
      JOIN saved_recipes s ON s.recipe_id = r.id
      WHERE s.user_id = $1
    `;
    const params: any[] = [userId];

    // 3️⃣ Apply filters (diet, calorie range, excluded ingredients)
    if (preferences?.diet) {
      recipeQuery += ` AND LOWER($2) = ANY(ARRAY(SELECT LOWER(unnest(r.diets))))`;
      params.push(preferences.diet.toLowerCase());
    }
    if (preferences?.exclude_ingredients?.length > 0) {
      recipeQuery += ` AND NOT (ARRAY(SELECT jsonb_array_elements_text(r.cached_data->'ingredients')) && $3::text[])`;
      params.push(preferences.exclude_ingredients);
    }

    const recipeResult = await pool.query(recipeQuery, params);
    const recipes = recipeResult.rows;

    if (recipes.length === 0)
      return res.status(400).json({ error: "No suitable saved recipes found." });

    // 4️⃣ Create meal plan record
    const planResult = await pool.query(
      `INSERT INTO meal_plans (user_id, week_start, generated)
       VALUES ($1, $2, TRUE)
       RETURNING id;`,
      [userId, weekStart]
    );
    const planId = planResult.rows[0].id;

    // 5️⃣ Generate entries (7 days × 3 meals)
    const mealTypes = ["breakfast", "lunch", "dinner"];
    const entries = [];
    const monday = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      for (const mealType of mealTypes) {
        const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
        entries.push({ plan_id: planId, date: dateStr, meal_type: mealType, recipe_id: randomRecipe.id });
      }
    }

    // 6️⃣ Insert entries
    const insertPromises = entries.map(e =>
      pool.query(
        `INSERT INTO meal_plan_entries (plan_id, date, meal_type, recipe_id)
         VALUES ($1, $2, $3, $4);`,
        [e.plan_id, e.date, e.meal_type, e.recipe_id]
      )
    );
    await Promise.all(insertPromises);

    // 7️⃣ Return result
    res.json({ plan_id: planId, week_start: weekStart, entries });
  } catch (err) {
    console.error("Error generating meal plan:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Fetch an existing weekly meal plan for the logged-in user.
 */
export async function getMealPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    const weekStart = req.query.week_start as string || getWeekStart();

    const result = await pool.query(
      `
      SELECT e.*, r.title, r.image_url
      FROM meal_plan_entries e
      JOIN meal_plans p ON e.plan_id = p.id
      JOIN recipes r ON e.recipe_id = r.id
      WHERE p.user_id = $1 AND p.week_start = $2
      ORDER BY e.date, e.meal_type;
      `,
      [userId, weekStart]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "No meal plan found for this week." });

    res.json({ week_start: weekStart, entries: result.rows });
  } catch (err) {
    console.error("Error fetching meal plan:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Update a specific meal entry (change recipe for a given day/meal)
 */
export async function updateMealPlanEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const entryId = parseInt(req.params.id);
    const { recipe_id } = req.body;
    if (!entryId || !recipe_id)
      return res.status(400).end("Missing entry ID or recipe ID");

    await pool.query(
      `UPDATE meal_plan_entries
       SET recipe_id = $1
       WHERE id = $2;`,
      [recipe_id, entryId]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating meal entry:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Delete a meal plan (and all its entries)
 */
export async function deleteMealPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const planId = parseInt(req.params.id);
    const userId = req.session.userId;
    if (!planId || !userId) return res.status(400).end("Invalid request");

    await pool.query(
      `DELETE FROM meal_plans WHERE id = $1 AND user_id = $2;`,
      [planId, userId]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting meal plan:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}
