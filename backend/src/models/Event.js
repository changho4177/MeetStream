// src/models/Event.js
import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
    title: String,
    description: String,
    organizerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    venue: {
        name: String,
        lat: Number,
        lng: Number,
        address: String
    },
    start: Date,
    end: Date,
    files: [{ name: String, url: String, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }]
}, { timestamps: true });

export default mongoose.model('Event', EventSchema);
