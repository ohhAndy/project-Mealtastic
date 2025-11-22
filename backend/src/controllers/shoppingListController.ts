import { Request, Response, NextFunction } from "express";
import pool from "../db";
import { getWeekStart } from "./mealPlannerController";

const VOLUME_UNITS = ["ml", "l"];
const WEIGHT_UNITS = ["mg", "g", "kg"];

const METRIC_CONVERSIONS = {
  volume: {
    base: "ml",
    rules: [
      { unit: "l", factor: 1000 },
    ],
  },
  weight: {
    base: "g",
    rules: [
      { unit: "mg", factor: 0.001 },
      { unit: "kg", factor: 1000 },
    ],
  },
};

const metricUnitType = (unit: string) => {
  if (VOLUME_UNITS.includes(unit)) return "volume";
  if (WEIGHT_UNITS.includes(unit)) return "weight";
  return "other";
};

const normalizeMetricUnit = (qty: number, unit: string) => {
  const type = metricUnitType(unit);
  if (type === "other") return { qty, unit };

  const group = METRIC_CONVERSIONS[type];
  for (const rule of group.rules) {
    if (unit === rule.unit) {
      return {
        qty: qty * rule.factor,
        unit: group.base,
      };
    }
  }

  return { qty, unit };
};

/**
 * Generate a shopping list from a user's existing meal plan.
 * Combines all ingredients from recipes in the plan.
 */
export async function generateShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    let { plan_id } = req.query;
    if (!plan_id) {
      const week_start = getWeekStart();
      const checkMealPlanResult = await pool.query(
        `SELECT id FROM meal_plans WHERE week_start = $1 and user_id = $2`,
        [week_start, userId]
      );
      if (checkMealPlanResult.rows.length > 0){
        plan_id = checkMealPlanResult.rows[0].id;
      }
      else return res.status(400).end("Missing plan_id in query and no meal plan created for this week.");
    }

    const entryResult = await pool.query(
      `SELECT r.cached_data
       FROM meal_plan_entries e
       JOIN recipes r ON e.recipe_id = r.id
       WHERE e.plan_id = $1`,
      [plan_id]
    );

    if (entryResult.rows.length === 0)
      return res.status(404).json({ message: "No entries for this meal plan." });

    const existingListResult = await pool.query(
      `SELECT *
       FROM shopping_lists
       WHERE plan_id = $1 AND user_id = $2`,
      [plan_id, userId]
    );

    if (existingListResult.rows.length > 0){
      await pool.query(
        `DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2;`,
        [existingListResult.rows[0].id, userId]
      );
    }

    const allIngredients: Record<
      string,
      { quantity: number; unit: string; category?: string }
    > = {};

    for (const row of entryResult.rows) {
      const recipeData = row.cached_data;
      const ingredients = recipeData?.extendedIngredients || [];

      for (const ing of ingredients) {
        const name = ing.name?.toLowerCase();
        if (!name) continue;

        const category = ing.aisle || null;

        const metric = ing.measures?.metric;
        if (!metric || metric.amount == null) continue;

        let qty = metric.amount;
        let unit = (metric.unitShort || "").toLowerCase();

        const key = `${name}__${unit}`;

        if (allIngredients[key]) {
          allIngredients[key].quantity += qty;
        } else {
          allIngredients[key] = { quantity: qty, unit, category };
        }
      }
    }

    for (const key of Object.keys(allIngredients)) {
      const item = allIngredients[key];
      const normalized = normalizeMetricUnit(item.quantity, item.unit);
      item.quantity = normalized.qty;
      item.unit = normalized.unit;
    }

    const listResult = await pool.query(
      `INSERT INTO shopping_lists (plan_id, user_id)
       VALUES ($1, $2)
       RETURNING id`,
      [plan_id, userId]
    );
    const listId = listResult.rows[0].id;

    const insertPromises = Object.entries(allIngredients).map(
      ([nameWithUnit, data]) => {
        const [name] = nameWithUnit.split("__");
        return pool.query(
          `INSERT INTO shopping_items (list_id, ingredient, quantity, unit, category)
           VALUES ($1, $2, $3, $4, $5);`,
          [listId, name, data.quantity, data.unit, data.category]
        );
      }
    );
    await Promise.all(insertPromises);

    res.status(201).json({ list_id: listId, items: allIngredients });
  } catch (err) {
    console.error("Error generating shopping list:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Fetch the user's shopping list by plan_id
 */
export async function getShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    const { plan_id } = req.params;
    if (!plan_id) return res.status(400).end("Missing plan_id in query");

    const result = await pool.query(
      `
      SELECT i.*, s.created_at
      FROM shopping_items i
      JOIN shopping_lists s ON i.list_id = s.id
      WHERE s.user_id = $1
      AND s.plan_id = $2
      ORDER BY i.ingredient ASC;
      `,
      [userId, plan_id]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error("Error fetching shopping list:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function getShoppingLists(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");
    const page = req.query.page ? parseInt(req.query.page as string) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;

    const countResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM shopping_lists s
      WHERE s.user_id = $1
      `,
      [userId]
    );

    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await pool.query(
      `
      SELECT s.*, m.week_start
      FROM shopping_lists s
      JOIN meal_plans m ON s.plan_id = m.id
      WHERE s.user_id = $1
      ORDER BY m.week_start DESC
      LIMIT $2 OFFSET $3;
      `,
      [userId, limit, limit * page]
    );
    
    console.log(result.rows);

    res.json({ lists: result.rows, totalItems: totalItems, totalPages: totalPages });
  } catch (err) {
    console.error("Error fetching user shopping lists:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Update a shopping item (for marking as checked or editing quantity)
 */
export async function updateShoppingItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    const itemId = req.params.id;
    const { checked, quantity } = req.body;

    if (!itemId) return res.status(400).end("Missing item ID");

    const checkUserShoppingList = await pool.query(
      `
      SELECT s.user_id
      FROM shopping_lists s, shopping_items i
      WHERE i.id = $1 AND s.id = i.list_id AND s.user_id = $2`,
      [itemId, userId]
    );
    if (checkUserShoppingList.rows.length === 0)
      return res.status(401).json({ message: "Not user's shopping list item. Unauthorized." });

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (typeof checked === "boolean") {
      fields.push(`checked = $${i++}`);
      values.push(checked);
    }

    if (quantity !== undefined) {
      fields.push(`quantity = $${i++}`);
      values.push(quantity);
    }

    if (fields.length === 0)
      return res.status(400).end("No valid fields to update");

    values.push(itemId);

    await pool.query(
      `UPDATE shopping_items SET ${fields.join(", ")} WHERE id = $${i};`,
      values
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating shopping item:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Delete a shopping list (and its items)
 */
export async function deleteShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const listId = req.params.id;
    const userId = req.session.userId;
    if (!listId || !userId) return res.status(400).end("Invalid request");

    await pool.query(
      `DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2;`,
      [listId, userId]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting shopping list:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function deleteShoppingItem(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = req.params.id;
    const userId = req.session.userId;
    if (!itemId || !userId) return res.status(400).end("Invalid request");

    await pool.query(
      `DELETE FROM shopping_items i
      USING shopping_lists s
      WHERE i.list_id = s.id
        AND i.id = $1
        AND s.user_id = $2;`,
      [itemId, userId]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting shopping list item:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}
