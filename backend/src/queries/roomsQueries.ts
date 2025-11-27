export const getRoomPeers = `SELECT *
                             FROM peers
                             WHERE room_id = $1`;

export const getUserPeer = `SELECT *
                              FROM peers
                              WHERE room_id = $1
                              AND user_id = $2`;

export const getUserRooms = `SELECT *
                             FROM rooms
                             WHERE owner_id = $1`;

export const getUserName = `SELECT name
                            FROM users
                            WHERE id = $1`;

export const insertRoom = `INSERT INTO rooms (owner_id, owner_name, recipe_id, recipe_name)
                           VALUES ($1, $2, $3, $4)
                           RETURNING *`;

export const getRooms = `SELECT *
                         FROM rooms
                         LIMIT $1
                         OFFSET $2`;

export const getRoomsByRecipe = `SELECT *
                                 FROM rooms
                                 WHERE recipe_id = $1
                                 LIMIT $2
                                 OFFSET $3`;

export const countRooms = `SELECT COUNT(*) AS total
                           FROM rooms`;

export const getRoom = `SELECT *
                        FROM rooms
                        WHERE id = $1`;

export const insertPeer = `INSERT INTO peers (room_id, user_id, username)
                           VALUES ($1, $2, $3)
                           RETURNING *`;

export const deletePeer = `DELETE FROM peers
                           WHERE id = $1`;
                
export const deleteRoom = `DELETE FROM rooms
                           WHERE id = $1`;

export const deleteInactivePeers = `DELETE FROM peers
                                    WHERE last_seen < NOW() - ($1 || ' seconds')::interval
                                    RETURNING id, room_id`;

export const insertMessages = `INSERT INTO messages (room_id, sender_id, content)
                               VALUES ($1, $2, $3)`;

export const getMessages = `SELECT sender_id AS from, content, created_at
                            FROM messages
                            WHERE room_id = $1
                            ORDER BY created_at ASC`;