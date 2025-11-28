export async function generateShoppingListAPI(planId: number): Promise<{ list_id: string }> {
  try {
    const res = await fetch(
      `/api/shopping-list/generate?plan_id=${planId}`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to generate shopping list");
    }

    return res.json();
  } catch (error) {
    console.error("Error generating shopping list:", error);
    throw error;
  }
}