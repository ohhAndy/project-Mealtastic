import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../db';

// chatgpt: https://chatgpt.com/s/t_6928e2c8e9b881919955bfd7023bdd17 prompt: what about google auth (after asking about backend format for typescript app of our site idea)
// and later on: https://chatgpt.com/s/t_69293b76c6408191b6f0b2fb588d82c4 for google calendar feature (dropped due to approval period needed from google)

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
            user = await pool.query('UPDATE users SET google_id = $1, google_access_token = $2, google_refresh_token = $3 WHERE email = $4 RETURNING *', [googleId, _accessToken, _refreshToken, email]);
          } else {
            user = await pool.query(`INSERT INTO users (name, email, google_id, google_access_token, google_refresh_token) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [name, email, googleId, _accessToken, _refreshToken]);
            await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [user.rows[0].id]);
          }
        }
        else {
          // update refresh/access tokens
          user = await pool.query(
            'UPDATE users SET google_access_token = $1, google_refresh_token = $2 WHERE google_id = $3 RETURNING *',
            [_accessToken, _refreshToken, googleId]
          );
        }

        done(null, user.rows[0]);
      } catch (err) {
        done(err, false);
      }
    }
  )
);

export default passport;