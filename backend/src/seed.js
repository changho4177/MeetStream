import mongoose from "mongoose";
import User from "./models/User.js";
import Event from "./models/Event.js";
import Venue from "./models/Venue.js";
import fs from "fs";

const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/meetstream";

async function seed() {
    await mongoose.connect(MONGO);
    console.log("Connected to DB");

    const users = JSON.parse(fs.readFileSync("./mock/users.json"));
    const venues = JSON.parse(fs.readFileSync("./mock/venues.json"));
    const events = JSON.parse(fs.readFileSync("./mock/events.json"));

    await User.deleteMany({});
    await Venue.deleteMany({});
    await Event.deleteMany({});

    const userDocs = await User.insertMany(users);
    const venueDocs = await Venue.insertMany(venues);

    // attach first event organizers/participants
    const eventDocs = events.map((e, i) => ({
        ...e,
        organizerIds: [userDocs[0]._id, userDocs[1]._id],
        participantIds: [userDocs[2]._id]
    }));

    await Event.insertMany(eventDocs);

    console.log("Seeded mock data ✅");
    mongoose.disconnect();
}

seed();
