import express from "express";
import { authUser } from "../middleware/authmiddleware.js";
import { getStreamToken } from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.get("/token", authUser, getStreamToken);

export default chatRouter;
