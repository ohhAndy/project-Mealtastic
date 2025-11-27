export const getUserWithEmail = `SELECT *
                                 FROM users
                                 WHERE email = $1 LIMIT 1`;

export const getUserWithID = `SELECT id, name, email
                              FROM users
                              WHERE id = $1
                              LIMIT 1`;

export const insertUser = `INSERT INTO users (name, email, password_hash)
                           VALUES ($1, $2, $3)
                           RETURNING *`;

export const insertUserPreferences = `INSERT INTO user_preferences (user_id)
                                      VALUES ($1)`;
