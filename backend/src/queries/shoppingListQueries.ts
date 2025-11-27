export const getUserAndPlanShoppingList = `SELECT *
                                           FROM shopping_lists
                                           WHERE plan_id = $1 AND user_id = $2`;

export const deleteShoppingList = `DELETE FROM shopping_lists
                                   WHERE id = $1`;

export const insertShoppingList = `INSERT INTO shopping_lists (plan_id, user_id)
                                   VALUES ($1, $2)
                                   RETURNING id`;

export const insertShoppingItem = `INSERT INTO shopping_items (list_id, ingredient, quantity, unit, category)
                                   VALUES ($1, $2, $3, $4, $5)`;

export const getShoppingItems = `SELECT i.*, s.created_at
                                 FROM shopping_items i
                                 JOIN shopping_lists s ON i.list_id = s.id
                                 WHERE s.user_id = $1
                                 AND s.plan_id = $2
                                 ORDER BY i.ingredient ASC`;

export const countShoppingLists = `SELECT COUNT(*) AS total
                                   FROM shopping_lists s
                                   WHERE s.user_id = $1`;

export const getShoppingLists = `SELECT s.*, m.week_start
                                 FROM shopping_lists s
                                 JOIN meal_plans m ON s.plan_id = m.id
                                 WHERE s.user_id = $1
                                 ORDER BY m.week_start DESC
                                 LIMIT $2 OFFSET $3`;

export const checkShoppingItemUser = `SELECT s.user_id
                                      FROM shopping_lists s, shopping_items i
                                      WHERE i.id = $1
                                      AND s.id = i.list_id
                                      AND s.user_id = $2`;

export const checkShoppingListUser = `SELECT user_id
                                      FROM shopping_lists
                                      AND id = $1
                                      AND user_id = $2`

export const deleteShoppingItem = `DELETE FROM shopping_items i
                                   WHERE id = $1`





