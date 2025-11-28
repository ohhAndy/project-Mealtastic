export interface Room {
  id: string;
  owner_id: string;
  owner_name: string;
  recipe_id: string;
  recipe_name: string;
  created_at?: string;
}

export interface GetRoomsResponse {
  rooms: Room[];
  totalPages: number;
}

export type SignalMessage =
  | {
      type: "offer";
      from: string;
      username: string,
      to: string;
      data: RTCSessionDescriptionInit;
    }
  | {
      type: "answer";
      from: string;
      to: string;
      data: RTCSessionDescriptionInit;
    }
  | { type: "ice"; from: string; to: string; data: RTCIceCandidateInit }
  | { type: "peer-joined" | "peer-left" | "room-deleted"; from: string }
  | { type: "chat"; from: string; content: string; timestamp?: string };

export interface JoinRoomResponse {
  recipeName: string;
  ownerName: string;
  isOwner: boolean;
  newPeer: { id: string; username: string };
  otherPeers: { id: string; username: string }[];
}

export interface ChatMessage {
  from: string;
  content: string;
  timestamp?: string;
}

export async function getRoomsAPI(params: { page: number; limit: number; recipe_id?: string }): Promise<GetRoomsResponse> {
  try {
    const searchParams = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
    });
    
    if (params.recipe_id) {
      searchParams.append("recipe_id", params.recipe_id);
    }

    const res = await fetch(`/api/rooms?${searchParams.toString()}`, {
      credentials: "include",
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load rooms");
    
    return data;
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
}

export async function createRoomAPI(data: { recipe_id: number; recipe_name: string }): Promise<Room> {
  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to create room");
    
    return result;
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
}

export async function joinRoomAPI(roomId: string): Promise<JoinRoomResponse> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to join room: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error("Error joining room:", error);
    throw error;
  }
}

export async function getRoomMessagesAPI(roomId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/messages`, {
      credentials: "include",
    });
    
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

export async function pollRoomAPI(roomId: string, signal: AbortSignal): Promise<SignalMessage> {
  const res = await fetch(`/api/rooms/${roomId}/poll/`, {
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    // We throw specific object/error to handle 403/404 logic in component
    throw { status: res.status, message: "Poll failed" };
  }

  return res.json();
}

export async function sendSignalAPI(roomId: string, payload: SignalMessage): Promise<void> {
  try {
    await fetch(`/api/rooms/${roomId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (error) {
    console.error("Error sending signal:", error);
  }
}

export async function sendRoomMessageAPI(roomId: string, data: { from: string; content: string }): Promise<void> {
  try {
    await fetch(`/api/rooms/${roomId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

export async function leaveRoomAPI(roomId: string, peerId: string): Promise<void> {
  try {
    await fetch(`/api/rooms/${roomId}/leave/${peerId}`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error leaving room:", error);
  }
}

export async function deleteRoomAPI(roomId: string): Promise<void> {
  try {
    await fetch(`/api/rooms/${roomId}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error deleting room:", error);
  }
}