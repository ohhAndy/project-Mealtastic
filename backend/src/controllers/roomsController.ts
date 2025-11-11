import { Request, Response, NextFunction } from "express";
import pool from "../db";
import { DatabaseError, Result } from "pg";
import longpoll from "express-longpoll";

async function getPeers(roomId: string) {
  const result = await pool.query("SELECT * FROM peers WHERE room_id = $1", [roomId]);
  return result.rows;
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const longpollServer = (req as any).longpoll;
    let result = await pool.query("SELECT * FROM rooms WHERE owner_id = $1", [req.session.userId]);
    if (result.rows.length > 0) {
      return res.status(403).end("Already owner of another room. Delete previous room before opening another.");
    }
    result = await pool.query("INSERT INTO rooms (owner_id) VALUES ($1) RETURNING *", [req.session.userId]);
    const route = `/api/rooms/${result.rows[0].id}/poll`;
    longpollServer.create(route);
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
    const longpollServer = (req as any).longpoll;

    let result = await pool.query("SELECT * FROM rooms WHERE id=$1", [roomId]);
    if (result.rows.length < 1)
        return res.status(404).end("Room not found");

    const peers = await getPeers(roomId);
    if (peers.length >= 4)
      return res.status(403).end("Room is full (max 4 users)");

    const isOwner = result.rows[0].owner_id === req.session.userId;

    result = await pool.query("SELECT * FROM peers WHERE room_id = $1 AND user_id = $2", [roomId, req.session.userId])
    if (result.rows.length == 0) {
      const name = await pool.query("SELECT name FROM users WHERE id = $1", [req.session.userId])
      result = await pool.query("INSERT INTO peers (room_id, user_id, username) VALUES ($1, $2, $3) RETURNING *", [roomId, req.session.userId, name.rows[0].name]);
    }

    const route = `/api/rooms/${roomId}/poll`;
    longpollServer.publish(route, { type: "peer-joined", from: result.rows[0].id });

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

export async function signalRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const from = req.body.from;
    const to = req.body.to;
    const type = req.body.type;
    const data = req.body.data;
    const longpollServer = (req as any).longpoll;
    const route = `/api/rooms/${roomId}/poll`;

    const payload = { from, to: to || "all", type, data};
    longpollServer.publish(route, payload);
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

export async function leaveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const peerId = req.params.peerId;
    const longpollServer = (req as any).longpoll;

    await pool.query("DELETE FROM peers WHERE id = $1;", [peerId]);

    const route = `/api/rooms/${roomId}/poll`;
    longpollServer.publish(route, { type: "peer-left", from: peerId });

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
    const longpollServer = (req as any).longpoll;

    const { rows } = await pool.query(
      "SELECT owner_id FROM rooms WHERE id = $1",
      [roomId]
    );
    if (rows.length === 0)
      return res.status(404).end("Room not found");
    if (rows[0].owner_id !== req.session.userId)
      return res.status(403).end("Only the owner can delete this room");

    await pool.query("DELETE FROM rooms WHERE id = $1;", [roomId]);

    if (longpollServer) {
      longpollServer.publish(`/api/rooms/${roomId}/poll`, {
        type: "room-deleted",
        roomId,
      });
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

export async function cleanupInactivePeers(longpollServer: any, threshold: Number) {
  pool.query("DELETE FROM peers WHERE last_seen < NOW() - INTERVAL '$1 seconds' RETURNING id, room_id", [threshold])
  .then((result)=> {
      for (const row of result.rows) {
      const route = `/api/rooms/${row.room_id}/poll`;
      longpollServer.publish(route, { type: "peer=left", from: row.id });
    }
  })
  .catch((err) => {
    console.log(err);
  });
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId;
    const from = req.body.from;
    const content = req.body.content;
    const longpollServer = (req as any).longpoll;

    await pool.query("INSERT INTO messages (room_id, sender_id, content) VALUES ($1, $2, $3)", [roomId, from, content]);

    const route = `/api/rooms/${roomId}/poll`;
    longpollServer.publish(route, {
        type: "chat",
        from: from,
        content: content,
        timestamp: new Date().toISOString(),
    });

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