import { genrateStreamToken, streamApiKey } from "../config/stream.js";

export const getStreamToken = (req, res) => {
  try {
    const token = genrateStreamToken(req.user._id);
    return res.status(200).json({
      token,
      apiKey: streamApiKey,
      user: {
        id: req.user._id.toString(),
        name: req.user.fullName,
        image: req.user.image || "",
      },
    });
  } catch (error) {
    console.error("Error generating Stream Chat token:", error);
    return res.status(500).json({ message: "Unable to initialize chat" });
  }
};