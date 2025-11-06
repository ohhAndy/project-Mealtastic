import { Request, Response, NextFunction } from "express";
import pool from "../db";
import dotenv from 'dotenv';

dotenv.config();

export async function searchRecipes(req: Request, res: Response, next: NextFunction) {
  const main_query = req.query.query as string;
  const page = req.query.page ? parseInt(req.query.page as string) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
  const cuisine = req.query.cuisine ? (req.query.cuisine as string).toLowerCase() : null;
  const diet = req.query.diet ? (req.query.diet as string).toLowerCase() : null;
  const maxPrepTime = req.query.maxPrepTime ? parseInt(req.query.maxPrepTime as string) : 1000000000;


  // if (!main_query)
  //   return res.status(400).end("query is missing");
  try{
    let sql_query = 
    `
    SELECT r.*
    FROM recipes r
    JOIN user_preferences p ON p.user_id = $1
    WHERE (LOWER(r.title) LIKE LOWER($2) OR LOWER(r.cached_data->>'summary') LIKE LOWER($2))
    AND ($3::TEXT IS NULL OR LOWER($3) = ANY(ARRAY(SELECT LOWER(unnest(r.diets)))))
    AND ($4::TEXT IS NULL OR LOWER($4) = ANY(ARRAY(SELECT LOWER(unnest(r.cuisines)))))
    AND r.prep_time < $5
    AND NOT (ARRAY(SELECT jsonb_array_elements_text(r.cached_data->'ingredients')) && p.exclude_ingredients)
    ORDER BY r.rating DESC
    LIMIT $6 OFFSET $7;`;
    let params: any[] = [
      req.session.userId,
      `%${main_query}%`,
      diet,
      cuisine,
      maxPrepTime,
      limit,
      limit * page
    ];

    let result = await pool.query(sql_query, params);
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }


    // not enough results in db, try spoonacular
    const spoonacular_url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    spoonacular_url.searchParams.append("query", main_query);
    spoonacular_url.searchParams.append("addRecipeInformation", "true");
    spoonacular_url.searchParams.append("addRecipeInstructions", "true");
    spoonacular_url.searchParams.append("fillIngredients", "true");
    spoonacular_url.searchParams.append("number", limit.toString());
    spoonacular_url.searchParams.append("offset", (limit * page).toString());
    if (cuisine) spoonacular_url.searchParams.append("cuisine", cuisine);
    if (diet) spoonacular_url.searchParams.append("diet", diet);
    spoonacular_url.searchParams.append("maxPrepTime", maxPrepTime.toString());
    spoonacular_url.searchParams.append("apiKey", process.env.API_KEY as string);

    let preference_result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1;', [req.session.userId]);
    const user_preferences = preference_result.rows[0];
    spoonacular_url.searchParams.append("excludeIngredients", user_preferences.exclude_ingredients.join(","));

    const response = await fetch(spoonacular_url);
    if (!response.ok) { return response.text().then(text => { throw new Error(`Spoonacular: ${text} (status: ${response.status})`)}); }
    const recipe_data = await response.json();
    const recipes = recipe_data.results || [];
    const recipe_list: any[] = [];
    for (let recipe of recipes) {
      recipe_list.push({
        id: recipe.id?.toString(),
        title: recipe.title,
        image_url: recipe.image,
        prep_time: recipe.readyInMinutes,
        cuisines: recipe.cuisines ?? [],
        diets: recipe.diets ?? [],
        source: recipe.sourceUrl,
        cached_data: recipe,
        rating: 0
      });
    }
    await Promise.all(
      recipes.map(async (recipe: any) => {
        try {
          const cuisines = Array.isArray(recipe.cuisines) ? recipe.cuisines : [];
          const diets = Array.isArray(recipe.diets) ? recipe.diets : [];
          await pool.query(
            "INSERT INTO recipes (id, title, image_url, prep_time, cuisines, diets, source, cached_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING;",
            [
              recipe.id?.toString(),
              recipe.title,
              recipe.image,
              recipe.readyInMinutes ?? 0,
              cuisines,
              diets,
              recipe.sourceUrl ?? null,
              JSON.stringify(recipe),
            ]
          );
        } catch (err) {
          console.error(`Failed to cache recipe ${recipe.id}:`, err);
        }
      })
    );
    return res.json(recipe_list);
  }
  catch(err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

async function cacheRecipe(recipe_id: string, persistent: boolean, rating: number | undefined) {
  const spoonacular_url = new URL(`https://api.spoonacular.com/recipes/${recipe_id}/information`);
  spoonacular_url.searchParams.append("apiKey", process.env.API_KEY as string);
  const response = await fetch(spoonacular_url);
  if (!response.ok) { return response.text().then(text => { throw new Error(`Spoonacular: ${text} (status: ${response.status})`)}); }
  const recipe_data = await response.json();
  const recipe = {
      id: recipe_data.id?.toString(),
      title: recipe_data.title,
      image_url: recipe_data.image,
      prep_time: recipe_data.readyInMinutes,
      cuisines: recipe_data.cuisines ?? [],
      diets: recipe_data.diets ?? [],
      source: recipe_data.sourceUrl,
      cached_data: recipe_data,
      rating: rating ?? 0,
    }
  pool.query("INSERT INTO recipes (id, title, image_url, prep_time, cuisines, diets, source, cached_data, rating, persistent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING;",
    [
      recipe_data.id?.toString(),
      recipe_data.title,
      recipe_data.image,
      recipe_data.readyInMinutes,
      recipe_data.cuisines ?? [],
      recipe_data.diets ?? [],
      recipe_data.sourceUrl,
      JSON.stringify(recipe_data),
      rating ?? 0,
      persistent
    ]
  );
  return recipe;
}

export async function getRecipe(req: Request, res: Response, next: NextFunction) {
  try{
    const recipe_id = req.params.id;
    const result = await pool.query("SELECT * FROM recipes WHERE id = '$1' LIMIT 1;", [recipe_id]);
    if (result.rows.length > 0)
      res.json(result.rows[0]);

    // recipe's not in our db so try externally in spoonacular
    const recipe = cacheRecipe(recipe_id, false, undefined).catch(err => console.log(`caching failed in background for recipe ${recipe_id}: ${err}`));
    return res.json(recipe);
  } catch(err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function saveRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe_id =   req.params.id;
    await pool.query("INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, '$2');", [req.session.userId, recipe_id]);
    const recipe = await pool.query("UPDATE recipes SET persistent = TRUE WHERE id = '$1' RETURNING *;", [recipe_id]);

    // ensure that the recipe is cached
    if (recipe.rows.length < 1) {
      cacheRecipe(recipe_id, true, undefined).catch(err => console.log(`caching failed in background for recipe ${recipe_id}: ${err}`));
    }
    res.sendStatus(200);
  } catch (err){
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function getSavedRecipes(req: Request, res: Response, next: NextFunction) {
  const page = req.query.page ? parseInt(req.query.page as string) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
  try {
    const result = await pool.query(
      `SELECT r.*
      FROM recipes r
      JOIN saved_recipes s ON s.recipe_id = r.id AND s.user_id = $1
      ORDER BY s.saved_at DESC
      LIMIT $2 OFFSET $3;`,
      [req.session.userId, limit, limit*page]
    );
    const cached_recipes = result.rows;
    return res.json(cached_recipes);
    // no need to check spoontacular because all saved recipes will remain cached
  } catch (err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function deleteSavedRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe_id = req.params.id;
    await pool.query(
      `DELETE 
      FROM saved_recipes
      WHERE recipe_id = '$1' AND user_id = $2;`,
      [recipe_id, req.session.userId]
    );
    await pool.query("UPDATE recipes SET persistent = FALSE WHERE id = '$1' AND id NOT IN (SELECT recipe_id FROM reviews);", [recipe_id]);
    res.sendStatus(200);
  } catch(err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function postReview(req: Request, res: Response, next: NextFunction) {
  const rating = parseInt(req.body.rating);
  const comment = req.body.comment as string;
  const recipe_id = req.params.id;
  try {
    await pool.query("INSERT INTO reviews (user_id, recipe_id, rating, comment) VALUES ($1, $2, $3, $4);", [req.session.userId, recipe_id, rating, comment]);

    // update average rating, persistence and make sure recipe is cached
    const recipe = await pool.query("UPDATE recipes SET rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE recipe_id = '$1'),persistent = TRUE WHERE id = '$1' RETURNING *;", [recipe_id]);

    // ensure that the recipe is cached
    if (recipe.rows.length < 1) {
      cacheRecipe(recipe_id, true, rating).catch(err => console.log(`caching failed in background for recipe ${recipe_id}: ${err}`));
    }
    res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  const page = req.query.page ? parseInt(req.query.page as string) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
  const recipe_id = req.params.id;
  try {
    const result = await pool.query(
      `SELECT *
      FROM reviews
      WHERE recipe_id = '$1'
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;`,
      [recipe_id, limit, limit*page]
    );
    const cached_recipes = result.rows;
    return res.json(cached_recipes);
    // no need to check spoontacular because all saved recipes will remain cached
  } catch (err) {
    if (err instanceof Error)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
}