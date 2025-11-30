import { Request, Response, NextFunction } from "express";
import pool from "../db";
import * as roomsQuery from "../queries/roomsQueries";

// initial code based on chatgpt response: https://chatgpt.com/s/t_692933dbf154819186bc6db0991dea47, https://chatgpt.com/s/t_692934234d108191942f4b8830dc7094 and https://chatgpt.com/s/t_6929362a73788191b78e959b75e7f41f
// prompt: 'give me an example of entire rooms backend using express-longpoll',
// 'but you didn't use the express-long-poll',
// 'separate it into routes, controllers and app files' a lot of hallucination in these prompts so had to make a lot of compromises
// later on with the room chats: https://chatgpt.com/s/t_69293765d4388191a8e5ddaba7d30a34


//later refactored to not use express-long-poll, since express long poll wasnt properly polling.

type SignalMessage =
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

const signalQueues = new Map<string, SignalMessage[]>();

function queueKey(roomId: string, peerId: string) {
  return `${roomId}:${peerId}`;
}

function enqueueSignal(roomId: string, toPeerId: string, payload: SignalMessage) {
  const key = queueKey(roomId, toPeerId);
  const list = signalQueues.get(key) ?? [];
  list.push(payload);
  signalQueues.set(key, list);
}

function dequeueSignal(roomId: string, peerId: string): SignalMessage | undefined {
  const key = queueKey(roomId, peerId);
  const list = signalQueues.get(key);
  if (!list || list.length === 0) return undefined;
  const msg = list.shift();
  if (!list.length) signalQueues.delete(key);
  else signalQueues.set(key, list);
  return msg;
}

async function getPeers(roomId: string) {
  const result = await pool.query(roomsQuery.getRoomPeers, [roomId]);
  return result.rows;
}

async function getPeerIdForUser(roomId: string, userId: string) {
  const { rows } = await pool.query(roomsQuery.getUserPeer, [roomId, userId]);
  return rows[0]?.id as string | undefined;
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const recipe_id = req.body.recipe_id;
    const recipe_name = req.body.recipe_name;

    const userRoomsResult = await pool.query(roomsQuery.getUserRooms, [req.session.userId]);
    if (userRoomsResult.rows.length > 0)
      return res.status(403).end("Already owner of another room. Delete previous room before opening another.;");

    const userNameResult = await pool.query(roomsQuery.getUserName, [req.session.userId]);
    const owner_name = userNameResult.rows[0].name;
    const insertRoomResult = await pool.query(roomsQuery.insertRoom, [req.session.userId, owner_name, recipe_id, recipe_name]);
    return res.json(insertRoomResult.rows[0]);
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function getRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    const recipe_id = req.query.recipe_id ? req.query.recipe_query as string : "";
    let query_string = roomsQuery.getRooms;
    let params: any[] = [limit, page * limit]

    if (recipe_id) {
      query_string = roomsQuery.getRoomsByRecipe;
      params = [recipe_id, limit, page * limit]
    }

    const roomsResult = await pool.query(query_string, params);
    const countResult = await pool.query(roomsQuery.countRooms,);
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return res.json({ rooms: roomsResult.rows, totalItems: totalItems, totalPages: totalPages });
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;

    const roomResult = await pool.query(roomsQuery.getRoom, [roomId]);
    if (roomResult.rows.length < 1) return res.status(404).end("Room not found");

    // verify users presence as a peer in room
    let resultUserPeer = await pool.query(roomsQuery.getUserPeer, [roomId, req.session.userId]);
    const peers = await getPeers(roomId);
    if (peers.length >= 4 && resultUserPeer.rows.length == 0)
      return res.status(403).end("Room is full (max 4 users)");

    const isOwner = roomResult.rows[0].owner_id === req.session.userId;
    const recipeName = roomResult.rows[0].recipe_name;
    const ownerName = roomResult.rows[0].owner_name;

    if (resultUserPeer.rows.length == 0) {
      const name = await pool.query(roomsQuery.getUserName, [req.session.userId])
      resultUserPeer = await pool.query(roomsQuery.insertPeer, [roomId, req.session.userId, name.rows[0].name]);
    }

    return res.json({
      newPeer: resultUserPeer.rows[0],
      otherPeers: peers,
      isOwner: isOwner,
      recipeName: recipeName,
      ownerName: ownerName
    });
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

// Long-poll for this specific peer
export async function pollRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const userId = req.session.userId as string | undefined;

    if (!userId) return res.status(401).end("Not logged in");

    const peerId = await getPeerIdForUser(roomId, userId);
    if (!peerId) return res.status(403).end("Not in this room");

    const timeoutMs = 25000;
    const pollIntervalMs = 1000;
    const start = Date.now();

    function tryOnce(): boolean {
      if (!peerId) return false;
      const msg = dequeueSignal(roomId, peerId);
      if (msg) {
        res.json(msg);
        return true;
      }
      return false;
    }

    // Immediate check
    if (tryOnce()) return;

    // Long-poll loop
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        // No message: tell client to repoll
        res.json({ type: "noop" });
        return;
      }
      if (tryOnce()) {
        clearInterval(interval);
      }
    }, pollIntervalMs);
  } catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(String(err));
  }
}

