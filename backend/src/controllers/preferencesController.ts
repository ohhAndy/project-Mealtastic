import { Request, Response, NextFunction } from "express";
import pool from "../db";
import dotenv from "dotenv";

dotenv.config();

export async function getUserPreferences(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1;",
      [req.session.userId]
    );

    if(result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    else {
      return res.json(null);
    }
  } catch (err) {
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function updateUserPreferences(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const minCalories = req.body.minCalories
    ? parseInt(req.body.minCalories)
    : null;
  const maxCalories = req.body.maxCalories
    ? parseInt(req.body.maxCalories)
    : null;
  const excludeIngredients = req.body.excludeIngredients?.length
    ? req.body.excludeIngredients
    : null;
  try {
    await pool.query(
      `INSERT INTO user_preferences (user_id, calorie_min, calorie_max, exclude_ingredients) VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id) DO UPDATE
       SET calorie_min = EXCLUDED.calorie_min,
           calorie_max = EXCLUDED.calorie_max,
           exclude_ingredients = EXCLUDED.exclude_ingredients;`,
      [req.session.userId, minCalories, maxCalories, excludeIngredients]
    );

    res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}
