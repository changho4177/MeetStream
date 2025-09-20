// src/index.js
import cors from 'cors';
import dotnev from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

dotnev.config({path:"./.env"});

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api', routes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io); // make io accessible in routes/services

io.on('connection', (socket) => {
    socket.on('join_event', (eventId) => socket.join(`event:${eventId}`));
    socket.on('leave_event', (eventId) => socket.leave(`event:${eventId}`));
});

// Connect DB
connectDB();

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Closing server...`);

    try {
        // 1. Close Socket.IO + HTTP server
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        console.log("✅ HTTP server closed");

        // 2. Close MongoDB connection
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error during shutdown:", err);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C
process.on("SIGTERM", () => shutdown("SIGTERM")); // kill command
