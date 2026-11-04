import { lazy, Suspense, useEffect, useState } from "react";
import { fetchChatToken } from "../lib/api.js";
import useAuthUser from "../hooks/userAuthUser.js";
import toast from "react-hot-toast";
import { VideoCallClientContext } from "./VideoCallContext.js";

const VideoCallSession = lazy(() => import("./VideoCallSession.jsx"));

const VideoCallProvider = ({ children }) => {
  const { authenticatedUser } = useAuthUser();
  const [clientState, setClientState] = useState({ userId: "", client: null });
  const [connectionError, setConnectionError] = useState("");
  const userId = authenticatedUser?._id?.toString();
  const isOnboarded = Boolean(authenticatedUser?.isOnboarded);
  const client =
    isOnboarded && clientState.userId === userId ? clientState.client : null;

  useEffect(() => {
    if (!userId || !isOnboarded) return undefined;

    let disposed = false;
    let videoClient;

    const connect = async () => {
      try {
        setConnectionError("");
        const credentials = await fetchChatToken();
        if (!credentials.apiKey || !credentials.token || !credentials.user?.id) {
          throw new Error("Video call credentials were incomplete.");
        }

        const { StreamVideoClient } = await import("@stream-io/video-react-sdk");
        videoClient = new StreamVideoClient(credentials.apiKey);
        await videoClient.connectUser(credentials.user, credentials.token);
        if (disposed) {
          await videoClient.disconnectUser();
          return;
        }
        setClientState({ userId, client: videoClient });
      } catch (error) {
        if (disposed) return;
        console.error("Could not connect to Stream Video:", error);
        setConnectionError(
          error.response?.data?.message ||
            "Audio and video calls could not connect. Please try again.",
        );
        toast.error("Audio and video calls are unavailable right now.");
      }
    };

    connect();
    return () => {
      disposed = true;
      if (videoClient?.state.connectedUser) {
        videoClient.disconnectUser().catch((error) => {
          console.error("Could not disconnect from Stream Video:", error);
        });
      }
    };
  }, [isOnboarded, userId]);

  return (
    <VideoCallClientContext.Provider value={{ client, connectionError }}>
      {client ? (
        <Suspense fallback={children}>
          <VideoCallSession client={client} connectionError={connectionError}>
            {children}
          </VideoCallSession>
        </Suspense>
      ) : (
        children
      )}
    </VideoCallClientContext.Provider>
  );
};

export default VideoCallProvider;
