import { Router } from "express";
import * as roomCtrl from "../controllers/roomsController";
import { isAuthenticated } from "../middlewares/auth";
import { checkFrom, checkPeerId, checkRoomId, checkTo, checkType, sanitizeContent } from "../middlewares/validate";

const router = Router();

router.post("/", isAuthenticated, roomCtrl.createRoom);
router.get("/", isAuthenticated, roomCtrl.getRooms);
router.post("/:roomId/join", isAuthenticated, checkRoomId, roomCtrl.joinRoom);
router.get("/:roomId/poll", isAuthenticated, checkRoomId, roomCtrl.pollRoom); 
router.post("/:roomId/signal", isAuthenticated, checkRoomId, checkFrom, checkTo, checkType, roomCtrl.signalRoom);
router.post("/:roomId/leave/:peerId", isAuthenticated, checkRoomId, checkPeerId, roomCtrl.leaveRoom);
router.delete("/:roomId", isAuthenticated, checkRoomId,roomCtrl.deleteRoom);
router.post("/:roomId/message", isAuthenticated, checkRoomId, checkFrom, sanitizeContent, roomCtrl.sendMessage);
router.get("/:roomId/messages", isAuthenticated, checkRoomId, roomCtrl.getMessages);

export default router;