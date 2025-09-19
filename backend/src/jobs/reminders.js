// src/jobs/reminders.js
import cron from 'node-cron';
import Event from '../models/Event.js';
// import push library to call Expo push API

cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);
    const events = await Event.find({ start: { $gte: now, $lte: soon } });
    // for each event, load participants' tokens and send push "Event starts in 15 minutes"
});
