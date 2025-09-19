// src/routes/auth.js
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const genToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};


// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role, homeLocation } = req.body;

        let existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = new User({ name, email, hash, role: role || "participant", homeLocation });
        await user.save();

        res.json({
            message: "User registered successfully",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token: genToken(user._id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role, homeLocation: user.homeLocation },
            token: genToken(user._id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUSH TOKEN
router.post("/push-token", async (req, res) => {
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

export default router;
