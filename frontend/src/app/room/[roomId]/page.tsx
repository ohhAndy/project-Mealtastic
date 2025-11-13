"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
}) {
  const { remoteIds, remoteStreams } = props;

  return (
    <>
      {remoteIds.map((id) => (
        <VideoTile 
          key={id}
          label="Peer"
          subLabel={id}
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
  const { roomId } = params;
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<
    { from: string; content: string; timestamp?: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const pollingAbort = useRef<AbortController | null>(null);

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
    if (joined.current) return; // Prevent duplicate run
    joined.current = true;
    (async () => {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        peerIdRef.current = data.newPeer.id;
        setPeerId(data.newPeer.id);
        setIsOwner(data.isOwner);
        await fetchMessages();
        await initMedia();
        sendSignal({ type: "peer-joined", from: data.newPeer.id });

        for (const other of data.otherPeers) {
          if (other.id !== data.newPeer.id) {
            console.log(
              new Date().getMilliseconds() +
                ": Create peer connection from " +
                data.newPeer.id +
                " to " +
                other.id
            );
            createPeerConnection(other.id, true);
          }
        }
      } else {
        alert(await res.text());
      }
    })();
  }, [roomId]);

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
    const res = await fetch(`/api/rooms/${roomId}/messages`, {
      credentials: "include",
    });
    const data = await res.json();
    setChatHistory(data);
  }

  // Long-poll
  useEffect(() => {
    if (!peerId) return;
    let stopped = false;
    async function poll() {
      if (stopped) return;
      pollingAbort.current = new AbortController();
      try {
        const res = await fetch(`/api/rooms/${roomId}/poll/`, {
          signal: pollingAbort.current.signal,
          credentials: "include",
        });

        if (!res.ok) {
          // If room/peer is gone, treat as deleted and bail
          console.warn("poll error status", res.status);
          if (res.status === 403 || res.status === 404) {
            alert("This room is no longer available.");
            cleanupAndLeave();
            router.push("/room");
            return;
          }
        }

        const msg = await res.json();
        handleSignal(msg);
      } catch {
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
  }, [peerId, roomId, router]);

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

  async function createPeerConnection(remoteId: string, initiator: boolean) {
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
      sendSignal({
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
      sendSignal({
        type: "offer",
        from: ensurePeerId(peerIdRef.current),
        to: remoteId,
        data: offer,
      });
    }
  }

  async function handleOffer(msg: Extract<SignalMessage, { type: "offer" }>) {
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
        sendSignal({
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
    sendSignal({
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
    pendingCandidates.current.delete(id);
    setRemoteIds((p) => p.filter((r) => r !== id));
  }

  async function sendSignal(payload: SignalMessage) {
    await fetch(`/api/rooms/${roomId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  }

  async function sendChat() {
    if (!chatInput.trim() || !peerId || isSendingChat) return;
    setIsSendingChat(true);

    await new Promise((r) => setTimeout(r, 150));

    await fetch(`/api/rooms/${roomId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: peerId, content: chatInput }),
      credentials: "include",
    });

    setChatInput("");
    setIsSendingChat(false);
  }

  function cleanupAndLeave() {
    pollingAbort.current?.abort();
    pollingAbort.current = null;
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    remoteStreams.current.clear();
    pendingCandidates.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setRemoteIds([]);
  }

  async function handleLeaveRoom() {
    if (!peerId) return;
    await fetch(`/api/rooms/${roomId}/leave/${peerId}`, {
      method: "POST",
      credentials: "include",
    });
    cleanupAndLeave();
    router.push("/room");
  }

  async function handleDeleteRoom() {
    if (!confirm("Are you sure you want to delete this room?")) return;
    await fetch(`/api/rooms/${roomId}`, {
      method: "DELETE",
      credentials: "include",
    });
    cleanupAndLeave();
    router.push("/room");
  }

  useEffect(() => {
    const leave = () => {
      if (peerId) navigator.sendBeacon(`/api/rooms/${roomId}/leave/${peerId}`);
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [peerId, roomId]);

  return (
    <>
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] p-4 gap-4">
        <Card className="flex flex-col flex-1">
          <CardHeader className="flex justify-between items-center space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">
                Room: {roomId}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Max 4 participants · You + {remoteIds.length} others
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
                          {isSelf ? "You" : msg.from}
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
