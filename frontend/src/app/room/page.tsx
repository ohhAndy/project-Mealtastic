// both page and [roomId] page initially based on thsi chatgpt response: https://chatgpt.com/s/t_69293708b57c8191b2b452074b48be93 prompt: 'show me how client side would look on a next.js page' (after getting an example backend)
// and later on with the addition of a chat response: https://chatgpt.com/s/t_692937d436b48191ae9bcd5506a25fd1 a lot of debugging ensued and ended up changing the approach to the polling slightly later on
// creation of rooms based on recipes initial addition: https://chatgpt.com/s/t_69293e0e0fa4819186953fb9a5ff88f5 and https://chatgpt.com/s/t_69293e2d629c81918ec929466e98af93
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
  const [modalMode, setModalMode] = useState<"create" | "search">("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  if (authLoading || !user) return null;

  async function fetchRooms(pageToFetch: number) {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: limit.toString(),
      });

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

  async function fetchRoomsForRecipe(recipeId: string) {
    setFetching(true);

    try {
      const params = new URLSearchParams({
        recipe_id: recipeId,
        page: "0",
        limit: limit.toString(),
      });

      const res = await fetch(`/api/rooms?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setRooms(data.rooms || []);
        setTotalPages(data.totalPages || 1);
        setPage(0);
      } else {
        toast.error(data.error || "No rooms found");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setFetching(false);
    }
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

  async function handleCreateRoom() {
    setModalMode("create");
    setShowModal(true);
  }

  async function handleSearchRooms() {
    setModalMode("search");
    setShowModal(true);
  }

  async function handleConfirm() {
    if (!selectedRecipe) return;

    if (modalMode === "create") {
      // create new room
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
          router.push(`/room/${data.id}`);
        } else {
          toast.error(data.error || "Failed to create room");
        }
      } finally {
        setLoading(false);
        setShowModal(false);
      }
    } else {
      fetchRoomsForRecipe(selectedRecipe.id.toString());
      setShowModal(false);
    }
    setSelectedRecipe(null);
    setSearchQuery("");
    setSearchResults([]);
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

          <div className="flex gap-3 justify-center">
            <Button
              disabled={loading}
              onClick={handleCreateRoom}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Create a Room
            </Button>

            <Button
              variant="outline"
              onClick={handleSearchRooms}
            >
              Search Rooms by Recipe
            </Button>
          </div>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "create" ? "Select a Recipe to Cook" : "Search Rooms by Recipe"}
            </h2>

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
              <Button disabled={!selectedRecipe} onClick={handleConfirm}>
                {modalMode === "create" ? "Create Room" : "Search Rooms"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
