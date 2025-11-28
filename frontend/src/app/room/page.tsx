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
import { createRoomAPI, getRoomsAPI } from "@/lib/api/room";
import { searchRecipesAPI } from "@/lib/api/recipes";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const ITEMS_PER_PAGE = 10;

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

  const [modalPage, setModalPage] = useState(0);
  const [modalTotalResults, setModalTotalResults] = useState(0);

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  if (authLoading || !user) return null;

  async function fetchRooms(pageToFetch: number) {
    setFetching(true);
    try {
      const data = await getRoomsAPI({ page: pageToFetch, limit });
      setRooms(data.rooms || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setFetching(false);
    }
  }

  async function fetchRoomsForRecipe(recipeId: string) {
    setFetching(true);

    try {
      const data = await getRoomsAPI({ page: 0, limit, recipe_id: recipeId });
      setRooms(data.rooms || []);
      setTotalPages(data.totalPages || 1);
      setPage(0);
    } catch {
      toast.error("Server error");
    } finally {
      setFetching(false);
    }
  }

  async function searchRecipes(pageIndex: number = 0) {
    if (!searchQuery) return;
    setSearching(true);
    setModalPage(pageIndex);

    try {
      const data = await searchRecipesAPI({ 
        query: searchQuery, 
        limit: ITEMS_PER_PAGE, 
        page: pageIndex, 
      });
      if (Array.isArray(data)) {
        setSearchResults(data);
        setModalTotalResults(data.length);
      } else {
        setSearchResults(data?.results || []);
        setModalTotalResults(data?.totalResults || 0);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }

  const handleModalPageChange = (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? modalPage + 1 : modalPage - 1;
    if (newPage < 0) return;
    searchRecipes(newPage);
  };

  async function handleCreateRoom() {
    setModalMode("create");
    setShowModal(true);

    setSearchQuery("");
    setSearchResults([]);
    setModalPage(0);
    setModalTotalResults(0);
    setSelectedRecipe(null);
  }

  async function handleSearchRooms() {
    setModalMode("search");
    setShowModal(true);

    setSearchQuery("");
    setSearchResults([]);
    setModalPage(0);
    setModalTotalResults(0);
    setSelectedRecipe(null);
  }

  async function handleConfirm() {
    if (!selectedRecipe) return;

    if (modalMode === "create") {
      // create new room
      setLoading(true);
      try {
        const data = await createRoomAPI({
          recipe_id: selectedRecipe.id,
          recipe_name: selectedRecipe.title,
        });
        toast.success("Room created!");
        router.push(`/room/${data.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create room");
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

  const modalTotalPages = Math.ceil(modalTotalResults / ITEMS_PER_PAGE);

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

            <Button variant="outline" onClick={handleSearchRooms}>
              Search Rooms by Recipe
            </Button>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Available Rooms
            </CardTitle>
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
                  Be the first to{" "}
                  <span className="font-medium text-orange-600">
                    start one!
                  </span>
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
              {modalMode === "create"
                ? "Select a Recipe to Cook"
                : "Search Rooms by Recipe"}
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
                        selectedRecipe?.id === r.id
                          ? "bg-orange-100"
                          : "hover:bg-orange-50"
                      }`}
                    >
                      {r.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="pt-4 border-t flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModalPageChange('prev')}
                  disabled={modalPage === 0 || searching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                
                <span className="text-xs text-muted-foreground">
                  Page {modalPage + 1} of {modalTotalPages || 1}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModalPageChange('next')}
                  disabled={(modalPage >= modalTotalPages - 1) || searching}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}  

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
