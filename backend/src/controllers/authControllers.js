import validator from "validator";
import User from "../models/User.js"; // ya ak h User model ha database operations ka leya
import bcrypt from "bcryptjs"; // For password hashing
import jwt from "jsonwebtoken"; // For generating JWT tokens
import { upsertStreamUser } from "../config/stream.js"; // Import the upsertStreamUser function
import { createNotification } from "../services/notificationService.js";

export const signup = async (req, res) => {
  const fullName = req.body.fullName?.trim();
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validator.isLength(password, { min: 6 })) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const index = Math.floor(Math.random() * 1000) + 1; // Generate a random index for avatar

    const randomAvatar = `https://api.dicebear.com/10.x/personas/svg?arbaz=${index}clothingColor=ff2e88,00e5ff,ffe600,7cff00,ff6a00,b400ff&hairColor=362c47,6c4545,dee1f5&backgroundColor=bb86b7&seed=Felix`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      image: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.image || "",
      });
    } catch (error) {
      await User.deleteOne({ _id: newUser._id });
      throw error;
    }

    console.log(`Stream User upserted : ${newUser.fullName.toString()}`);

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: req.secure || req.get("x-forwarded-proto") === "https",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        image: newUser.image,
        skill: newUser.skill,
        language: newUser.language,
        location: newUser.location,
        bio: newUser.bio,
        isOnboarded: newUser.isOnboarded,
        friends: newUser.friends,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if all fields are provided
    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Find user and explicitly include password if select: false
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Check if password exists in database
    if (!user.password) {
      console.log("Password missing in database for user:", user.email);

      return res.status(400).json({
        message:
          "Password is missing for this account. Please reset your password.",
      });
    }

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in environment variables");

      return res.status(500).json({
        message: "Server configuration error",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set the token in a cookie for 7 days
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send the success response

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        image: user.image,
        skill: user.skill,
        language: user.language,
        location: user.location,
        bio: user.bio,
        isOnboarded: user.isOnboarded,
        friends: user.friends,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const logout = (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token");
    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const onboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, image, skill, language, location, bio } = req.body;

    const missingFields = [
      !fullName?.trim() && "fullName",
      !skill?.trim() && "skill",
      !language?.trim() && "language",
      !location?.trim() && "location",
      !bio?.trim() && "bio",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields,
      });
    }

    if (
      image !== undefined &&
      image !== "" &&
      (typeof image !== "string" ||
        !validator.isURL(image, { protocols: ["http", "https"], require_protocol: true }))
    ) {
      return res.status(400).json({
        message: "Profile image must be a valid HTTP or HTTPS URL",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          fullName: fullName.trim(),
          ...(image ? { image: image.trim() } : {}),
          skill: skill.trim(),
          language: language.trim(),
          location: location.trim(),
          bio: bio.trim(),
          isOnboarded: true,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let notificationWarning = false;
    try {
      await createNotification({
        recipientId: updatedUser._id,
        type: "account_update",
        title: "Profile completed",
        message: "Your VibeTalk profile is ready. Start meeting learning partners!",
        link: "/",
      });
    } catch (error) {
      console.error("Could not create onboarding notification:", error);
      notificationWarning = true;
    }

    return res.status(200).json({
      message: "User onboarded successfully",
      user: updatedUser,
      notificationWarning,
    });
  } catch (err) {
    console.error("Error during onboarding:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
