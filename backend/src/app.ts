import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes";
import recipeRoutes from "./routes/recipesRoutes";
import preferencesRoutes from "./routes/preferencesRoutes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const PORT = 3001;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default whoops", // make sure to change the secret in the .env file
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "none",
      secure: process.env.NODE_ENV == "prod", // sets the secure flag only with HTTPS in production
      httpOnly: true
    },
  })
);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: ["http://localhost:3000", process.env.NEXT_PUBLIC_FRONTEND_URL!],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/preferences', preferencesRoutes);

// development: use express to serve frontend files
// production: use a dockerized nginx to serve frontend files
if (process.env.NODE_ENV == "dev")
  app.use(express.static("../../frontend/src"));

export const server = createServer(app).listen(PORT, function () {
  console.log("HTTP server on http://localhost:%s", PORT);
});
