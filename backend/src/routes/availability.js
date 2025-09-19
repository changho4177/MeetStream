import { Router } from 'express';
import Availability from '../models/Availability.js';
import Event from '../models/Event.js';
import dayjs from 'dayjs';

const r = Router();

// POST /api/availability/common
// body: { organizerIds: [ids], window: { start, end }, slotMinutes: 30 }
r.post('/common', async (req, res) => {
    try {
        const { organizerIds, window, slotMinutes = 30 } = req.body;
        if (!organizerIds || !window?.start || !window?.end) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const start = dayjs(window.start);
        const end = dayjs(window.end);

        // 1️⃣ Fetch Availability of users
        const availabilities = await Availability.find({ userId: { $in: organizerIds } });

        // 2️⃣ Fetch events of these users within the window
        const events = await Event.find({
            participantIds: { $in: organizerIds },
            $or: [
                { start: { $gte: start.toDate(), $lt: end.toDate() } },
                { end: { $gt: start.toDate(), $lte: end.toDate() } },
                { start: { $lte: start.toDate() }, end: { $gte: end.toDate() } },
            ],
        });

        // Map userId -> busy slots including their events
        const busyByUser = organizerIds.map((uid) => {
            const userAvailability = availabilities.find(a => a.userId.toString() === uid.toString());
            const userEvents = events.filter(e => e.participantIds.includes(uid));

            const busySlots = [
                ...(userAvailability?.busy || []),
                ...userEvents.map(e => ({ start: e.start, end: e.end }))
            ];

            return { userId: uid, busy: busySlots };
        });

        // 3️⃣ Generate candidate slots
        const slots = [];
        for (let t = start; t.add(slotMinutes, 'minute').isBefore(end) || t.add(slotMinutes, 'minute').isSame(end); t = t.add(slotMinutes, 'minute')) {
            const s = t;
            const e = t.add(slotMinutes, 'minute');
            slots.push([s, e]);
        }

        // 4️⃣ Filter free slots for all
        const isFreeForAll = (s, e, busyByUser) =>
            busyByUser.every(u =>
                u.busy.every(({ start: bStart, end: bEnd }) =>
                    dayjs(bEnd).isSameOrBefore(s) || dayjs(bStart).isSameOrAfter(e)
                )
            );

        const freeSlots = slots.filter(([s, e]) => isFreeForAll(s, e, busyByUser));

        // 5️⃣ Merge consecutive free slots
        const mergedSlots = [];
        let currentSlot = null;

        for (let [s, e] of freeSlots) {
            if (!currentSlot) {
                currentSlot = { start: s, end: e };
            } else {
                if (dayjs(s).isSame(currentSlot.end)) {
                    // extend current slot
                    currentSlot.end = e;
                } else {
                    mergedSlots.push({ start: currentSlot.start.toDate(), end: currentSlot.end.toDate() });
                    currentSlot = { start: s, end: e };
                }
            }
        }

        if (currentSlot) {
            mergedSlots.push({ start: currentSlot.start.toDate(), end: currentSlot.end.toDate() });
        }

        res.json({ common: mergedSlots });
    } catch (err) {
        console.error('Error calculating common availability:', err);
        res.status(500).json({ message: err.message });
    }
});

export default r;
