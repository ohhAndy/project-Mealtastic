import { Router } from "express";
import * as roomCtrl from "../controllers/roomsController";
import { isAuthenticated } from "../middlewares/auth";

const router = Router();

router.post("/", isAuthenticated, roomCtrl.createRoom);
router.get("/", isAuthenticated, roomCtrl.getRooms);
router.post("/:roomId/join", isAuthenticated, roomCtrl.joinRoom);
router.get("/api/rooms/:roomId/poll", roomCtrl.pollRoom); 
router.post("/:roomId/signal", isAuthenticated, roomCtrl.signalRoom);
router.post("/:roomId/leave/:peerId", isAuthenticated, roomCtrl.leaveRoom);
router.delete("/:roomId", isAuthenticated, roomCtrl.deleteRoom);
router.post("/:roomId/message", isAuthenticated, roomCtrl.sendMessage);
router.get("/:roomId/messages", isAuthenticated, roomCtrl.getMessages);

export default router;