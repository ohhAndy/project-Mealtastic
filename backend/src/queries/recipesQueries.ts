export const getUserSavedRecipes = `SELECT r.*
                                    FROM recipes r
                                    JOIN saved_recipes s ON s.recipe_id = r.id
                                    WHERE s.user_id = $1`;