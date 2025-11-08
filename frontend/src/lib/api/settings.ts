const API = process.env.NEXT_PUBLIC_API_URL!;

export async function getUserPreferences() {
  try {
    const res = await fetch(`${API}/api/preferences`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to get user preferences: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Error fetching preferences:", error);
  }
}

export async function updateUserPreferences(data: {minCalories: string, maxCalories: string, excludeIngredients: string[]}) {
  try {
    const res = await fetch(`${API}/api/preferences`, {
      method: "POST",
      headers: {
        "Content-Type" : "application/json"
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Failed to update user preferences: ${res.status}`);
  } catch (error) {
    console.error("Error updating preferences:", error);
  }
}