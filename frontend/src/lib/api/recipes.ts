import { RecipeSearchParams } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

export async function searchRecipesAPI(
  params: RecipeSearchParams
) {
  try {
    const queryString = new URLSearchParams(
        Object.entries(params)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();


    const res = await fetch(`${API}/api/recipes/search?${queryString}`, {
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
    const res = await fetch(`${API}/api/recipes/${id}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get recipe: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching recipe:", error);
  }
}

export async function saveRecipeAPI(id: string) {
  try {
    const res = await fetch(`${API}/api/recipes/${id}/save`, {
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
    const res = await fetch(`${API}/api/recipes/${id}/save`, {
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

    const res = await fetch(`${API}/api/recipes/saved${queryString ? '?' + queryString : ''}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get saved recipe: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching saved recipe:", error);
  }
}

export async function postReviewAPI(id: string, data: { rating: number; comment: string }) {
  try {
    const res = await fetch(`${API}/api/recipes/${id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to post review: ${res.status}`);
    return res.json();
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

    const res = await fetch(`${API}/api/recipes/${id}/reviews${queryString ? '?' + queryString : ''}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get reviews: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching review:", error);
  }
}
