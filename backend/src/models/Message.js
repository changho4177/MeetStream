// src/models/Message.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true }
}, { timestamps: true });

// Compound index for eventId + createdAt (helps with sorted queries)
MessageSchema.index({ eventId: 1, createdAt: 1 });

export default mongoose.model('Message', MessageSchema);
