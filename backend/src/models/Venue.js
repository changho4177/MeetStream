// src/models/Venue.js
import mongoose from 'mongoose';
const VenueSchema = new mongoose.Schema({
    name: String,
    lat: Number,
    lng: Number,
    address: String,
    capacity: Number
});
VenueSchema.index({ lat: 1, lng: 1 });
export default mongoose.model('Venue', VenueSchema);
