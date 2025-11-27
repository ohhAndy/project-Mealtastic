export const getUserPreferences = `SELECT *
                                   FROM user_preferences
                                   WHERE user_id = $1
                                   LIMIT 1`;

export const insertUserPreferences = `INSERT INTO user_preferences (user_id, calorie_min, calorie_max, exclude_ingredients) VALUES ($1, $2, $3, $4) 
                                      ON CONFLICT (user_id) DO UPDATE
                                      SET calorie_min = EXCLUDED.calorie_min,
                                        calorie_max = EXCLUDED.calorie_max,
                                        exclude_ingredients = EXCLUDED.exclude_ingredients`;