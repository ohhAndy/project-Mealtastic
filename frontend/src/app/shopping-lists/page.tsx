// initial code for page and [plan_id] page based on chagpt responses: https://chatgpt.com/s/t_69293c45b8bc8191a43fe0830a738c61 and https://chatgpt.com/s/t_69293c8dc2c88191bc91c2601d3aad5d
// pagination addition: https://chatgpt.com/s/t_69293d4f3b608191880dcda7ea9377a2 prompt: I added pagination to the getshoppinglists so add pagination to the page the there is a page and limit query now for the endpoint make it 10 shopping lists per page

//Used chatGPT to abstract API calls to seperate files. 
//Prompts used: "abstract these API calls to seperate files and methods"

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { deleteShoppingListAPI, generateShoppingListAPI, getShoppingListsAPI } from "@/lib/api/shoppingLists";

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
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  const today = new Date();
  const currentWeekStart = new Date(today);
  const day = today.getDay();
  currentWeekStart.setDate(today.getDate() - ((day + 6) % 7)); // Monday start
  const currentWeekStr = currentWeekStart.toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    fetchLists(page);
  }, [user, page]);

  const fetchLists = async (pageToFetch: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShoppingListsAPI(pageToFetch, limit);
      setLists(data.lists || []);
      setTotalPages(data.totalPages || 1);
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
      await deleteShoppingListAPI(listId);
      fetchLists(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const generateThisWeek = async () => {
    setGenerating(true);
    try {
      await generateShoppingListAPI();
      fetchLists(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || !user) return null;

  const hasCurrentWeekList = lists.some(l => l.week_start === currentWeekStr);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">My Shopping Lists</h1>
        <p className="text-slate-600 mb-6">All your shopping lists by week</p>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!loading && !hasCurrentWeekList && (
          <div className="mb-6 text-center">
            <Button
              onClick={generateThisWeek}
              disabled={generating}
              className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Generate This Week Shopping List
            </Button>
          </div>
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map(list => {
                const isCurrentWeek = list.week_start === currentWeekStr;
                return (
                  <div
                    key={list.id}
                    className={`bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition ${
                      isCurrentWeek ? "border-2 border-green-700" : ""
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">
                        Week of{" "}
                        {new Date(list.week_start).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })}
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
                );
              })}
            </div>
            <div className="flex justify-center items-center gap-3 mt-8">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(prev => prev - 1)}
              >
                Previous
              </Button>

              <span className="px-4 py-2 bg-white rounded-md shadow-sm font-medium">
                Page {page + 1} of {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={page + 1 === totalPages}
                onClick={() => setPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
