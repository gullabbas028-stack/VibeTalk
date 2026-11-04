import { useEffect, useMemo, useRef, useState } from "react";
import {
  CallControls,
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/userAuthUser.js";
import toast from "react-hot-toast";
import { fetchMyFriends } from "../lib/api.js";
import { useVideoCallClient } from "../components/VideoCallContext.js";

const EMPTY_FRIENDS = [];
const isCurrentCallLifecycle = (lifecycleRef, lifecycle) =>
  lifecycleRef.current === lifecycle;

const CallStatus = ({ mode, friendName, ringOutcome }) => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const status = ringOutcome
    ? ringOutcome === "missed"
      ? "Call missed"
      : "Call rejected"
    : callingState === CallingState.JOINED
      ? "Connected"
      : callingState === CallingState.RECONNECTING
        ? "Reconnecting..."
        : callingState === CallingState.RINGING
          ? `Calling ${friendName}...`
          : callingState === CallingState.JOINING
            ? "Joining call..."
            : `${mode === "audio" ? "Audio" : "Video"} call`;

  return (
    <div className="video-call-status">
      <span
        className={`video-call-status-indicator${ringOutcome ? " is-outcome" : ""}`}
      />
      <span>{status}</span>
    </div>
  );
};

const CallRoom = ({ call, friend, friendId, mode, ringOutcome }) => {
  const navigate = useNavigate();
  const backToChat = () =>
    navigate(friendId ? `/chat?friend=${encodeURIComponent(friendId)}` : "/");
  const lifecycleRef = useRef(0);

  useEffect(() => {
    const lifecycle = ++lifecycleRef.current;
    return () => {
      queueMicrotask(() => {
        if (isCurrentCallLifecycle(lifecycleRef, lifecycle)) {
          call.leave().catch((error) => {
            console.error("Could not leave call:", error);
          });
        }
      });
    };
  }, [call]);

  const leaveCall = async () => {
    try {
      await call.leave();
      backToChat();
    } catch (error) {
      console.error("Could not leave call:", error);
      toast.error("Could not leave the call cleanly.");
    }
  };

  return (
    <StreamTheme className="vibetalk-video-theme">
      <StreamCall call={call}>
        <main className="video-call-page">
          <header className="video-call-header">
            <Link className="chat-brand" to="/">
              <img src="/logo.png" alt="" />
              <span>VibeTalk</span>
            </Link>
            <CallStatus
              mode={mode}
              friendName={friend?.fullName || "your connection"}
              ringOutcome={ringOutcome}
            />
            <button className="video-call-back" type="button" onClick={leaveCall}>
              Leave call
            </button>
          </header>
          <section className="video-call-stage" aria-label="Call participants">
            <SpeakerLayout />
          </section>
          <footer className="video-call-controls">
            <p>
              {friend?.fullName || "Your connection"} ·{" "}
              {mode === "audio" ? "Audio call" : "Video call"}
            </p>
            <CallControls
              onLeave={(error) => {
                if (error) {
                  toast.error("Call could not be disconnected cleanly.");
                }
                backToChat();
              }}
            />
          </footer>
        </main>
      </StreamCall>
    </StreamTheme>
  );
};

