"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { Trash2, Check } from "lucide-react";

type ShoppingItem = {
  id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  category?: string;
  checked: boolean;
};

interface ShoppingListPageProps {
  params: { plan_id: string };
}

export default function ShoppingListPage({ params }: ShoppingListPageProps) {
  const { plan_id } = params;
  const { user, isLoading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!plan_id) return;
    fetchShoppingList();
  }, [plan_id]);

  const fetchShoppingList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shopping-list/${plan_id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleChecked = async (item: ShoppingItem) => {
    if (updatingItemIds.has(item.id)) return;

    setUpdatingItemIds((prev) => new Set(prev).add(item.id));

    try {
      await fetch(`/api/shopping-list/item/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !item.checked }),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, checked: !i.checked } : i
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingItemIds((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
    }
  };

  const updateQuantity = async (item: ShoppingItem, newQty: number) => {
    if (updatingItemIds.has(item.id)) return;
    if (newQty <= 0) return;

    setUpdatingItemIds((prev) => new Set(prev).add(item.id));

    try {
      await fetch(`/api/shopping-list/item/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingItemIds((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;

    try {
      await fetch(`/api/shopping-list/item/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Shopping List</h1>
        <p className="text-slate-600 mb-6">View and update your shopping list</p>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-slate-600">No items found for this shopping list.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border p-2 rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={item.checked ? "secondary" : "outline"}
                    onClick={() => toggleChecked(item)}
                    className="w-8 h-8 p-1"
                    disabled={updatingItemIds.has(item.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <span
                    className={`${
                      item.checked ? "line-through text-gray-400" : "font-semibold"
                    }`}
                  >
                    {item.ingredient}
                  </span>
                  <span className="text-gray-600">
                    ({item.quantity} {item.unit})
                  </span>
                  {item.category && <em className="text-gray-500 ml-2">[{item.category}]</em>}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    disabled={updatingItemIds.has(item.id)}
                    onChange={(e) => updateQuantity(item, parseFloat(e.target.value))}
                    className="border rounded w-20 text-right p-1"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteItem(item.id)}
                    disabled={updatingItemIds.has(item.id)}
                    className="w-8 h-8 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}