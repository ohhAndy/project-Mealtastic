-- =========================
--  USERS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_user_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
--  USER PREFERENCES (1-1)
-- =========================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calorie_min INT,
  calorie_max INT,
  exclude_ingredients TEXT[] DEFAULT '{}'
);

-- =========================
--  RECIPES
-- =========================
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,                -- can be external API id or UUID
  title TEXT NOT NULL,
  image_url TEXT,
  prep_time INT,
  cuisines TEXT[] DEFAULT '{}',
  diets TEXT[] DEFAULT '{}',
  source TEXT,
  cached_data JSONB,
  rating FLOAT DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_in INTERVAL DEFAULT INTERVAL '7 days',
  persistent BOOLEAN DEFAULT FALSE
);


-- =========================
--  SAVED RECIPES (M:N join)
-- =========================
CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- =========================
--  REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  MEAL PLANS
-- =========================
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  MEAL PLAN ENTRIES (1:N from meal_plans)
-- =========================
CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE
);

-- =========================
--  SHOPPING LISTS
-- =========================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  SHOPPING ITEMS
-- =========================
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity FLOAT,
  unit TEXT,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE
);

-- =========================
--  ROOMS
-- =========================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  PEERS
-- =========================
CREATE TABLE IF NOT EXISTS peers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES peers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
--  INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_recipe ON reviews(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_plan ON meal_plan_entries(plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);
