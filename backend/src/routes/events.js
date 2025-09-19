// src/routes/events.js
import { Router } from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Venue from "../models/Venue.js";

const r = Router();

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const φ1 = toRad(lat1),
        φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1),
        Δλ = toRad(lon2 - lon1);
    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// POST /api/events -> create event
r.post("/", async (req, res) => {
    try {
        const { title, description, organizerIds, venue, start, end } = req.body;

        // validate required fields
        if (!title || !start || !end) {
            return res.status(400).json({ message: "Title, start, and end are required" });
        }

        const event = new Event({
            title,
            description,
            organizerIds: organizerIds || [], // accept array of organizerIds
            venue, // { name, lat, lng, address }
            start,
            end,
            participantIds: [],
            files: []
        });

        await event.save();

        res.json({ message: "Event created successfully", event });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/events/:id
r.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizerIds', '_id name') // only fetch _id and name
            .populate('participantIds', '_id name'); // optional if you need participants

        if (!event) return res.status(404).json({ message: 'Event not found' });

        res.json(event);
    } catch (err) {
        console.error('Failed to fetch event', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/events  -> fetch all events
r.get("/", async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/events/suggest-venue { organizerIds }
r.post("/suggest-venue", async (req, res) => {
    try {
        const { organizerIds } = req.body;
        const orgs = await User.find({
            _id: { $in: organizerIds },
            homeLocation: { $exists: true },
        });

        if (!orgs.length) return res.json({ venue: null });

        const avgLat =
            orgs.reduce((s, u) => s + (u.homeLocation?.lat || 0), 0) / orgs.length;
        const avgLng =
            orgs.reduce((s, u) => s + (u.homeLocation?.lng || 0), 0) / orgs.length;

        const venues = await Venue.find({});
        const nearest = venues.reduce((best, v) => {
            const d = haversine(avgLat, avgLng, v.lat, v.lng);
            if (!best || d < best.d) return { v, d };
            return best;
        }, null);

        res.json({
            centroid: { lat: avgLat, lng: avgLng },
            suggested: nearest?.v || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/events/:id/participate -> add participant to event
r.post("/:id/participate", async (req, res) => {
    try {
        const { userId } = req.body; // participant id from frontend
        const { id } = req.params; // event id

        const event = await Event.findById(id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check if user already participating
        if (event.participantIds.includes(userId)) {
            return res.status(400).json({ message: "User already participating" });
        }

        event.participantIds.push(userId);
        await event.save();

        // ✅ return event directly
        res.json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Leave event
r.post("/:id/leave", async (req, res) => {
    try {
        const { userId } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        event.participantIds = event.participantIds.filter(
            (id) => id.toString() !== userId
        );
        await event.save();

        // ✅ return event directly
        res.json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/events/:id -> delete event (organizers only)
r.delete("/:id", async (req, res) => {
    try {
        const { userId } = req.body; // current user making the request
        const { id } = req.params; // event id

        const event = await Event.findById(id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check if user is one of the organizers
        const isOrganizer = event.organizerIds.some(
            (orgId) => orgId.toString() === userId
        );

        if (!isOrganizer) {
            return res.status(403).json({ message: "Only organizers can delete this event" });
        }

        await Event.findByIdAndDelete(id);

        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        console.error("Failed to delete event", err);
        res.status(500).json({ message: err.message });
    }
});

export default r;
