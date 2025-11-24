"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/hooks/useAuth";

interface Room {
  id: string;
  owner_id: string;
  owner_name: string;
  recipe_id: string;
  recipe_name: string;
  created_at?: string;
}

interface Recipe {
  id: number;
  title: string;
  image_url?: string;
  ready_in_minutes?: number;
}

export default function RoomsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 9;
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [filterRecipeId, setFilterRecipeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  useEffect(() => {
    fetchRooms(0);
    setPage(0);
  }, [roomSearchQuery, filterRecipeId]);

  if (authLoading || !user) return null;

  async function fetchRooms(pageToFetch: number) {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: limit.toString(),
      });
      if (roomSearchQuery) params.append("search", roomSearchQuery);
      if (filterRecipeId) params.append("recipe_id", filterRecipeId);

      const res = await fetch(`/api/rooms?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error(data.error || "Failed to load rooms");
      }
    } catch (err) {
      toast.error("Server not reachable");
    } finally {
      setFetching(false);
    }
  }

  function handleCreateRoom() {
    setShowModal(true);
  }

  async function searchRecipes() {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/recipes/search?query=${encodeURIComponent(searchQuery)}&limit=10&page=0`,
        { credentials: "include" }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirmRoom() {
    if (!selectedRecipe) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipe_id: selectedRecipe.id,
          recipe_name: selectedRecipe.title,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Room created!");
        fetchRooms(page);
      } else {
        toast.error(data.error || "Failed to create room");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setShowModal(false);
      setSelectedRecipe(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  function handleJoinRoom(roomId: string) {
    router.push(`/room/${roomId}`);
  }

  function handleClickRecipe(recipeId: string) {
    router.push(`/recipes/${recipeId}`);
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800">
            🍳 Discover Cooking Rooms
          </h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Join a live cooking session, share your favorite recipes, or start
            your own room to host a cooking stream with friends.
          </p>
          <Button
            disabled={loading}
            onClick={handleCreateRoom}
            className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? "Creating..." : "Create a Room"}
          </Button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={roomSearchQuery}
            onChange={(e) => setRoomSearchQuery(e.target.value)}
            placeholder="Search rooms by recipe name..."
            className="border rounded px-3 py-2 flex-1"
          />
          {selectedRecipe && (
            <Button
              variant="outline"
              onClick={() => setFilterRecipeId(selectedRecipe.id.toString())}
            >
              Filter by {selectedRecipe.title}
            </Button>
          )}
          {filterRecipeId && (
            <Button variant="ghost" onClick={() => setFilterRecipeId(null)}>
              Clear Filter
            </Button>
          )}
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Available Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p className="text-sm">No rooms are live right now.</p>
                <p className="text-sm mt-1">
                  Be the first to <span className="font-medium text-orange-600">start one!</span>
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {rooms.map((room) => (
                    <Card
                      key={room.id}
                      className="border shadow-sm hover:shadow-md transition rounded-xl"
                    >
                      <CardHeader>
                        <CardTitle className="text-lg text-slate-700">
                          Cooking {room.recipe_name}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Hosted by {room.owner_name || "Anonymous"}
                        </p>
                      </CardHeader>
                      <CardContent className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleJoinRoom(room.id)}
                        >
                          Join Room
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleClickRecipe(room.recipe_id)}
                        >
                          View Recipe
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 bg-white rounded-md shadow-sm font-medium">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page + 1 === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipe selection modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Select a Recipe</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchRecipes()}
              placeholder="Search recipes..."
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <div className="max-h-60 overflow-y-auto mb-4">
              {searching ? (
                <p>Searching...</p>
              ) : searchResults.length === 0 ? (
                <p>No results</p>
              ) : (
                <ul>
                  {searchResults.map((r) => (
                    <li
                      key={r.id}
                      onClick={() => setSelectedRecipe(r)}
                      className={`p-2 cursor-pointer rounded mb-1 ${
                        selectedRecipe?.id === r.id ? "bg-orange-100" : "hover:bg-orange-50"
                      }`}
                    >
                      {r.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmRoom} disabled={!selectedRecipe || loading}>
                {loading ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
