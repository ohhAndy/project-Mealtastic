//

export interface MealEntry {
  id: number;
  plan_id: number;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  recipe_id: string | null;
  title?: string;
  image_url?: string;
}

export interface MealPlan {
  week_start: string;
  entries: MealEntry[];
}

export async function getMealPlanAPI(weekStart: string): Promise<MealPlan | null> {
  try {
    const res = await fetch(`/api/meal-planner?week_start=${weekStart}`, {
      method: "GET",
      credentials: "include",
    });
    
    if (res.status === 404) {
      return null;
    }
    
    if (!res.ok) {
      throw new Error(`Failed to fetch meal plan: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    throw error;
  }
}

export async function generateMealPlanAPI(): Promise<void> {
  try {
    const res = await fetch(`/api/meal-planner/generate`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to generate meal plan");
    }
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw error;
  }
}

export async function deleteMealPlanAPI(planId: number): Promise<void> {
  try {
    const res = await fetch(`/api/meal-planner/${planId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
        throw new Error(`Failed to delete meal plan: ${res.status}`);
    }
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    throw error;
  }
}

export async function updateMealEntryAPI(entryId: number, recipeId: number | null): Promise<void> {
  try {
    const res = await fetch(`/api/meal-planner/entry/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe_id: recipeId }),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to update meal entry: ${res.status}`);
    }
  } catch (error) {
    console.error("Error updating meal entry:", error);
    throw error;
  }
}

export async function exportMealPlanICS(weekStart: string): Promise<void> {
  try {
    const res = await fetch(`/api/meal-planner/export/ics?week_start=${weekStart}`, {
      method: "GET",
      credentials: "include",
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "mealplan.ics";
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to ICS file:", error);
    throw error;
  }
}