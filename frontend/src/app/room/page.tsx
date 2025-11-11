"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Room {
  id: string;
  owner_id: string;
  created_at?: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch(`/api/rooms`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setRooms(data);
        console.log("Fetched" + data);
      }
      else toast.error(data.error || "Failed to load rooms");
    } catch {
      toast.error("Server not reachable");
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
        setRooms((prev: any) => [...prev, data]);
      } else toast.error(data.error || "Failed to create room");
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
    <>
      <div className="p-6 space-y-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Create a Room</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center gap-2">
            <Button disabled={loading} onClick={handleCreateRoom}>
              {loading ? "Creating..." : "Create Room"}
            </Button>
          </CardContent>
        </Card>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Set Display Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Display Name</Label>
            <Input
              placeholder="e.g. Jean Luc"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <p className="text-gray-500 text-sm">No rooms available.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <Card
                    key={room.id}
                    className="border shadow-sm hover:shadow-md transition"
                  >
                    <CardHeader>
                      <CardTitle>Room #{room.id}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <Button onClick={() => handleJoinRoom(room.id)}>
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
