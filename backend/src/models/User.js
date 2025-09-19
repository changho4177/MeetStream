// src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    hash: String,
    role: { type: String, enum: ['organizer', 'participant'], default: 'participant' },
    homeLocation: { lat: Number, lng: Number },
    pushTokens: [String] // expo push tokens
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
