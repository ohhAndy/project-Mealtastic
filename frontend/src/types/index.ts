// types/index.ts

export interface User {
  id: number;
  email: string;
  name: string;
  dietary_preferences?: string[];
  allergies?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  prep_time?: number;
  cuisines?: string[];
  diets?: string[];
  source?: string;
  cached_data?: RecipeCachedData;
  rating?: number;
  persistent?: boolean;
}

// Ingredient from cached_data
export interface Ingredient {
  id?: number;
  name: string;
  amount?: number;
  unit?: string;
  original?: string;
}

export interface SavedRecipe {
  id: number;
  userId: number;
  recipeId: string;
  savedAt: string;
  recipe: Recipe;
}

export interface Review {
  id: number;
  user_id: number;
  recipe_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface MealPlan {
  id: number;
  userId: number;
  name: string;
  weekStartDate: string;
  meals: PlannedMeal[];
  createdAt: string;
}

export interface PlannedMeal {
  id: number;
  mealPlanId: number;
  recipeId: string;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  mealType: "breakfast" | "lunch" | "dinner";
  recipe: Recipe;
}

export interface ShoppingList {
  id: number;
  mealPlanId: number;
  userId: number;
  generatedAt: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: number;
  shoppingListId: number;
  ingredientName: string;
  quantity: string;
  unit: string;
  recipeNames: string[];
  isChecked: boolean;
  category?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RecipeSearchParams {
  query?: string;
  cuisine?: string;
  diet?: string;
  maxPrepTime?: string;
  page?: number;
  limit?: number;
}

export interface AutoGenerateOptions {
  meals: string[];
  days: number[];
  preferences: {
    variety: boolean;
    quickMeals: boolean;
    useSaved: boolean;
  };
}

export interface RecipeCachedData {
  id: number;
  title: string;
  image: string;
  readyInMinutes?: number;
  servings?: number;
  cuisines?: string[];
  diets?: string[];
  sourceUrl?: string;
  summary?: string;
  extendedIngredients?: { name: string; amount: number; unit: string }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
      ingredients: { id: number; name: string; image: string }[];
      equipment: { id: number; name: string; image: string }[];
    }[];
  }[];
}