export async function signalRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const { from, username, to, type, data } = req.body as {
      from: string;
      to?: string;
      username?: string;
      type: SignalMessage["type"];
      data?: any;
    };

    if (type === "answer" || type === "ice") {
      if (!to) return res.status(400).end("Missing 'to' for signaling message");

      const payload: SignalMessage = { type, from, to, data } as any;
      enqueueSignal(roomId, to, payload);
      return res.status(200).end();
    }

    if (type === "offer") {
      if (!to) return res.status(400).end("Missing 'to' for signaling message");
      if (!username) return res.status(400).end("Missing 'username' for signaling message");

      const payload: SignalMessage = { type, from, username, to, data } as any;
      enqueueSignal(roomId, to, payload);
      return res.status(200).end();
    }

    if (type === "peer-joined" || type === "peer-left" || type === "room-deleted") {
      const peers = await getPeers(roomId);
      const payload: SignalMessage = { type, from } as any;

      for (const p of peers) {
        if (p.id === from) continue; // skip origin
        enqueueSignal(roomId, p.id, payload);
      }
      return res.status(200).end();
    }

    return res.status(400).end("Unknown signal type");
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function leaveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const peerId = req.params.peerId;

    await pool.query(roomsQuery.deletePeer, [peerId]);

    // Notify remaining peers
    const peers = await getPeers(roomId);
    const payload: SignalMessage = { type: "peer-left", from: peerId } as any;

    for (const p of peers) {
      enqueueSignal(roomId, p.id, payload);
    }

    return res.json({ left: true });
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;

    const { rows } = await pool.query(roomsQuery.getRoom, [roomId]);
    if (rows.length === 0) return res.status(404).end("Room not found");
    if (rows[0].owner_id !== req.session.userId)
      return res.status(403).end("Only the owner can delete this room");

    const peers = await getPeers(roomId);

    await pool.query(roomsQuery.deleteRoom, [roomId]);

    const payload: SignalMessage = { type: "room-deleted", from: "" } as any;

    for (const p of peers) {
      enqueueSignal(roomId, p.id, payload);
    }

    return res.json({ deleted: true });
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function cleanupInactivePeers(threshold: Number) {
  try {
    const result = await pool.query(roomsQuery.deleteInactivePeers, [threshold.toString()]);

    for (const row of result.rows) {
      const roomId = row.room_id as string;
      const peerId = row.id as string;

      const peers = await getPeers(roomId);
      const payload: SignalMessage = { type: "peer-left", from: peerId } as any;
      for (const p of peers) {
        enqueueSignal(roomId, p.id, payload);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const from = req.body.from as string;
    const content = req.body.content as string;

    await pool.query(roomsQuery.insertMessages, [roomId, from, content]);

    const peers = await getPeers(roomId);
    const payload: SignalMessage = {
      type: "chat",
      from,
      content,
      timestamp: new Date().toISOString(),
    };

    for (const p of peers) {
      enqueueSignal(roomId, p.id, payload);
    }

    return res.status(200).end();
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const result = await pool.query(roomsQuery.getMessages, [roomId]);

    res.json(result.rows);
  }
  catch (err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}