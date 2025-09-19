// src/models/Availability.js
import mongoose from 'mongoose';

const AvailabilitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Busy slots; free = complement inside a query window
    busy: [{
        start: Date,
        end: Date
    }]
}, { timestamps: true });

export default mongoose.model('Availability', AvailabilitySchema);
