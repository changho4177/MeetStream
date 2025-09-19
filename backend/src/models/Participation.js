// src/models/Participation.js
import mongoose from 'mongoose';

const ParticipationSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendedAt: Date
}, { timestamps: true });

export default mongoose.model('Participation', ParticipationSchema);
