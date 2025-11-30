export const getMealPlanWithUserIDWeek = `SELECT *
                                          FROM meal_plans
                                          WHERE user_id = $1
                                          AND week_start = $2`;

export const getMealPlanLock = `SELECT *
                                FROM meal_plans
                                WHERE user_id = $1
                                AND week_start = $2
                                FOR UPDATE`;

export const insertMealPlan = `INSERT INTO meal_plans (user_id, week_start, generated)
                               VALUES ($1, $2, TRUE)
                               ON CONFLICT (user_id, week_start) DO NOTHING`;

export const insertMealPlanEntry = `INSERT INTO meal_plan_entries (plan_id, date, meal_type, recipe_id)
                                    VALUES ($1, $2, $3, $4)`;

export const getMealPlanEntriesWithUserIDWeek = `SELECT e.*, r.title, r.image_url
                                                 FROM meal_plan_entries e
                                                 JOIN meal_plans p ON e.plan_id = p.id
                                                 JOIN recipes r ON e.recipe_id = r.id
                                                 WHERE p.user_id = $1 AND p.week_start = $2
                                                 ORDER BY e.date, e.meal_type`;

export const updateMealPlanEntry = `UPDATE meal_plan_entries
                                    SET recipe_id = $1
                                    WHERE id = $2`;

export const deleteMealPlan = `DELETE
                               FROM meal_plans
                               WHERE id = $1
                               AND user_id = $2`;

export const deleteEntryWithPlanID = `DELETE 
                                      FROM meal_plan_entries
                                      WHERE plan_id = $1`;

export const getEntriesRecipeData = `SELECT r.cached_data
                                     FROM meal_plan_entries e
                                     JOIN recipes r ON e.recipe_id = r.id
                                     WHERE e.plan_id = $1`;


