// src/models/Announcement.js
import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    text: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Announcement', AnnouncementSchema);
