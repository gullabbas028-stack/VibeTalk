import { StreamChat } from "stream-chat";

export const streamApiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!streamApiKey || !apiSecret) {
  throw new Error(
    "STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables",
  );
}

const serverClient = StreamChat.getInstance(streamApiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await serverClient.upsertUser(userData);
    return userData;
  } catch (error) {
    console.error("Error upserting user to Stream:", error);
    throw error;
  }
};

export const genrateStreamToken = (userId) => {
  const userIdString = userId.toString();
  return serverClient.createToken(userIdString);
};
