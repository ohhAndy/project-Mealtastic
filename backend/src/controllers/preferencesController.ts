import { Request, Response, NextFunction } from "express";
import pool from "../db";
import dotenv from "dotenv";
import * as preferencesQuery from "../queries/preferencesQueries";

dotenv.config();

export async function getUserPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(preferencesQuery.getUserPreferences, [req.session.userId]);
    if (result.rows.length > 0) {
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

export async function updateUserPreferences(req: Request, res: Response, next: NextFunction) {
  const minCalories = req.body.minCalories ? parseInt(req.body.minCalories) : null;
  const maxCalories = req.body.maxCalories ? parseInt(req.body.maxCalories) : null;
  const excludeIngredients = req.body.excludeIngredients?.length ? req.body.excludeIngredients : null;
  try {
    await pool.query(preferencesQuery.insertUserPreferences, [req.session.userId, minCalories, maxCalories, excludeIngredients]);

    res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error) return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}
