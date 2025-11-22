"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/hooks/useAuth";

interface ShoppingList {
  id: string;
  plan_id: string;
  created_at: string;
  week_start: string;
}

export default function ShoppingListsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchLists();
  }, [user]);

  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shopping-list`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shopping lists");
      const data = await res.json();
      setLists(data.lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm("Delete this shopping list?")) return;
    setDeletingId(listId);

    try {
      const res = await fetch(`/api/shopping-list/${listId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete shopping list");
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">My Shopping Lists</h1>
        <p className="text-slate-600 mb-6">All your shopping lists by week</p>

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
        ) : lists.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No shopping lists yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map(list => (
              <div key={list.id} className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">
                    Week of {new Date(list.week_start).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Created: {new Date(list.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 flex justify-between items-center gap-2">
                  <Link href={`/shopping-lists/${list.plan_id}`}>
                    <Button size="sm" className="flex-1">
                      View List
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteList(list.id)}
                    disabled={deletingId === list.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
