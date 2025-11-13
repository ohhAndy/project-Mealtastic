import { Request, Response, NextFunction } from "express";
import pool from "../db";
import { DatabaseError, Result } from "pg";
import longpoll from "express-longpoll";

type SignalMessage =
  | {
      type: "offer";
      from: string;
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

// ---------- In-memory per-peer signal queues ----------
// key = `${roomId}:${peerId}` → array of SignalMessage
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
  const result = await pool.query("SELECT * FROM peers WHERE room_id = $1", [roomId]);
  return result.rows;
}

async function getPeerIdForUser(roomId: string, userId: string) {
  const { rows } = await pool.query(
    "SELECT id FROM peers WHERE room_id = $1 AND user_id = $2",
    [roomId, userId]
  );
  return rows[0]?.id as string | undefined;
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    let result = await pool.query("SELECT * FROM rooms WHERE owner_id = $1;", [req.session.userId]);
    if (result.rows.length > 0) {
      return res.status(403).end("Already owner of another room. Delete previous room before opening another.;");
    }
    result = await pool.query("INSERT INTO rooms (owner_id) VALUES ($1) RETURNING *;", [req.session.userId]);
    return res.json(result.rows[0]);
  }
  catch(err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function getRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query("SELECT * FROM rooms;");
    return res.json(result.rows);
  }
  catch(err) {
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

    let result = await pool.query("SELECT * FROM rooms WHERE id=$1;", [roomId]);
    if (result.rows.length < 1)
        return res.status(404).end("Room not found");

    const peers = await getPeers(roomId);
    if (peers.length >= 4)
      return res.status(403).end("Room is full (max 4 users)");

    const isOwner = result.rows[0].owner_id === req.session.userId;

    result = await pool.query("SELECT * FROM peers WHERE room_id = $1 AND user_id = $2;", [roomId, req.session.userId])
    if (result.rows.length == 0) {
      const name = await pool.query("SELECT name FROM users WHERE id = $1;", [req.session.userId])
      result = await pool.query("INSERT INTO peers (room_id, user_id, username) VALUES ($1, $2, $3) RETURNING *;", [roomId, req.session.userId, name.rows[0].name]);
    }

    return res.json({ newPeer: result.rows[0], otherPeers: peers, isOwner: isOwner });
  }
  catch(err) {
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
      if(!peerId) return false;
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
    const { from, to, type, data } = req.body as {
      from: string;
      to?: string;
      type: SignalMessage["type"];
      data?: any;
    };

    if (type === "offer" || type === "answer" || type === "ice") {
      if (!to) return res.status(400).end("Missing 'to' for signaling message");

      const payload: SignalMessage = { type, from, to, data } as any;
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
  catch(err) {
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

    await pool.query("DELETE FROM peers WHERE id = $1;", [peerId]);

    // Notify remaining peers
    const peers = await getPeers(roomId);
    const payload: SignalMessage = { type: "peer-left", from: peerId } as any;

    for (const p of peers) {
      enqueueSignal(roomId, p.id, payload);
    }

    return res.json({ left: true });
  }
  catch(err) {
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

    const { rows } = await pool.query(
      "SELECT owner_id FROM rooms WHERE id = $1",
      [roomId]
    );
    if (rows.length === 0)
      return res.status(404).end("Room not found");
    if (rows[0].owner_id !== req.session.userId)
      return res.status(403).end("Only the owner can delete this room");

    await pool.query("DELETE FROM rooms WHERE id = $1;", [roomId]);

    const peers = await getPeers(roomId);

    const payload: SignalMessage = { type: "room-deleted", from: "" } as any;

    for (const p of peers) {
      enqueueSignal(roomId, p.id, payload);
    }

    return res.json({ deleted: true });
  }
  catch(err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}

export async function cleanupInactivePeers(threshold: Number) {
  try {
    const result = await pool.query(
      `
      DELETE FROM peers
      WHERE last_seen < NOW() - ($1 || ' seconds')::interval
      RETURNING id, room_id
      `,
      [threshold.toString()]
    );

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

    await pool.query("INSERT INTO messages (room_id, sender_id, content) VALUES ($1, $2, $3)", [roomId, from, content]);

    const peers = await getPeers(roomId);
    const payload: SignalMessage = {
      type: "chat",
      from,
      content,
      timestamp: new Date().toISOString(),
    };

    for (const p of peers) {
      if (p.id === from) continue; // client already appends its own message
      enqueueSignal(roomId, p.id, payload);
    }

    return res.status(200).end();
  }
  catch(err) {
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
    const result = await pool.query("SELECT sender_id AS from, content, created_at FROM messages WHERE room_id = $1 ORDER BY created_at ASC", [roomId]);

    res.json(result.rows);
  }
  catch(err) {
    if (err instanceof Error) {
      console.log(err);
      return res.status(500).end(err.message);
    }
    return res.status(500).end(err);
  }
}