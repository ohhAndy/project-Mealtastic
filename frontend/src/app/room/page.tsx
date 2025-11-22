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
  created_at?: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 9;
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  if (authLoading || !user) return null;

  async function fetchRooms(pageToFetch: number) {
    setFetching(true);
    try {
      const res = await fetch(`/api/rooms?page=${pageToFetch}&limit=${limit}`, {
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

  async function handleCreateRoom() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Room created");
        fetchRooms(page);
      } else {
        toast.error(data.error || "Failed to create room");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleJoinRoom(roomId: string) {
    router.push(`/room/${roomId}`);
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Hero section */}
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

        {/* Rooms list */}
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
                          Room #{room.id.slice(0, 6)}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Hosted by {room.owner_id || "Anonymous"}
                        </p>
                      </CardHeader>
                      <CardContent className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleJoinRoom(room.id)}
                        >
                          Join Room
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>

                  <span className="px-4 py-2 bg-white rounded-md shadow-sm font-medium">
                    Page {page} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    disabled={page === totalPages}
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
    </div>
  );
}
