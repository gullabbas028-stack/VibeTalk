import { createContext, useContext } from "react";

export const VideoCallClientContext = createContext(null);

export const useVideoCallClient = () => useContext(VideoCallClientContext);
