"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { deleteRoomAPI, getRoomMessagesAPI, joinRoomAPI, leaveRoomAPI, pollRoomAPI, sendRoomMessageAPI, sendSignalAPI } from "@/lib/api/room";

// Helper type for polling errors
interface PollError {
  status: number;
  message: string;
}

function isPollError(error: unknown): error is PollError {
  return (
    typeof error === 'object' && 
    error !== null && 
    'status' in error && 
    typeof (error as PollError).status === 'number'
  );
}

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

function ensurePeerId(id: string | null): string {
  if (!id) throw new Error("Peer ID not initialized yet");
  return id;
}

function logPeerState(peerId: string, pc: RTCPeerConnection) {
  pc.onconnectionstatechange = () => {
    console.log(`[${peerId}] connectionState →`, pc.connectionState);
  };

  pc.onsignalingstatechange = () => {
    console.log(`[${peerId}] signalingState →`, pc.signalingState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[${peerId}] iceConnectionState →`, pc.iceConnectionState);
  };

  pc.onicegatheringstatechange = () => {
    console.log(`[${peerId}] iceGatheringState →`, pc.iceGatheringState);
  };

  pc.onicecandidateerror = (e) => {
    console.warn(`[${peerId}] ICE candidate error:`, e);
  };
}

function VideoTile(props: {
  label: string;
  subLabel?: string;
  stream: MediaStream | null;
  muted?: boolean;
  id?: string;
}) {
  const { label, subLabel, stream, muted, id } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const { user, isLoading: authLoading } = useRequireAuth();
  if (authLoading || !user) return null;

  return (
    <div className="relative aspect-video w-full rounded-xl border border-gray-300 bg-black overflow-hidden shadow-sm">
      <video
        id={id}
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[11px] text-white flex justify-between items-center">
        <span className="truncate font-medium">{label}</span>
        {subLabel && (
          <span className="ml-2 truncate text-[10px] text-gray-200">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

const RemoteVideoGrid = memo(function RemoteVideoGrid(props: {
  remoteIds: string[];
  remoteStreams: React.RefObject<Map<string, MediaStream>>;
  remoteUsernames: React.RefObject<Map<string, string>>;
}) {
  const { remoteIds, remoteStreams, remoteUsernames } = props;

  return (
    <>
      {remoteIds.map((id) => (
        <VideoTile 
          key={id}
          label="Peer"
          subLabel={remoteUsernames.current.get(id) ?? ""}
          stream={remoteStreams.current.get(id) ?? null}
          muted
        />
      ))}
    </>
  );
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();

  const roomIdParam = params?.roomId;
  const roomIdStr = Array.isArray(roomIdParam) ? roomIdParam[0] : roomIdParam;

  const [peerId, setPeerId] = useState<string | null>(null);
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<
    { from: string; content: string; timestamp?: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const remoteUsernames = useRef<Map<string, string>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const pollingAbort = useRef<AbortController | null>(null);
  const recipeNameRef = useRef<string | null>(null);
  const ownerNameRef = useRef<string | null>(null);

  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef<string | null>(null);

  const joined = useRef(false);
  // Join the room
  useEffect(() => {
    if (joined.current || !roomIdStr) return; // Prevent duplicate run
    joined.current = true;
    (async () => {
      try {
        const data = await joinRoomAPI(roomIdStr);
        
        recipeNameRef.current = data.recipeName;
        ownerNameRef.current = data.ownerName;
        peerIdRef.current = data.newPeer.id;
        setPeerId(data.newPeer.id);
        setIsOwner(data.isOwner);
        
        await fetchMessages();
        await initMedia();
        
        await sendSignalAPI(roomIdStr, { type: "peer-joined", from: data.newPeer.id });

        for (const other of data.otherPeers) {
          if (other.id !== data.newPeer.id) {
            console.log("Creating peer connection to " + other.id);
            createPeerConnection(other.id, data.newPeer.username, other.username, true);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to join room";
        alert(msg);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdStr]);

  async function initMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      const video = document.getElementById("localVideo") as HTMLVideoElement;
      if (video) video.srcObject = stream;
    } catch (err) {
      console.warn("User denied camera/mic:", err);
      localStreamRef.current = null;
    }
  }

  async function fetchMessages() {
    if (!roomIdStr) return;
    try {
      const data = await getRoomMessagesAPI(roomIdStr);
      setChatHistory(data);
    } catch (e) { 
      console.error(e); 
    }
  }

  // Long-poll
  useEffect(() => {
    if (!peerId) return;
    let stopped = false;
    async function poll() {
      if (stopped || !roomIdStr) return;
      pollingAbort.current = new AbortController();
      try {
        const msg = await pollRoomAPI(roomIdStr, pollingAbort.current.signal);
        handleSignal(msg);
      } catch (error: unknown) {
        if (isPollError(error)) {
            if (error.status === 403 || error.status === 404) {
                alert("This room is no longer available.");
                cleanupAndLeave();
                router.push("/room");
                return;
            }
        }
        
        if (!stopped) await new Promise((r) => setTimeout(r, 1000));
      } finally {
        if (!stopped) poll();
      }
    }
    poll();
    return () => {
      stopped = true;
      pollingAbort.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, roomIdStr, router]);

  // Handle backend messages
  function handleSignal(msg: SignalMessage) {
    if (!msg || !msg.type) return;
    if (
      (msg.type === "offer" || msg.type === "answer" || msg.type === "ice") &&
      msg.to &&
      msg.to !== peerId
    )
      return;
    switch (msg.type) {
      case "offer":
        console.log(
          new Date().getMilliseconds() +
            ": Offer from " +
            msg.from +
            " to " +
            msg.to
        );
        handleOffer(msg);
        break;
      case "answer":
        console.log(
          new Date().getMilliseconds() +
            ": Answer from " +
            msg.from +
            " to " +
            msg.to
        );
        handleAnswer(msg);
        break;
      case "ice":
        console.log(
          new Date().getMilliseconds() +
            ": ICE from " +
            msg.from +
            " to " +
            msg.to
        );
        handleIce(msg);
        break;
      case "peer-joined":
        if (msg.from !== peerId) {
          console.log(
            new Date().getMilliseconds() + ": peer-joined from " + msg.from
          );
        }
        break;
      case "peer-left":
        console.log(
          new Date().getMilliseconds() + ": peer-left from " + msg.from
        );
        removePeer(msg.from);
        break;
      case "chat":
        setChatHistory((prev) => [...prev, msg]);
        break;
      case "room-deleted":
        alert("This room was deleted by the owner.");
        cleanupAndLeave();
        router.push("/room");
        break;
    }
  }

  async function createPeerConnection(remoteId: string, new_username: string, other_username: string, initiator: boolean) {
    if (!roomIdStr) return;
    if (peerConnections.current.has(remoteId)) return;
    const localStream = localStreamRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    logPeerState(remoteId, pc);
    peerConnections.current.set(remoteId, pc);

    if (!localStream) {
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    const remoteStream = new MediaStream();
    remoteStreams.current.set(remoteId, remoteStream);
    remoteUsernames.current.set(remoteId, other_username);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      setRemoteIds((prev) =>
        prev.includes(remoteId) ? prev : [...prev, remoteId]
      );

      const videoEl = document.getElementById(
        `remote-${remoteId}`
      ) as HTMLVideoElement | null;
      if (videoEl) videoEl.srcObject = remoteStream;
    };
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      sendSignalAPI(roomIdStr, {
        type: "ice",
        from: ensurePeerId(peerIdRef.current),
        to: remoteId,
        data: e.candidate,
      });
    };

    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      console.log(
        `[${ensurePeerId(peerIdRef.current)}] Added ${
          localStream.getTracks().length
        } tracks to connection -> ${remoteId}`
      );
    } else {
      console.log("No local media — data-only connection");
    }

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignalAPI(roomIdStr, {
        type: "offer",
        from: ensurePeerId(peerIdRef.current),
        username: new_username,
        to: remoteId,
        data: offer,
      });
    }
  }

  async function handleOffer(msg: Extract<SignalMessage, { type: "offer" }>) {
    if(!roomIdStr) return;
    let pc = peerConnections.current.get(msg.from);
    if (!pc) {
      const newPc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pc = newPc; // assign to outer var
      logPeerState(msg.from, newPc);
      peerConnections.current.set(msg.from, newPc);

      const remoteStream = new MediaStream();
      remoteStreams.current.set(msg.from, remoteStream);
      remoteUsernames.current.set(msg.from, msg.username);
      const localStream = localStreamRef.current;

      if (!localStream) {
        newPc.addTransceiver("video", { direction: "recvonly" });
        newPc.addTransceiver("audio", { direction: "recvonly" });
      }

      newPc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        setRemoteIds((prev) =>
          prev.includes(msg.from) ? prev : [...prev, msg.from]
        );

        const videoEl = document.getElementById(
          `remote-${msg.from}`
        ) as HTMLVideoElement | null;
        if (videoEl) videoEl.srcObject = remoteStream;
      };

      newPc.onicecandidate = (e) => {
        if (!e.candidate) return;
        sendSignalAPI(roomIdStr, {
          type: "ice",
          from: ensurePeerId(peerIdRef.current),
          to: msg.from,
          data: e.candidate,
        });
      };
      if (localStream) {
        localStream.getTracks().forEach((t) => newPc.addTrack(t, localStream));
      } else {
        console.log("No local media — data-only connection");
      }
    } else {
      console.log(`[${msg.from}] Reusing existing RTCPeerConnection`);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));

    const queued = pendingCandidates.current.get(msg.from);
    if (queued && queued.length) {
      console.log(
        `[${msg.from}] Flushing ${queued.length} queued ICE candidate(s) after setRemoteDescription (offer side)`
      );
      for (const c of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn(
            `[${msg.from}] Failed to add queued ICE candidate (offer side):`,
            err
          );
        }
      }
      pendingCandidates.current.delete(msg.from);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignalAPI(roomIdStr, {
      type: "answer",
      from: ensurePeerId(peerIdRef.current),
      to: msg.from,
      data: answer,
    });
  }

  async function handleAnswer(msg: Extract<SignalMessage, { type: "answer" }>) {
    const pc = peerConnections.current.get(msg.from);
    if (!pc) return;

    if (pc.signalingState !== "have-local-offer") {
      console.warn("Ignoring answer — unexpected state:", pc.signalingState);
      return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));

    const queued = pendingCandidates.current.get(msg.from);
    if (queued && queued.length) {
      console.log(
        `[${msg.from}] Flushing ${queued.length} queued ICE candidate(s) after setRemoteDescription (answer side)`
      );
      for (const c of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn(
            `[${msg.from}] Failed to add queued ICE candidate (answer side):`,
            err
          );
        }
      }
      pendingCandidates.current.delete(msg.from);
    }
  }

  async function handleIce(msg: Extract<SignalMessage, { type: "ice" }>) {
    const pc = peerConnections.current.get(msg.from);
    if (!pc) {
      if (!pendingCandidates.current.has(msg.from))
        pendingCandidates.current.set(msg.from, []);
      pendingCandidates.current.get(msg.from)!.push(msg.data);
      console.log(
        `[${
          msg.from
        }] Received ICE but no RTCPeerConnection exists yet — queued (count=${
          pendingCandidates.current.get(msg.from)!.length
        })`
      );
      return;
    }

    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      if (!pendingCandidates.current.has(msg.from))
        pendingCandidates.current.set(msg.from, []);
      pendingCandidates.current.get(msg.from)!.push(msg.data);
      console.log(
        `[${
          msg.from
        }] Queued ICE candidate until remoteDescription is set (count=${
          pendingCandidates.current.get(msg.from)!.length
        })`
      );
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(msg.data));
    } catch (err) {
      console.warn(`[${msg.from}] Failed to add ICE candidate:`, err);
    }
  }

  function removePeer(id: string) {
    peerConnections.current.get(id)?.close();
    peerConnections.current.delete(id);
    remoteStreams.current.delete(id);
    remoteUsernames.current.delete(id);
    pendingCandidates.current.delete(id);
    setRemoteIds((p) => p.filter((r) => r !== id));
  }

  async function sendChat() {
    if (!chatInput.trim() || !peerId || isSendingChat || !roomIdStr) return;
    setIsSendingChat(true);

    await new Promise((r) => setTimeout(r, 150));

    try {
      await sendRoomMessageAPI(roomIdStr, { from: peerId, content: chatInput });
    } catch (e) { 
      console.error(e); 
    }

    setChatInput("");
    setIsSendingChat(false);
  }

  function cleanupAndLeave() {
    pollingAbort.current?.abort();
    pollingAbort.current = null;
    peerConnections.current.forEach((pc) => {
      pc.getSenders().forEach((s) => {
        try { pc.removeTrack(s); } catch {}
      });
      pc.close();
    });
    peerConnections.current.clear();
    remoteStreams.current.clear();
    remoteUsernames.current.clear();
    pendingCandidates.current.clear();
    setRemoteIds([]);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    const video = document.getElementById("localVideo") as HTMLVideoElement | null;
    if (video) video.srcObject = null;
    localStreamRef.current = null;
    setRemoteIds([]);
  }

  async function handleLeaveRoom() {
    if (!peerId || !roomIdStr) return;
    await leaveRoomAPI(roomIdStr, peerId);
    cleanupAndLeave();
    router.push("/room");
  }

  async function handleDeleteRoom() {
    if (!roomIdStr || !confirm("Are you sure you want to delete this room?")) return;
    await deleteRoomAPI(roomIdStr);
    cleanupAndLeave();
    router.push("/room");
    router.push("/room");
  }

  useEffect(() => {
    const leave = () => {
      if (peerId) navigator.sendBeacon(`/api/rooms/${roomIdStr}/leave/${peerId}`);
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [peerId, roomIdStr]);

  return (
    <>
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] p-4 gap-4">
        <Card className="flex flex-col flex-1">
          <CardHeader className="flex justify-between items-center space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">
                Cooking {recipeNameRef.current ?? "Unknown Recipe"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Hosted by {ownerNameRef.current ?? "Unknown"} · {remoteIds.length + 1}/4 Peer Capacity
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave
              </Button>
              {isOwner && (
                <Button variant="destructive" onClick={handleDeleteRoom}>
                  Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VideoTile
              id="localVideo"
              label="You"
              subLabel={peerId ?? ""}
              stream={localStreamRef.current}
              muted
            /> 

            {/* Remote videos */}
            <RemoteVideoGrid
              remoteIds={remoteIds}
              remoteStreams={remoteStreams}
              remoteUsernames={remoteUsernames}
            />
          </CardContent>
        </Card>

        <Card className="w-full md:w-80 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 h-full">
            <div className="flex-1 overflow-y-auto border rounded p-2 mb-2 bg-gray-50 wrap-break-word">
              {chatHistory.map((msg, i) => {
                const isSelf = msg.from === peerId;
                return (
                  <div
                    key={i}
                    className={`my-1 flex ${
                      isSelf ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-2 py-1 text-sm shadow-sm ${
                        isSelf
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-medium opacity-80">
                          {isSelf ? "You" : remoteUsernames.current.get(msg.from) ?? "Anonymous"}
                        </span>
                        {msg.timestamp && (
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap wrap-break-word">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                disabled={isSendingChat}
              />
              <Button onClick={sendChat}>
                {isSendingChat ? "Sending..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
