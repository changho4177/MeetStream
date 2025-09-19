// src/routes/chat.js
import { Router } from 'express';
import Message from '../models/Message.js';

const r = Router();

// GET messages with pagination
r.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query; // defaults: page 1, 50 msgs
    const skip = (page - 1) * limit;

    try {
        const msgs = await Message.find({ eventId })
            .sort({ createdAt: 1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .populate('userId', 'name email'); // populate user info if needed

        res.json(msgs);
    } catch (err) {
        console.error("Error fetching messages", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// POST new message
r.post('/', async (req, res) => {
    try {
        const { eventId, userId, text } = req.body;

        if (!eventId || !userId || !text) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const m = await Message.create({ eventId, userId, text });

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`event:${m.eventId}`).emit('message', m);

        res.status(201).json(m);
    } catch (err) {
        console.error("Error creating message", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default r;
