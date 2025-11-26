import { RecipeSearchParams } from "@/types";

export interface CreateRecipeData {
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  cuisines?: string[];
  diets?: string[];
  extendedIngredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
      ingredients: string[];
      equipment: string[];
    }[];
  }[];
}

export async function searchRecipesAPI(
  params: RecipeSearchParams
) {
  try {
    const queryString = new URLSearchParams(
        Object.entries(params)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();


    const res = await fetch(`/api/recipes/search?${queryString}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to search recipes: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching recipes:", error);
  }
}

export async function getRecipeByIdAPI(id: string) {
  try {
    const res = await fetch(`/api/recipes/${id}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get recipe: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching recipe:", error);
  }
}

export async function createRecipeAPI(data: CreateRecipeData) {
  try {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to create recipe: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error creating recipe:", error);
    throw error; 
  }
}

export async function saveRecipeAPI(id: string) {
  try {
    const res = await fetch(`/api/recipes/${id}/save`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to save recipe: ${res.status}`);
  } catch (error) {
    console.error("Error saving recipe:", error);
  }
}

export async function unsaveRecipeAPI(id: string) {
  try {
    const res = await fetch(`/api/recipes/${id}/save`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to unsave recipe: ${res.status}`);
  } catch (error) {
    console.error("Error unsaving recipe:", error);
  }
}

export async function getSavedRecipesAPI(params?: { page?: number; limit?: number }) {
  try {
    const queryString = params ? new URLSearchParams(
        Object.entries(params)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';

    const res = await fetch(`/api/recipes/saved${queryString ? '?' + queryString : ''}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get saved recipe: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching saved recipe:", error);
  }
}

export async function upsertReviewAPI(id: string, data: { rating: string; comment: string }) {
  try {
    const res = await fetch(`/api/recipes/${id}/reviews`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to post review: ${res.status}`);
    return true;
  } catch (error) {
    console.error("Error posting review:", error);
  }
}

export async function getReviewsAPI(id: string, params?: { page?: number; limit?: number }) {
  try {
    const queryString = params 
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';

    const res = await fetch(`/api/recipes/${id}/reviews${queryString ? '?' + queryString : ''}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get reviews: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching review:", error);
    throw error;
  }
}

export async function deleteReviewAPI(recipeId: string, reviewId: string) {
  try {
    const res = await fetch(`/api/recipes/${recipeId}/reviews/${reviewId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete review: ${res.status}`);
    }
    return true;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

export async function getUserReviewAPI(recipeId: string) {
  try {
    const res = await fetch(`/api/recipes/${recipeId}/reviews/user`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to get user review: ${res.status}`);

    return res.json(); 
  } catch (error) {
    console.error("Error fetching user review:", error);
    throw error;
  }
}

export async function getReviewCountAPI(recipeId: string) {
  try {
    const res = await fetch(`/api/recipes/${recipeId}/reviews/count`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to get review count: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching review count:", error);
    throw error;
  }
}
