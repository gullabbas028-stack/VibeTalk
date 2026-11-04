import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js"; // Actual filename confirm karein
import { createNotification } from "../services/notificationService.js";

export const getRecommendedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;

    const recommendedUsers = await User.find({
      _id: {
        $ne: userId,
        $nin: user.friends,
      },
      isOnboarded: true,
    }).select("-password");

    if (recommendedUsers.length === 0) {
      return res.status(200).json({ users: [] });
    }

    return res.status(200).json({
      users: recommendedUsers,
    });
  } catch (error) {
    console.error("Error fetching recommended users:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const getMyfriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("friends")
      .populate("friends", "fullName image language location skill bio");

    return res.status(200).json({
      friends: user.friends,
    });
  } catch (error) {
    console.error("Error fetching my friends:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: recipientId } = req.params;

    if (myId.toString() === recipientId) {
      return res.status(400).json({
        message: "You cannot send a friend request to yourself",
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (req.user.friends?.includes(recipientId)) {
      return res.status(400).json({
        message: "You are already friends with this user",
      });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "A friend request already exists between these users",
      });
    }

    await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    let notificationWarning = false;
    try {
      await createNotification({
        recipientId,
        type: "friend_request",
        title: "New connection request",
        message: `${req.user.fullName} would like to connect with you.`,
        actor: req.user,
        link: "/requests",
      });
    } catch (error) {
      console.error("Could not create friend-request notification:", error);
      notificationWarning = true;
    }

    return res.status(201).json({
      message: "Friend request sent successfully",
      notificationWarning,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (friendRequest.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot accept this request" });
    }

    const sender = await User.findById(friendRequest.sender);
    const recipient = await User.findById(friendRequest.recipient);

    if (!sender || !recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!sender.friends.includes(recipient._id.toString())) {
      sender.friends.push(recipient._id);
    }

    if (!recipient.friends.includes(sender._id.toString())) {
      recipient.friends.push(sender._id);
    }

    await sender.save();
    await recipient.save();
    await FriendRequest.findByIdAndDelete(requestId);

    let notificationWarning = false;
    try {
      await createNotification({
        recipientId: sender._id,
        type: "friend_request_accepted",
        title: "Connection request accepted",
        message: `${recipient.fullName} accepted your connection request.`,
        actor: recipient,
        link: "/connections",
      });
    } catch (error) {
      console.error("Could not create request-accepted notification:", error);
      notificationWarning = true;
    }

    return res
      .status(200)
      .json({ message: "Friend request accepted successfully", notificationWarning });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (friendRequest.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot decline this request" });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    return res.status(200).json({ message: "Connection request declined" });
  } catch (error) {
    console.error("Error declining friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendRequest = async (req, res) => {
  try {
    const incomingRequests = await FriendRequest.find({
      recipient: req.user._id,
      status: "pending",
    }).populate("sender", "fullName image language location skill bio");

    const acceptedRequests = await FriendRequest.find({
      sender: req.user._id,
      status: "accepted",
    }).populate("recipient", "fullName image ");

    res.status(200).json({ incomingRequests, acceptedRequests });
  } catch (error) {
    console.log("error in getfriendRequest controller:", error.message);
    res.status(500).json({ message: "internal server error " });
  }
};

export const getOutgoingFriendRequest = async (req, res) => {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user._id,
      status: "pending",
    })
      .populate("recipient", "fullName image language location skill bio")
      .sort({ createdAt: -1 });
    return res.status(200).json({ outgoingRequests });
  } catch (error) {
    console.error("Error fetching outgoing friend requests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