const CallPage = () => {
  const { authenticatedUser } = useAuthUser();
  const { client, connectionError } = useVideoCallClient() || {};
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const friendIdFromUrl = searchParams.get("friend") || "";
  const incomingCallId = searchParams.get("callId") || "";
  const mode = searchParams.get("mode") === "audio" ? "audio" : "video";
  const userId = authenticatedUser?._id?.toString();
  const [activeCall, setActiveCall] = useState(null);
  const [callError, setCallError] = useState("");
  const [ringOutcome, setRingOutcome] = useState("");
  const [retry, setRetry] = useState(0);
  const operationKeyRef = useRef("");
  const generatedCallIdRef = useRef("");
  const {
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
  } = useQuery({ queryKey: ["friends"], queryFn: fetchMyFriends });
  const friends = friendsData?.friends ?? EMPTY_FRIENDS;
  const selectedFriend = friends.find(
    (friend) => friend._id?.toString() === friendIdFromUrl,
  );
  const hasSelectedFriend = Boolean(selectedFriend);
  const incomingMember = activeCall?.state.members.find(
    (member) => member.user_id !== userId,
  );
  const selectedCallFriend =
    selectedFriend ||
    friends.find((friend) => friend._id?.toString() === incomingMember?.user_id);
  const eligibleFriends = useMemo(
    () => friends.filter((friend) => friend._id?.toString() !== userId),
    [friends, userId],
  );

  useEffect(() => {
    if (!client || !userId) return undefined;
    if (incomingCallId ? !friendIdFromUrl : !hasSelectedFriend) {
      return undefined;
    }

    const operationKey = `${incomingCallId || friendIdFromUrl}:${mode}:${retry}`;
    if (operationKeyRef.current === operationKey) return undefined;
    operationKeyRef.current = operationKey;
    let disposed = false;
    if (!incomingCallId && !generatedCallIdRef.current) {
      generatedCallIdRef.current =
        globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    }
    const callId = incomingCallId || generatedCallIdRef.current;
    const call = client.call("default", callId);
    setActiveCall(call);
    setCallError("");
    setRingOutcome("");

    let outcomeReported = false;
    const reportOutcome = (outcome) => {
      if (disposed || outcomeReported) return;
      outcomeReported = true;
      setRingOutcome(outcome);
      if (outcome === "missed") {
        toast("Your call was missed.");
      } else {
        toast.error("The person you called rejected your call.");
      }
    };
    const unsubscribeRejected = incomingCallId
      ? null
      : call.on("call.rejected", (event) => {
          if (event.user?.id && event.user.id !== friendIdFromUrl) return;
          if (event.reason === "timeout") {
            reportOutcome("missed");
          } else if (event.reason !== "cancel") {
            reportOutcome("rejected");
          }
        });
    const unsubscribeMissed = incomingCallId
          ? null
      : call.on("call.missed", (event) => {
          if (
            event.members?.length &&
            !event.members.some(
              (member) => member.user_id === friendIdFromUrl,
            )
          ) {
            return;
          }
          reportOutcome("missed");
        });

    const connectCall = async () => {
      try {
        if (incomingCallId) {
          if (mode === "audio") await call.camera.disable();
          await call.join();
          return;
        }

        if (mode === "audio") await call.camera.disable();
        await call.getOrCreate({
          ring: true,
          video: mode === "video",
          data: {
            members: [
              { user_id: userId },
              { user_id: friendIdFromUrl },
            ],
            custom: { mode },
          },
        });
      } catch (error) {
        if (disposed) return;
        console.error("Could not start or join the call:", error);
        setCallError(
          "The call could not connect. Check your camera and microphone permissions, then try again.",
        );
      }
    };

    connectCall();
    return () => {
      disposed = true;
      unsubscribeRejected?.();
      unsubscribeMissed?.();
    };
  }, [
    client,
    friendIdFromUrl,
    incomingCallId,
    mode,
    retry,
    hasSelectedFriend,
    userId,
  ]);

  const startCall = (friendId, callMode) => {
    navigate(
      `/call?friend=${encodeURIComponent(friendId)}&mode=${callMode}`,
    );
  };

  if (!client) {
    return (
      <main className="video-call-page video-call-state-page">
        <section className="video-call-state-card" role={connectionError ? "alert" : undefined}>
          <span className="video-call-state-icon" aria-hidden="true">◉</span>
          <h1>{connectionError ? "Calling is unavailable" : "Connecting to calls..."}</h1>
          <p>{connectionError || "Setting up secure audio and video."}</p>
          <Link className="video-call-secondary-button" to="/chat">
            Back to messages
          </Link>
        </section>
      </main>
    );
  }

  if (friendsLoading && !incomingCallId) {
    return (
      <main className="video-call-page video-call-state-page">
        <section className="video-call-state-card">
          <span className="loading loading-spinner loading-md" />
          <p>Loading your connections...</p>
        </section>
      </main>
    );
  }

  if (friendsError) {
    return (
      <main className="video-call-page video-call-state-page">
        <section className="video-call-state-card" role="alert">
          <h1>Could not load connections</h1>
          <p>Please return to messages and try again.</p>
          <Link className="video-call-secondary-button" to="/chat">
            Back to messages
          </Link>
        </section>
      </main>
    );
  }

  if (!incomingCallId && !friendIdFromUrl) {
    return (
      <main className="video-call-page video-call-picker-page">
        <header className="video-call-header">
          <Link className="chat-brand" to="/">
            <img src="/logo.png" alt="" />
            <span>VibeTalk</span>
          </Link>
          <Link className="chat-dashboard-link" to="/chat">
            Back to messages
          </Link>
        </header>
        <section className="video-call-picker">
          <p className="dashboard-eyebrow">LEARN TOGETHER</p>
          <h1>Start a call</h1>
          <p>Choose a connection and call them with audio or video.</p>
          {eligibleFriends.length === 0 ? (
            <div className="video-call-state-card">
              <h2>No connections yet</h2>
              <p>Connect with another learner before starting a call.</p>
              <Link className="video-call-primary-button" to="/connections">
                Find connections
              </Link>
            </div>
          ) : (
            <div className="video-call-friend-list">
              {eligibleFriends.map((friend) => (
                <article className="video-call-friend" key={friend._id}>
                  <img
                    src={
                      friend.image ||
                      `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(friend.fullName || "VibeTalk")}`
                    }
                    alt=""
                  />
                  <div>
                    <strong>{friend.fullName}</strong>
                    <span>{friend.language || friend.skill || "Learning partner"}</span>
                  </div>
                  <div className="video-call-friend-actions">
                    <button
                      type="button"
                      aria-label={`Start audio call with ${friend.fullName}`}
                      onClick={() => startCall(friend._id, "audio")}
                    >
                      Audio
                    </button>
                    <button
                      type="button"
                      aria-label={`Start video call with ${friend.fullName}`}
                      onClick={() => startCall(friend._id, "video")}
                    >
                      Video
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!incomingCallId && !selectedFriend) {
    return (
      <main className="video-call-page video-call-state-page">
        <section className="video-call-state-card">
          <h1>Connection not found</h1>
          <p>You can only call people in your connections.</p>
          <Link className="video-call-secondary-button" to="/connections">
            View connections
          </Link>
        </section>
      </main>
    );
  }

  if (!activeCall || callError) {
    return (
      <main className="video-call-page video-call-state-page">
        <section className="video-call-state-card" role={callError ? "alert" : undefined}>
          <span className="video-call-state-icon" aria-hidden="true">
            {mode === "audio" ? "☎" : "◉"}
          </span>
          <h1>{callError ? "Call failed" : `Starting ${mode} call...`}</h1>
          <p>
            {callError ||
              (incomingCallId
                ? "Joining the call..."
                : `Calling ${selectedFriend?.fullName || "your connection"}...`)}
          </p>
          {callError ? (
            <button
              className="video-call-primary-button"
              type="button"
              onClick={() => {
                operationKeyRef.current = "";
                generatedCallIdRef.current =
                  globalThis.crypto?.randomUUID?.() ||
                  `${Date.now()}-${Math.random()}`;
                setRetry((attempt) => attempt + 1);
              }}
            >
              Try again
            </button>
          ) : (
            <Link className="video-call-secondary-button" to="/chat">
              Cancel
            </Link>
          )}
        </section>
      </main>
    );
  }

  return (
    <CallRoom
      call={activeCall}
      friend={selectedCallFriend}
      friendId={friendIdFromUrl || incomingMember?.user_id || ""}
      mode={mode}
      ringOutcome={ringOutcome}
    />
  );
};

export default CallPage;
