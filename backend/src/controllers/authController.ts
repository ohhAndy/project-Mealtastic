import { Request, Response, NextFunction } from "express";
import { genSalt, hash, compare } from "bcrypt";
import { serialize } from "cookie";
import pool from "../db";
import { DatabaseError } from "pg";

// all sql queries and promises code help from chatgpt
export async function register (req: Request, res: Response, next: NextFunction) {
  if (!("name" in req.body))
    return res.status(400).end("name is missing");
  if (!("email" in req.body))
    return res.status(400).end("email is missing");
  if (!("password" in req.body))
    return res.status(400).end("password is missing");
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  try {
    const existing_email = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing_email.rows.length > 0)
      return res.status(409).end("Email " + email + " already exists");
    // generate a new salt and hash
    const salt = await genSalt(10);
    const hashed = await hash(password, salt);
    const result = await pool.query(`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *`, [name, email, hashed]);
    const user = result.rows[0];
    req.session.userId = user.id;
    res.setHeader(
      "Set-Cookie",
      serialize("name", user.name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds,
        sameSite: true,
        secure: process.env.NODE_ENV == "prod" // true: only re-attach for https requests only
      })
    );
    await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [user.id]);
  } catch (err) {
    if (err instanceof DatabaseError)
      return res.status(500).end(err.message);
    return res.status(500).end(err);
  }
  res.sendStatus(200);
}

export async function login(req: Request, res: Response, next: NextFunction) {
  if (!("email" in req.body))
    return res.status(400).end("email is missing");
  if (!("password" in req.body))
    return res.status(400).end("password is missing");
  let email = req.body.email;
  let password = req.body.password;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (result.rows.length == 0) return res.status(401).end("access denied");
    const user = result.rows[0];

    const valid = await compare(password, user.password_hash);
    if (!valid) return res.status(401).end("access denied");
    req.session.userId = user.id;
    res.setHeader(
      "Set-Cookie",
      serialize("name", user.name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds,
        sameSite: true,
        secure: process.env.NODE_ENV == "prod" // true: only re-attach for https requests only
      })
    );
  } catch (err) {
    return res.status(500).end(err);
  }
  res.sendStatus(200);
}

export function googleRedirect(req: Request, res: Response) {
  res.redirect("/");
}

export function logout(req: Request, res: Response, next: NextFunction) {
  req.session.destroy(function (err) {
    if (err) return res.status(500).end(err);
    res.setHeader(
      "Set-Cookie",
      serialize("name", "", {
        path: "/",
        maxAge: 0,
      })
    );
    return res.redirect("/");
  });
}