import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes";
import recipeRoutes from "./routes/recipesRoutes";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default whoops', // make sure to change the secret in the .env file
  resave: false,
  saveUninitialized: true,
  cookie: { 
      sameSite: true,
      secure: process.env.NODE_ENV == "prod", // sets the secure flag only with HTTPS in production 
  }
}))

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);

// development: use express to serve frontend files
// production: use a dockerized nginx to serve frontend files
if (process.env.NODE_ENV=="dev") app.use(express.static('../../frontend/src'));

export const server = createServer(app).listen(PORT, function () {
  console.log("HTTP server on http://localhost:%s", PORT);
});