import { Request, Response, NextFunction } from "express";
import pool from "../db";

/**
 * Generate a shopping list from a user's existing meal plan.
 * Combines all ingredients from recipes in the plan.
 */
export async function generateShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).end("Missing plan_id");

    // 1️⃣ Fetch all recipes in the plan
    const entryResult = await pool.query(
      `SELECT r.cached_data
       FROM meal_plan_entries e
       JOIN recipes r ON e.recipe_id = r.id
       WHERE e.plan_id = $1`,
      [plan_id]
    );

    if (entryResult.rows.length === 0)
      return res.status(404).json({ message: "No entries for this meal plan." });

    // 2️⃣ Aggregate all ingredients
    const allIngredients: Record<
      string,
      { quantity: number; unit: string; category?: string }
    > = {};

    for (const row of entryResult.rows) {
      const recipeData = row.cached_data;
      const ingredients =
        recipeData?.extendedIngredients ||
        recipeData?.ingredients ||
        recipeData?.parsedIngredients ||
        [];

      for (const ing of ingredients) {
        const name = ing.name?.toLowerCase();
        const qty = parseFloat(ing.amount) || 1;
        const unit = ing.unit || "";
        const category = ing.aisle || null;

        if (!name) continue;

        if (allIngredients[name]) {
          allIngredients[name].quantity += qty;
        } else {
          allIngredients[name] = { quantity: qty, unit, category };
        }
      }
    }

    // 3️⃣ Create shopping list record
    const listResult = await pool.query(
      `INSERT INTO shopping_lists (plan_id, user_id)
       VALUES ($1, $2)
       RETURNING id;`,
      [plan_id, userId]
    );
    const listId = listResult.rows[0].id;

    // 4️⃣ Insert all aggregated items
    const insertPromises = Object.entries(allIngredients).map(
      ([name, data]) =>
        pool.query(
          `INSERT INTO shopping_items (list_id, ingredient, quantity, unit, category)
           VALUES ($1, $2, $3, $4, $5);`,
          [listId, name, data.quantity, data.unit, data.category]
        )
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
 * Fetch the user's most recent shopping list (or by plan_id)
 */
export async function getShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).end("Unauthorized");

    const { plan_id } = req.query;

    const result = await pool.query(
      `
      SELECT i.*, s.created_at
      FROM shopping_items i
      JOIN shopping_lists s ON i.list_id = s.id
      WHERE s.user_id = $1
      ${plan_id ? "AND s.plan_id = $2" : ""}
      ORDER BY i.ingredient ASC;
      `,
      plan_id ? [userId, plan_id] : [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "No shopping list found." });

    res.json({ items: result.rows });
  } catch (err) {
    console.error("Error fetching shopping list:", err);
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

/**
 * Update a shopping item (for marking as checked or editing quantity)
 */
export async function updateShoppingItem(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = parseInt(req.params.id);
    const { checked, quantity } = req.body;

    if (!itemId) return res.status(400).end("Missing item ID");

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
    const listId = parseInt(req.params.id);
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
