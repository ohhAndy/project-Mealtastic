export const getUserSavedRecipes = `SELECT r.*
                                    FROM recipes r
                                    JOIN saved_recipes s ON s.recipe_id = r.id
                                    WHERE s.user_id = $1`;

export const searchRecipes = `SELECT r.*, COUNT(*) OVER() as total_count
                              FROM recipes r
                              JOIN user_preferences p ON p.user_id = $1
                              WHERE (LOWER(r.title) LIKE LOWER($2) OR LOWER(r.cached_data->>'summary') LIKE LOWER($2))
                              AND ($3::TEXT IS NULL OR LOWER($3) = ANY(ARRAY(SELECT LOWER(unnest(r.diets)))))
                              AND ($4::TEXT IS NULL OR LOWER($4) = ANY(ARRAY(SELECT LOWER(unnest(r.cuisines)))))
                              AND r.prep_time < $5
                              AND NOT (ARRAY(SELECT jsonb_array_elements_text(r.cached_data->'ingredients')) && p.exclude_ingredients)
                              ORDER BY r.rating DESC
                              LIMIT $6 OFFSET $7`;

export const insertRecipe = `INSERT INTO recipes (id, title, image_url, prep_time, cuisines, diets, source, cached_data)
                             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                             ON CONFLICT (id) DO NOTHING`;

export const insertUserRecipe = `INSERT INTO recipes (title, image_url, prep_time, cuisines, diets)
                                 VALUES ($1, $2, $3, $4, $5)
                                 ON CONFLICT (id) DO NOTHING
                                 RETURNING id`;
                                 
export const updateCachedData = `UPDATE recipes
                                 SET cached_data = $1
                                 WHERE id = $2
                                 RETURNING *`;

export const insertSavedRecipe = `INSERT INTO saved_recipes (user_id, recipe_id)
                                  VALUES ($1, $2::text)`;

export const getSomeSavedRecipes = `SELECT r.*, COUNT(*) OVER() as total_count
                                    FROM recipes r
                                    JOIN saved_recipes s ON s.recipe_id = r.id
                                    AND s.user_id = $1
                                    ORDER BY s.saved_at DESC
                                    LIMIT $2 OFFSET $3`;

export const deleteSavedRecipe = `DELETE 
                                  FROM saved_recipes
                                  WHERE recipe_id = $1::text
                                  AND user_id = $2`;

export const getRecipeReviews = `SELECT *
                                 FROM reviews
                                 WHERE recipe_id = $1::text
                                 ORDER BY created_at DESC
                                 LIMIT $2 OFFSET $3`;

export const checkReviewUser = `SELECT recipe_id
                                FROM reviews
                                WHERE id = $1::uuid
                                AND user_id = $2::uuid`;

export const deleteReview = `DELETE FROM reviews
                             WHERE id = $1::uuid
                             AND user_id = $2::uuid`;

export const updateRatings = `UPDATE recipes 
                              SET rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE recipe_id = $1::text)
                              WHERE id = $1::text
                              RETURNING *`;

export const countReviews = `SELECT COUNT(*)::int as count
                             FROM reviews
                             WHERE recipe_id = $1::text`;

export const getUserReview = `SELECT *
                              FROM reviews
                              WHERE recipe_id = $1::text
                              AND user_id = $2::uuid
                              LIMIT 1`;

export const upsertReview = `INSERT INTO reviews (user_id, recipe_id, rating, comment) 
                             VALUES ($1::uuid, $2::text, $3, $4)
                             ON CONFLICT (user_id, recipe_id) 
                             DO UPDATE SET rating = $3, comment = $4, created_at = NOW()`;