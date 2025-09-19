// backend/src/routes/users.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const r = Router();

// @route   POST /api/users/push-token
// @desc    Save expo push token for notifications
r.post("/push-token", async (req, res) => {
    try {
        const { userId, token } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.pushTokens.includes(token)) {
            user.pushTokens.push(token);
            await user.save();
        }

        res.json({ message: "Push token saved successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users/me
// @desc    Get current user profile
r.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-hash");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
r.put("/me", authMiddleware, async (req, res) => {
    try {
        const { name, role, homeLocation } = req.body;

        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { name, role, homeLocation },
            { new: true }
        ).select("-hash");

        if (!updated) return res.status(404).json({ message: "User not found" });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users/organizers
// @desc    Fetch all organizers
r.get("/organizers", async (req, res) => {
    try {
        const organizers = await User.find({ role: "organizer" }).select("-hash");
        res.json(organizers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users/participants
// @desc    Fetch all participants
r.get("/participants", async (req, res) => {
    try {
        const participants = await User.find({ role: "participant" }).select("-hash");
        res.json(participants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default r;
