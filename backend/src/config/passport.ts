import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../db';

// chatgpt

passport.serializeUser(function (user: any, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id: number, done) {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async function (_accessToken, _refreshToken, profile, done) {
      try {
        const email = profile.emails?.[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        let user = await pool.query('SELECT * FROM users WHERE google_id = $1 LIMIT 1', [googleId]);

        if (!user.rows[0] && email) {
          // check if user already exists with same email
          const existing_email = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);

          if (existing_email.rows.length > 0) {

            user = await pool.query('UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *', [googleId, email]);
          } else {
            user = await pool.query(`INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *`, [name, email, googleId]);
          }
        }

        done(null, user.rows[0]);
      } catch (err) {
        done(err, false);
      }
    }
  )
);

export default passport;