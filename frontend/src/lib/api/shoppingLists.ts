export interface ShoppingListSummary {
  id: string;
  plan_id: string;
  created_at: string;
  week_start: string;
}

export interface GetListsResponse {
  lists: ShoppingListSummary[];
  totalPages: number;
}

// Type for the details page
export interface ShoppingItemDetails {
  id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  category?: string;
  checked: boolean;
}

export async function getShoppingListsAPI(page: number, limit: number): Promise<GetListsResponse> {
  try {
    const res = await fetch(
      `/api/shopping-list?page=${page}&limit=${limit}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to fetch shopping lists");
    return res.json();
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
    throw error;
  }
}

export async function deleteShoppingListAPI(listId: string): Promise<void> {
  try {
    const res = await fetch(`/api/shopping-list/${listId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete shopping list");
  } catch (error) {
    console.error("Error deleting shopping list:", error);
    throw error;
  }
}

export async function generateShoppingListAPI(planId?: number | string): Promise<{ list_id: string }> {
  try {
    // If planId is provided, use it; otherwise defaults to current week generation on backend
    const url = planId 
      ? `/api/shopping-list/generate?plan_id=${planId}` 
      : `/api/shopping-list/generate`;

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
    });

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

export async function getShoppingListDetailsAPI(planId: string): Promise<{ items: ShoppingItemDetails[] }> {
  try {
    const res = await fetch(`/api/shopping-list/${planId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch shopping list details");
    return res.json();
  } catch (error) {
    console.error("Error fetching shopping list details:", error);
    throw error;
  }
}

export async function updateShoppingItemAPI(itemId: string, data: { checked?: boolean; quantity?: number }): Promise<void> {
  try {
    const res = await fetch(`/api/shopping-list/item/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update item");
  } catch (error) {
    console.error("Error updating shopping item:", error);
    throw error;
  }
}

export async function deleteShoppingItemAPI(itemId: string): Promise<void> {
  try {
    const res = await fetch(`/api/shopping-list/item/${itemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete item");
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    throw error;
  }
}