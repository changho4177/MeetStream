// src/routes/index.js
import { Router } from 'express';
import auth from './auth.js';
import users from './Users.js';
import events from './events.js';
import availability from './availability.js';
import announcements from './announcements.js';
import chat from './chat.js';
import files from './files.js';

const r = Router();
r.use('/auth', auth);
r.use('/users', users);
r.use('/events', events);
r.use('/availability', availability);
r.use('/announcements', announcements);
r.use('/chat', chat);
r.use('/files', files);

export default r;
