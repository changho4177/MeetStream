// backend/src/routes/files.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Event from "../models/Event.js";
import User from "../models/User.js";

const r = Router();

// ensure upload folder
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});
const upload = multer({ storage });


// @route   POST /api/files/upload/:eventId
// @desc    Upload file and link it to an event
// @body    { userId }
r.post("/upload/:eventId", upload.single("file"), async (req, res) => {
    try {
        const { eventId } = req.params;
        const { userId } = req.body;

        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const newFile = {
            name: req.file.originalname,
            url: `/uploads/${req.file.filename}`,
            uploadedBy: userId,
            uploadedAt: new Date(),
        };

        event.files.push(newFile);
        await event.save();

        res.json({
            message: "File uploaded successfully",
            file: newFile,
            event,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});


// @route   GET /api/files/:eventId
// @desc    Get all files uploaded for an event (with uploader info)
r.get("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId).populate("files.uploadedBy", "name role");

        if (!event) return res.status(404).json({ message: "Event not found" });

        res.json(event.files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/files/:eventId/:fileId
// @desc    Remove a file from an event
r.delete("/:eventId/:fileId", async (req, res) => {
    try {
        const { eventId, fileId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const file = event.files.id(fileId) || event.files.find(f => String(f._id) === fileId);
        if (!file) return res.status(404).json({ message: "File not found" });

        // delete physical file
        const filePath = path.join(process.cwd(), file.url.replace(/^\//, ""));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // remove from event.files
        event.files = event.files.filter((f) => String(f._id) !== fileId);
        await event.save();

        res.json({ message: "File removed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

export default r;
