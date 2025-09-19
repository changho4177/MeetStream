// src/routes/announcements.js
import { Router } from "express";
import Announcement from "../models/Announcement.js";
import User from "../models/User.js";
import Event from "../models/Event.js";

const r = Router();


//@route   POST /api/announcements
//@desc    Create a new announcement for an event
//@body    { eventId, text, createdBy }
r.post("/", async (req, res) => {
    try {
        const { eventId, text, createdBy } = req.body;

        if (!eventId || !text || !createdBy) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Ensure event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Create announcement
        const a = await Announcement.create({ eventId, text, createdBy });

        // Populate user info for frontend display
        await a.populate("createdBy", "name role");

        // Emit via socket.io
        const io = req.app.get("io");
        io.to(`event:${eventId}`).emit("announcement", a);

        // 🔔 OPTIONAL: push notification to participants
        // (replace with your participant query logic)
        const participants = await User.find({
            _id: { $in: event.participantIds || [] },
        });
        const tokens = participants.flatMap((p) => p.pushTokens || []);
        // enqueuePush(tokens, text);

        res.status(201).json(a);
    } catch (err) {
        console.error("Error creating announcement:", err);
        res.status(500).json({ message: err.message });
    }
});


//@route   GET /api/announcements/:eventId
//@desc    Get all announcements for an event
r.get("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;

        const list = await Announcement.find({ eventId })
            .populate("createdBy", "name role") // return user info
            .sort({ createdAt: -1 }); // newest first

        res.json(list);
    } catch (err) {
        console.error("Error fetching announcements:", err);
        res.status(500).json({ message: err.message });
    }
});

//@route   DELETE /api/announcements/:id
//@desc    Delete an announcement
//@body    { userId }
r.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        const event = await Event.findById(announcement.eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Allow deletion if:
        // - the user created the announcement OR
        // - the user is the event organizer
        if (
            announcement.createdBy.toString() !== userId &&
            event.organizer.toString() !== userId
        ) {
            return res.status(403).json({ message: "Not authorized to delete this announcement" });
        }

        await announcement.deleteOne();

        // Emit removal via socket.io
        const io = req.app.get("io");
        io.to(`event:${event._id}`).emit("announcement_deleted", { id });

        res.json({ message: "Announcement deleted successfully" });
    } catch (err) {
        console.error("Error deleting announcement:", err);
        res.status(500).json({ message: err.message });
    }
});

export default r;
