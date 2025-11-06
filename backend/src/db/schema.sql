-- =========================
--  USERS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
--  USER PREFERENCES (1-1)
-- =========================
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  diet TEXT,
  calorie_min INT,
  calorie_max INT,
  exclude_ingredients TEXT[] DEFAULT '{}'
);

-- =========================
--  RECIPES
-- =========================
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,                -- can be external API id or UUID
  title TEXT NOT NULL,
  image_url TEXT,
  prep_time INT,
  cuisines TEXT[] DEFAULT '{}',
  diets TEXT[] DEFAULT '{}',
  source TEXT,
  cached_data JSONB,
  rating FLOAT DEFAULT 0,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_in INTERVAL DEFAULT INTERVAL '7 days',
  persistent BOOLEAN DEFAULT FALSE
);

-- =========================
--  SAVED RECIPES (M:N join)
-- =========================
CREATE TABLE saved_recipes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- =========================
--  REVIEWS
-- =========================
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
--  MEAL PLANS
-- =========================
CREATE TABLE meal_plans (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
--  MEAL PLAN ENTRIES (1:N from meal_plans)
-- =========================
CREATE TABLE meal_plan_entries (
  id SERIAL PRIMARY KEY,
  plan_id INT REFERENCES meal_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE
);

-- =========================
--  SHOPPING LISTS
-- =========================
CREATE TABLE shopping_lists (
  id SERIAL PRIMARY KEY,
  plan_id INT REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
--  SHOPPING ITEMS
-- =========================
CREATE TABLE shopping_items (
  id SERIAL PRIMARY KEY,
  list_id INT REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity FLOAT,
  unit TEXT,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE
);
