import { Request, Response, NextFunction } from "express";
import pool from "../db";
import dotenv from 'dotenv';
import { getRecipeKey, getSearchKey, cacheSet, cacheGet } from "../config/memcached";

dotenv.config();

export async function searchRecipes(req: Request, res: Response, next: NextFunction) {
  const main_query = req.query.query as string;
  const page = req.query.page ? parseInt(req.query.page as string) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
  const cuisine = req.query.cuisine ? (req.query.cuisine as string).toLowerCase() : null;
  const diet = req.query.diet ? (req.query.diet as string).toLowerCase() : null;
  const maxPrepTime = req.query.maxPrepTime ? parseInt(req.query.maxPrepTime as string) : 1000000000;

  const cache_key = getSearchKey({ query: main_query, cuisine, diet, maxPrepTime, page, limit });
  const cached = await cacheGet<any[]>(cache_key);
  if (cached) return res.json(cached);

  if (!main_query)
     return res.status(400).end("query is missing");
  try{
    // still need to include this since searches won't be stored in database thus won't be part of the initial memcached warming up
    let sql_query = 
    `
    SELECT r.*, COUNT(*) OVER() as total_count
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
      const totalResults = parseInt(result.rows[0].total_count);
      const responsePayload = { results: result.rows, totalResults };
      
      cacheSet(cache_key, responsePayload, 0);
      return res.json(responsePayload);
    }


    // not enough results in db, try spoonacular again do this because cache will not be initially storing searches
    const spoonacular_url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    spoonacular_url.searchParams.append("query", main_query);
    spoonacular_url.searchParams.append("addRecipeInformation", "true");
    spoonacular_url.searchParams.append("addRecipeInstructions", "true");
    spoonacular_url.searchParams.append("fillIngredients", "true");
    spoonacular_url.searchParams.append("number", limit.toString());
    spoonacular_url.searchParams.append("offset", (limit * page).toString());
    if (cuisine) spoonacular_url.searchParams.append("cuisine", cuisine);
    if (diet) spoonacular_url.searchParams.append("diet", diet);
    spoonacular_url.searchParams.append("maxReadyTime", maxPrepTime.toString());
    spoonacular_url.searchParams.append("apiKey", process.env.API_KEY as string);

    let preference_result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1;', [req.session.userId]);
    const user_preferences = preference_result.rows[0];
    spoonacular_url.searchParams.append("excludeIngredients", user_preferences.exclude_ingredients.join(","));

    const response = await fetch(spoonacular_url);
    if (!response.ok) { return response.text().then(text => { throw new Error(`Spoonacular: ${text} (status: ${response.status})`)}); }
    const recipe_data = await response.json();
    const totalResults = recipe_data.totalResults || 0;

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

    const responsePayload = { results: recipe_list, totalResults };

    cacheSet(cache_key, responsePayload, 0); // forever storing
    await Promise.all(
      recipe_list.map(async (recipe: any) => {
        cacheSet(getRecipeKey(recipe.id?.toString()), recipe, 0);
        pool.query(
          "INSERT INTO recipes (id, title, image_url, prep_time, cuisines, diets, source, cached_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING;",
          [
            recipe.id,
            recipe.title,
            recipe.image_url,
            recipe.prep_time,
            recipe.cuisines,
            recipe.diets,
            recipe.source,
            JSON.stringify(recipe.cached_data),
          ]
        ).catch((err) => {
          if (err) console.log(`Failed to store recipe ${recipe.id}:`, err);
        });
      })
    );
    return res.json(responsePayload);
  }
  catch(err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

async function cacheRecipe(recipe_id: string, rating: number | undefined) {
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
  pool.query("INSERT INTO recipes (id, title, image_url, prep_time, cuisines, diets, source, cached_data, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING;",
    [
      recipe.id,
      recipe.title,
      recipe.image_url,
      recipe.prep_time,
      recipe.cuisines,
      recipe.diets,
      recipe.source,
      JSON.stringify(recipe_data),
      recipe.rating
    ]
  );
  cacheSet(getRecipeKey(recipe.id), recipe, 0);
  return recipe;
}

export async function getRecipe(req: Request, res: Response, next: NextFunction) {
  try{
    const recipe_id = req.params.id;
    const cache_key = getRecipeKey(recipe_id);
    const cached = await cacheGet<any[]>(cache_key);
    if (cached) return res.json(cached);

    // recipe's not in our cache so try externally in spoonacular
    const recipe = cacheRecipe(recipe_id, undefined).catch((err) => {if (err) console.log(`caching failed in background for recipe ${recipe_id}: ${err}`)});
    return res.json(recipe);
  } catch(err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function createRecipe(req: Request, res: Response, next: NextFunction) {
  // exploit the fact that the ids for spoonacular are int. We store them as text allowing flexibility to make
  // our own ids to insert into the db
  const title = req.body.title;
  const image = req.body.image;
  const prep_time = parseInt(req.body.readyInMinutes);
  const cuisines = req.body.cuisines;
  const diets = req.body.diets;
  const servings = req.body.servings;
  const extendedIngredients = req.body.extendedIngredients;
  const analyzedInstructions = req.body.analyzedInstructions;

  try {
    let result = await pool.query("INSERT INTO recipes (title, image_url, prep_time, cuisines, diets) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING RETURNING id",
      [
        title,
        image,
        prep_time,
        cuisines,
        diets
      ]
    );

    const id = result.rows[0].id;
    const cached_data = JSON.stringify({
      id: id,
      title: title,
      image: image,
      servings: servings,
      extendedIngredients: extendedIngredients,
      analyzedInstructions: analyzedInstructions,
    });

    result = await pool.query("UPDATE recipes SET cached_data = $1 WHERE id = $2 RETURNING *;", [cached_data, id]);
    cacheSet(getRecipeKey(id), result.rows[0], 0);
    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof Error){
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
  
}

export async function saveRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe_id = req.params.id;
    await pool.query("INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, $2::text);", [req.session.userId, recipe_id]);
    res.sendStatus(200);
  } catch (err){
    if (err instanceof Error){
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function getSavedRecipes(req: Request, res: Response, next: NextFunction) {
  const page = req.query.page ? parseInt(req.query.page as string) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
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
    if (err instanceof Error){
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function deleteSavedRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe_id = req.params.id;
    await pool.query(
      `DELETE 
      FROM saved_recipes
      WHERE recipe_id = $1::text AND user_id = $2;`,
      [recipe_id, req.session.userId]
    );
    res.sendStatus(200);
  } catch(err) {
    if (err instanceof Error){
      console.log(err);
      return res.status(500).end(err.message);
    }
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
      WHERE recipe_id = $1::text
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;`,
      [recipe_id, limit, limit*page]
    );
    const reviews = result.rows;
    return res.json(reviews);
  } catch (err) {
    if (err instanceof Error){
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function deleteReview(req: Request, res: Response) {
  const reviewId = req.params.reviewId;
  const userId = req.session.userId;
  
  try {
    // First check if the review exists and belongs to the user
    const checkResult = await pool.query(
      "SELECT recipe_id FROM reviews WHERE id = $1::uuid AND user_id = $2::uuid",
      [reviewId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(403).end("Unauthorized: You can only delete your own reviews");
    }
    
    const recipeId = checkResult.rows[0].recipe_id;
    
    // Delete the review
    await pool.query(
      "DELETE FROM reviews WHERE id = $1::uuid AND user_id = $2::uuid",
      [reviewId, userId]
    );
    
    // Update recipe rating
    await pool.query(
      "UPDATE recipes SET rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE recipe_id = $1::text) WHERE id = $1::text",
      [recipeId]
    );
    
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    return res.status(500).end(err instanceof Error ? err.message : err);
  }
}

export async function getReviewCount(req: Request, res: Response) {
  const recipe_id = req.params.id;
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int as count FROM reviews WHERE recipe_id = $1::text",
      [recipe_id]
    );
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.log(err);
    return res.status(500).end(err instanceof Error ? err.message : err);
  }
}

export async function getUserReview(req: Request, res: Response) {
  const recipe_id = req.params.id;
  const user_id = req.session.userId;
  
  try {
    const result = await pool.query(
      "SELECT * FROM reviews WHERE recipe_id = $1::text AND user_id = $2::uuid LIMIT 1",
      [recipe_id, user_id]
    );
    
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    } else {
      return res.json(null);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).end(err instanceof Error ? err.message : err);
  }
}

export async function upsertReview(req: Request, res: Response, next: NextFunction) {
  const rating = parseInt(req.body.rating);
  const comment = req.body.comment as string;
  const recipe_id = req.params.id;
  const user_id = req.session.userId;
  
  try {
    // Insert or update if already exists
    await pool.query(
      `INSERT INTO reviews (user_id, recipe_id, rating, comment) 
       VALUES ($1::uuid, $2::text, $3, $4)
       ON CONFLICT (user_id, recipe_id) 
       DO UPDATE SET rating = $3, comment = $4, created_at = NOW()`,
      [user_id, recipe_id, rating, comment]
    );
    
    // Update average rating
    const recipe = await pool.query(
      `UPDATE recipes 
       SET rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE recipe_id = $1::text) 
       WHERE id = $1::text 
       RETURNING *`,
      [recipe_id]
    );
    
    const cache_key = getRecipeKey(recipe.rows[0].id as string);
    cacheSet(cache_key, recipe.rows[0]);
    
    res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}