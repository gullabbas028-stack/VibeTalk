import { useEffect, useState } from "react";
import {
  CallingState,
  StreamVideo,
  useCalls,
} from "@stream-io/video-react-sdk";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "@stream-io/video-react-sdk/dist/css/styles.css";

const IncomingCallNotice = ({ client }) => {
  const calls = useCalls();
  const navigate = useNavigate();
  const [busyCallId, setBusyCallId] = useState("");
  const [ringingEvent, setRingingEvent] = useState(null);
  const activeIncomingCall = calls.find(
    (call) =>
      call.isCreatedByMe === false &&
      call.state.callingState === CallingState.RINGING,
  );

  useEffect(() => {
    const unsubscribeRing = client.on("call.ring", (event) => {
      setRingingEvent({
        callCid: event.call_cid,
        callId: event.call.id,
        callType: event.call.type,
        callerId: event.call.created_by?.id || "",
        callerName: event.call.created_by?.name || "Your connection",
        mode: event.call.custom?.mode === "audio" ? "audio" : "video",
      });
    });
    const clearRingingEvent = (event) => {
      setRingingEvent((current) =>
        current?.callCid === event.call_cid ? null : current,
      );
    };
    const unsubscribeAccepted = client.on("call.accepted", clearRingingEvent);
    const unsubscribeRejected = client.on("call.rejected", clearRingingEvent);
    const unsubscribeMissed = client.on("call.missed", clearRingingEvent);
    const unsubscribeEnded = client.on("call.ended", clearRingingEvent);

    return () => {
      unsubscribeRing();
      unsubscribeAccepted();
      unsubscribeRejected();
      unsubscribeMissed();
      unsubscribeEnded();
    };
  }, [client]);

  const incomingCall = activeIncomingCall || ringingEvent;
  if (!incomingCall) return null;

  const callerId =
    activeIncomingCall?.state.createdBy?.id ||
    activeIncomingCall?.state.members.find(
      (member) => member.user_id !== activeIncomingCall.currentUserId,
    )?.user_id ||
    ringingEvent?.callerId ||
    "";
  const callerName =
    activeIncomingCall?.state.createdBy?.name ||
    activeIncomingCall?.state.members.find(
      (member) => member.user_id === callerId,
    )?.user?.name ||
    ringingEvent?.callerName ||
    "Your connection";
  const mode =
    (activeIncomingCall?.state.custom?.mode || ringingEvent?.mode) === "audio"
      ? "audio"
      : "video";
  const callId = activeIncomingCall?.id || ringingEvent?.callId;

  const acceptCall = () => {
    navigate(
      `/call?callId=${encodeURIComponent(callId)}&friend=${encodeURIComponent(callerId)}&mode=${mode}`,
    );
  };

  const declineCall = async () => {
    setBusyCallId(callId);
    try {
      const call =
        activeIncomingCall ||
        (await client.onRingingCall(ringingEvent.callCid));
      await call.leave({ reject: true, reason: "decline" });
      setRingingEvent(null);
    } catch (error) {
      console.error("Could not decline incoming call:", error);
      toast.error("Could not decline the call. Please try again.");
    } finally {
      setBusyCallId("");
    }
  };

  return (
    <aside className="incoming-call-notice" aria-live="polite">
      <div className="incoming-call-copy">
        <span className="incoming-call-indicator" aria-hidden="true">
          {mode === "audio" ? "☎" : "◉"}
        </span>
        <div>
          <strong>{callerName}</strong>
          <span>Incoming {mode} call</span>
        </div>
      </div>
      <div className="incoming-call-actions">
        <button
          className="incoming-call-accept"
          type="button"
          onClick={acceptCall}
        >
          Answer
        </button>
        <button
          className="incoming-call-decline"
          type="button"
          disabled={busyCallId === callId}
          onClick={declineCall}
        >
          {busyCallId === callId ? "Declining..." : "Decline"}
        </button>
      </div>
    </aside>
  );
};

const VideoCallSession = ({ client, children }) => (
  <StreamVideo client={client}>
    <IncomingCallNotice client={client} />
    {children}
  </StreamVideo>
);

export default VideoCallSession;
